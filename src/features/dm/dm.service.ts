import { DrizzleService } from '@/core/orm/drizzle.service';
import { directMessages, dmConversations, dmReactions, users } from '@/db';
import { FriendshipPolicy } from '@/features/common/policies/friendship.policy';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, lt, or } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { AddReactionDto } from './dto/add-reaction.dto';
import { EditDmDto } from './dto/edit-dm.dto';
import { OpenConversationDto } from './dto/open-conversation.dto';
import { SendDmDto } from './dto/send-dm.dto';

@Injectable()
export class DmService {
  private readonly privateDir = path.join(
    process.cwd(),
    'uploads',
    'dm-private',
  );

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly friendshipPolicy: FriendshipPolicy,
  ) {
    fs.mkdirSync(this.privateDir, { recursive: true });
  }

  private normalizeIds(a: number, b: number): [number, number] {
    return a < b ? [a, b] : [b, a];
  }

  private async getConversation(conversationId: number) {
    const [conv] = await this.drizzleService.db
      .select()
      .from(dmConversations)
      .where(eq(dmConversations.id, conversationId))
      .limit(1);

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    return conv;
  }

  private assertParticipant(
    conv: { user_one_id: number; user_two_id: number },
    userId: number,
  ) {
    if (conv.user_one_id !== userId && conv.user_two_id !== userId) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }
  }

  private getOtherParticipant(
    conv: { user_one_id: number; user_two_id: number },
    userId: number,
  ) {
    return conv.user_one_id === userId ? conv.user_two_id : conv.user_one_id;
  }

  async openConversation(userId: number, dto: OpenConversationDto) {
    if (userId === dto.user_id) {
      throw new BadRequestException(
        'You cannot open a conversation with yourself',
      );
    }

    await this.friendshipPolicy.assertFriends(userId, dto.user_id);
    await this.friendshipPolicy.assertNotBlocked(userId, dto.user_id);

    const [userOneId, userTwoId] = this.normalizeIds(userId, dto.user_id);

    const [existing] = await this.drizzleService.db
      .select()
      .from(dmConversations)
      .where(
        and(
          eq(dmConversations.user_one_id, userOneId),
          eq(dmConversations.user_two_id, userTwoId),
        ),
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [conv] = await this.drizzleService.db
      .insert(dmConversations)
      .values({ user_one_id: userOneId, user_two_id: userTwoId })
      .returning();

    return conv;
  }

  async listConversations(userId: number) {
    const convs = await this.drizzleService.db
      .select({
        id: dmConversations.id,
        user_one_id: dmConversations.user_one_id,
        user_two_id: dmConversations.user_two_id,
        created_at: dmConversations.created_at,
      })
      .from(dmConversations)
      .where(
        or(
          eq(dmConversations.user_one_id, userId),
          eq(dmConversations.user_two_id, userId),
        ),
      );

    const enriched = await Promise.all(
      convs.map(async (conv) => {
        const partnerId = this.getOtherParticipant(conv, userId);
        const [partner] = await this.drizzleService.db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, partnerId))
          .limit(1);
        return { ...conv, partner };
      }),
    );

    return enriched;
  }

  async listMessages(
    userId: number,
    conversationId: number,
    cursor?: number,
    limit = 50,
  ) {
    const conv = await this.getConversation(conversationId);
    this.assertParticipant(conv, userId);

    const rows = await this.drizzleService.db
      .select({
        id: directMessages.id,
        content: directMessages.content,
        conversation_id: directMessages.conversation_id,
        sender_id: directMessages.sender_id,
        sender_name: users.name,
        attachment_url: directMessages.attachment_url,
        quoted_content: directMessages.quoted_content,
        quoted_sender_name: directMessages.quoted_sender_name,
        created_at: directMessages.created_at,
        modified_at: directMessages.modified_at,
      })
      .from(directMessages)
      .innerJoin(users, eq(directMessages.sender_id, users.id))
      .where(
        cursor
          ? and(
              eq(directMessages.conversation_id, conversationId),
              lt(directMessages.id, cursor),
            )
          : eq(directMessages.conversation_id, conversationId),
      )
      .limit(limit)
      .orderBy(directMessages.id);

    return rows.map((row) => ({
      ...row,
      attachment_url: row.attachment_url ? `/dm/attachments/${row.id}` : null,
    }));
  }

  async sendMessage(
    userId: number,
    conversationId: number,
    dto: SendDmDto,
    file?: Express.Multer.File,
  ) {
    const conv = await this.getConversation(conversationId);
    this.assertParticipant(conv, userId);

    const partnerId = this.getOtherParticipant(conv, userId);
    await this.friendshipPolicy.assertFriends(userId, partnerId);
    await this.friendshipPolicy.assertNotBlocked(userId, partnerId);

    if (!dto.content && !file) {
      throw new BadRequestException(
        'Message must have content or an attachment',
      );
    }

    let attachmentPath: string | undefined;
    if (file) {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const dest = path.join(this.privateDir, filename);
      await fs.promises.rename(file.path, dest);
      attachmentPath = `dm-private/${filename}`;
    }

    const [message] = await this.drizzleService.db
      .insert(directMessages)
      .values({
        content: dto.content,
        conversation_id: conversationId,
        sender_id: userId,
        attachment_url: attachmentPath,
        quoted_content: dto.quoted_content,
        quoted_sender_name: dto.quoted_sender_name,
      })
      .returning();

    const [sender] = await this.drizzleService.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      ...message,
      sender_name: sender?.name,
      attachment_url: message.attachment_url
        ? `/dm/attachments/${message.id}`
        : null,
    };
  }

  async editMessage(
    userId: number,
    conversationId: number,
    messageId: number,
    dto: EditDmDto,
  ) {
    const conv = await this.getConversation(conversationId);
    this.assertParticipant(conv, userId);

    const [message] = await this.drizzleService.db
      .select()
      .from(directMessages)
      .where(
        and(
          eq(directMessages.id, messageId),
          eq(directMessages.conversation_id, conversationId),
        ),
      )
      .limit(1);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const [updated] = await this.drizzleService.db
      .update(directMessages)
      .set({ content: dto.content, modified_at: new Date() })
      .where(eq(directMessages.id, messageId))
      .returning();

    return {
      ...updated,
      attachment_url: updated.attachment_url
        ? `/dm/attachments/${updated.id}`
        : null,
    };
  }

  async deleteMessage(
    userId: number,
    conversationId: number,
    messageId: number,
  ) {
    const conv = await this.getConversation(conversationId);
    this.assertParticipant(conv, userId);

    const [message] = await this.drizzleService.db
      .select()
      .from(directMessages)
      .where(
        and(
          eq(directMessages.id, messageId),
          eq(directMessages.conversation_id, conversationId),
        ),
      )
      .limit(1);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    if (message.attachment_url) {
      const filePath = path.join(
        process.cwd(),
        'uploads',
        message.attachment_url,
      );
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // File may not exist — silently ignore
      }
    }

    await this.drizzleService.db
      .delete(directMessages)
      .where(eq(directMessages.id, messageId));

    return { success: true };
  }

  async addReaction(
    userId: number,
    conversationId: number,
    messageId: number,
    dto: AddReactionDto,
  ) {
    const conv = await this.getConversation(conversationId);
    this.assertParticipant(conv, userId);

    const [message] = await this.drizzleService.db
      .select()
      .from(directMessages)
      .where(
        and(
          eq(directMessages.id, messageId),
          eq(directMessages.conversation_id, conversationId),
        ),
      )
      .limit(1);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const [existing] = await this.drizzleService.db
      .select()
      .from(dmReactions)
      .where(
        and(
          eq(dmReactions.message_id, messageId),
          eq(dmReactions.user_id, userId),
          eq(dmReactions.emoji, dto.emoji),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('You already reacted with this emoji');
    }

    const [reaction] = await this.drizzleService.db
      .insert(dmReactions)
      .values({ message_id: messageId, user_id: userId, emoji: dto.emoji })
      .returning();

    return reaction;
  }

  async removeReaction(
    userId: number,
    conversationId: number,
    messageId: number,
    emoji: string,
  ) {
    const conv = await this.getConversation(conversationId);
    this.assertParticipant(conv, userId);

    const [reaction] = await this.drizzleService.db
      .select()
      .from(dmReactions)
      .where(
        and(
          eq(dmReactions.message_id, messageId),
          eq(dmReactions.user_id, userId),
          eq(dmReactions.emoji, emoji),
        ),
      )
      .limit(1);

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.drizzleService.db
      .delete(dmReactions)
      .where(eq(dmReactions.id, reaction.id));

    return { success: true };
  }

  async serveAttachment(
    userId: number,
    messageId: number,
  ): Promise<{ filePath: string; filename: string }> {
    const [message] = await this.drizzleService.db
      .select()
      .from(directMessages)
      .where(eq(directMessages.id, messageId))
      .limit(1);

    if (!message || !message.attachment_url) {
      throw new NotFoundException('Attachment not found');
    }

    const conv = await this.getConversation(message.conversation_id);
    this.assertParticipant(conv, userId);

    const filePath = path.join(
      process.cwd(),
      'uploads',
      message.attachment_url,
    );
    const filename = path.basename(message.attachment_url);

    return { filePath, filename };
  }
}
