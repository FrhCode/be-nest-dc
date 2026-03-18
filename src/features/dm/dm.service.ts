import { DrizzleService } from '@/core/orm/drizzle.service';
import {
  directMessages,
  dmConversations,
  dmHiddenMessages,
  dmReactions,
  files,
  friendships,
  users,
} from '@/db';
import { FriendshipPolicy } from '@/features/common/policies/friendship.policy';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  aliasedTable,
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
} from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { AddReactionDto } from './dto/add-reaction.dto';
import { DeleteDmDto } from './dto/delete-dm.dto';
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

  async searchFriends(userId: number, q: string) {
    return this.drizzleService.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(friendships)
      .innerJoin(
        users,
        or(
          and(
            eq(friendships.requester_id, userId),
            eq(friendships.addressee_id, users.id),
          ),
          and(
            eq(friendships.addressee_id, userId),
            eq(friendships.requester_id, users.id),
          ),
        ),
      )
      .where(
        and(
          or(
            eq(friendships.requester_id, userId),
            eq(friendships.addressee_id, userId),
          ),
          eq(friendships.status, 'accepted'),
          q
            ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`))
            : undefined,
        ),
      )
      .limit(20);
  }

  async openConversation(userId: number, dto: OpenConversationDto) {
    const [targetUser] = await this.drizzleService.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, dto.id))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (userId === targetUser.id) {
      throw new BadRequestException(
        'You cannot open a conversation with yourself',
      );
    }

    await this.friendshipPolicy.assertFriends(userId, targetUser.id);
    await this.friendshipPolicy.assertNotBlocked(userId, targetUser.id);

    const [userOneId, userTwoId] = this.normalizeIds(userId, targetUser.id);

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

  async listConversations(userId: number, includeLastMessage = false) {
    const userOne = aliasedTable(users, 'user_one');
    const userTwo = aliasedTable(users, 'user_two');

    const convs = await this.drizzleService.db
      .select({
        id: dmConversations.id,
        user_one_id: dmConversations.user_one_id,
        user_two_id: dmConversations.user_two_id,
        created_at: dmConversations.created_at,
        user_one_name: userOne.name,
        user_two_name: userTwo.name,
      })
      .from(dmConversations)
      .innerJoin(userOne, eq(dmConversations.user_one_id, userOne.id))
      .innerJoin(userTwo, eq(dmConversations.user_two_id, userTwo.id))
      .where(
        or(
          eq(dmConversations.user_one_id, userId),
          eq(dmConversations.user_two_id, userId),
        ),
      );

    const baseResult = convs.map((r) => {
      const isUserOne = r.user_one_id === userId;
      return {
        id: r.id,
        user_one_id: r.user_one_id,
        user_two_id: r.user_two_id,
        created_at: r.created_at,
        partner: {
          id: isUserOne ? r.user_two_id : r.user_one_id,
          name: isUserOne ? r.user_two_name : r.user_one_name,
        },
      };
    });

    if (!includeLastMessage || baseResult.length === 0) {
      return baseResult;
    }

    const convIds = baseResult.map((c) => c.id);
    const lastMsgSender = aliasedTable(users, 'last_msg_sender');
    const lastMsgFile = aliasedTable(files, 'last_msg_file');

    const lastMessages = await this.drizzleService.db
      .selectDistinctOn([directMessages.conversation_id], {
        conversation_id: directMessages.conversation_id,
        id: directMessages.id,
        content: directMessages.content,
        sender_id: directMessages.sender_id,
        sender_name: lastMsgSender.name,
        attachment_id: directMessages.attachment_id,
        attachment_name: lastMsgFile.original_name,
        attachment_type: lastMsgFile.mime_type,
        attachment_size: lastMsgFile.size,
        reply_to_message_id: directMessages.reply_to_message_id,
        quoted_content: directMessages.quoted_content,
        quoted_sender_name: directMessages.quoted_sender_name,
        is_deleted: directMessages.is_deleted,
        created_at: directMessages.created_at,
        modified_at: directMessages.modified_at,
      })
      .from(directMessages)
      .innerJoin(lastMsgSender, eq(directMessages.sender_id, lastMsgSender.id))
      .leftJoin(lastMsgFile, eq(directMessages.attachment_id, lastMsgFile.id))
      .where(inArray(directMessages.conversation_id, convIds))
      .orderBy(directMessages.conversation_id, desc(directMessages.id));

    const lastMsgMap = new Map(lastMessages.map((m) => [m.conversation_id, m]));

    return baseResult.map((conv) => {
      const lastMsg = lastMsgMap.get(conv.id);
      return {
        ...conv,
        last_message: lastMsg
          ? lastMsg.is_deleted
            ? {
                ...lastMsg,
                content: null,
                attachment_url: null,
                attachment_name: null,
                attachment_type: null,
                attachment_size: null,
                quoted_content: null,
                quoted_sender_name: null,
                attachment_id: undefined,
              }
            : {
                ...lastMsg,
                attachment_url: lastMsg.attachment_id
                  ? `/dm/attachments/${lastMsg.id}`
                  : null,
                attachment_id: undefined,
              }
          : null,
      };
    });
  }

  async listMessages(
    userId: number,
    conversationId: number,
    cursor?: number,
    limit = 50,
  ) {
    const conv = await this.getConversation(conversationId);
    this.assertParticipant(conv, userId);

    const attachFile = aliasedTable(files, 'attach_file');

    const rows = await this.drizzleService.db
      .select({
        id: directMessages.id,
        content: directMessages.content,
        conversation_id: directMessages.conversation_id,
        sender_id: directMessages.sender_id,
        sender_name: users.name,
        attachment_id: directMessages.attachment_id,
        attachment_name: attachFile.original_name,
        attachment_type: attachFile.mime_type,
        attachment_size: attachFile.size,
        reply_to_message_id: directMessages.reply_to_message_id,
        quoted_content: directMessages.quoted_content,
        quoted_sender_name: directMessages.quoted_sender_name,
        is_deleted: directMessages.is_deleted,
        created_at: directMessages.created_at,
        modified_at: directMessages.modified_at,
      })
      .from(directMessages)
      .innerJoin(users, eq(directMessages.sender_id, users.id))
      .leftJoin(attachFile, eq(directMessages.attachment_id, attachFile.id))
      .leftJoin(
        dmHiddenMessages,
        and(
          eq(dmHiddenMessages.message_id, directMessages.id),
          eq(dmHiddenMessages.user_id, userId),
        ),
      )
      .where(
        and(
          eq(directMessages.conversation_id, conversationId),
          isNull(dmHiddenMessages.id),
          cursor ? lt(directMessages.id, cursor) : undefined,
        ),
      )
      .limit(limit)
      .orderBy(directMessages.id);

    if (rows.length === 0) return [];

    const messageIds = rows.map((r) => r.id);

    // Fetch reactions
    const reactionUser = aliasedTable(users, 'reaction_user');
    const reactionRows = await this.drizzleService.db
      .select({
        message_id: dmReactions.message_id,
        emoji: dmReactions.emoji,
        user_id: dmReactions.user_id,
        user_name: reactionUser.name,
      })
      .from(dmReactions)
      .innerJoin(reactionUser, eq(dmReactions.user_id, reactionUser.id))
      .where(inArray(dmReactions.message_id, messageIds));

    const reactionsByMessage = new Map<
      number,
      { emoji: string; user_id: number; user_name: string }[]
    >();
    for (const r of reactionRows) {
      const list = reactionsByMessage.get(r.message_id) ?? [];
      list.push({ emoji: r.emoji, user_id: r.user_id, user_name: r.user_name });
      reactionsByMessage.set(r.message_id, list);
    }

    // Fetch replied-to message previews
    const replyIds = rows
      .map((r) => r.reply_to_message_id)
      .filter((id): id is number => id != null);

    const replyPreviews = new Map<
      number,
      {
        id: number;
        content: string | null;
        sender_name: string | null;
        is_deleted: boolean;
      }
    >();

    if (replyIds.length > 0) {
      const replySender = aliasedTable(users, 'reply_sender');
      const replyRows = await this.drizzleService.db
        .select({
          id: directMessages.id,
          content: directMessages.content,
          sender_name: replySender.name,
          is_deleted: directMessages.is_deleted,
        })
        .from(directMessages)
        .innerJoin(replySender, eq(directMessages.sender_id, replySender.id))
        .where(inArray(directMessages.id, replyIds));

      for (const r of replyRows) {
        replyPreviews.set(r.id, {
          id: r.id,
          content: r.is_deleted ? null : r.content,
          sender_name: r.sender_name,
          is_deleted: r.is_deleted,
        });
      }
    }

    return rows.map((row) => {
      if (row.is_deleted) {
        return {
          id: row.id,
          content: null,
          conversation_id: row.conversation_id,
          sender_id: row.sender_id,
          sender_name: row.sender_name,
          attachment_url: null,
          attachment_name: null,
          attachment_type: null,
          attachment_size: null,
          reply_to_message_id: row.reply_to_message_id,
          reply_preview: row.reply_to_message_id
            ? (replyPreviews.get(row.reply_to_message_id) ?? null)
            : null,
          quoted_content: null,
          quoted_sender_name: null,
          is_deleted: true,
          created_at: row.created_at,
          modified_at: row.modified_at,
          reactions: [],
        };
      }

      return {
        ...row,
        attachment_url: row.attachment_id ? `/dm/attachments/${row.id}` : null,
        attachment_id: undefined,
        reply_preview: row.reply_to_message_id
          ? (replyPreviews.get(row.reply_to_message_id) ?? null)
          : null,
        reactions: reactionsByMessage.get(row.id) ?? [],
      };
    });
  }

  async sendMessage(
    userId: number,
    conversationId: number,
    dto: SendDmDto,
    file?: Express.Multer.File,
  ) {
    const [conv, senderRow] = await Promise.all([
      this.getConversation(conversationId),
      this.drizzleService.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then(([r]) => r),
    ]);
    this.assertParticipant(conv, userId);

    const partnerId = this.getOtherParticipant(conv, userId);
    await this.friendshipPolicy.assertFriends(userId, partnerId);
    await this.friendshipPolicy.assertNotBlocked(userId, partnerId);

    if (!dto.content && !file) {
      throw new BadRequestException(
        'Message must have content or an attachment',
      );
    }

    if (dto.reply_to_message_id) {
      const [replyTarget] = await this.drizzleService.db
        .select({ id: directMessages.id })
        .from(directMessages)
        .where(
          and(
            eq(directMessages.id, dto.reply_to_message_id),
            eq(directMessages.conversation_id, conversationId),
          ),
        )
        .limit(1);

      if (!replyTarget) {
        throw new NotFoundException('Reply target message not found');
      }
    }

    let attachmentId: number | undefined;
    let attachmentName: string | null = null;
    let attachmentType: string | null = null;
    let attachmentSize: number | null = null;

    if (file) {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const dest = path.join(this.privateDir, filename);
      await fs.promises.rename(file.path, dest);

      const [fileRecord] = await this.drizzleService.db
        .insert(files)
        .values({
          original_name: file.originalname,
          stored_path: `dm-private/${filename}`,
          mime_type: file.mimetype,
          size: file.size,
          uploaded_by: userId,
        })
        .returning();

      attachmentId = fileRecord.id;
      attachmentName = fileRecord.original_name;
      attachmentType = fileRecord.mime_type;
      attachmentSize = fileRecord.size;
    }

    const [message] = await this.drizzleService.db
      .insert(directMessages)
      .values({
        content: dto.content,
        conversation_id: conversationId,
        sender_id: userId,
        attachment_id: attachmentId,
        reply_to_message_id: dto.reply_to_message_id,
        quoted_content: dto.quoted_content,
        quoted_sender_name: dto.quoted_sender_name,
      })
      .returning();

    return {
      ...message,
      sender_name: senderRow?.name,
      attachment_url: message.attachment_id
        ? `/dm/attachments/${message.id}`
        : null,
      attachment_id: undefined,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
      attachment_size: attachmentSize,
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

    const attachFile = aliasedTable(files, 'attach_file');

    const [row] = await this.drizzleService.db
      .select({
        id: directMessages.id,
        content: directMessages.content,
        conversation_id: directMessages.conversation_id,
        sender_id: directMessages.sender_id,
        attachment_id: directMessages.attachment_id,
        attachment_name: attachFile.original_name,
        attachment_type: attachFile.mime_type,
        attachment_size: attachFile.size,
        quoted_content: directMessages.quoted_content,
        quoted_sender_name: directMessages.quoted_sender_name,
        created_at: directMessages.created_at,
        modified_at: directMessages.modified_at,
      })
      .from(directMessages)
      .leftJoin(attachFile, eq(directMessages.attachment_id, attachFile.id))
      .where(
        and(
          eq(directMessages.id, messageId),
          eq(directMessages.conversation_id, conversationId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Message not found');
    }

    if (row.sender_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const [updated] = await this.drizzleService.db
      .update(directMessages)
      .set({ content: dto.content, modified_at: new Date() })
      .where(eq(directMessages.id, messageId))
      .returning();

    return {
      ...updated,
      attachment_url: updated.attachment_id
        ? `/dm/attachments/${updated.id}`
        : null,
      attachment_id: undefined,
      attachment_name: row.attachment_name,
      attachment_type: row.attachment_type,
      attachment_size: row.attachment_size,
    };
  }

  async deleteMessage(
    userId: number,
    conversationId: number,
    messageId: number,
    dto: DeleteDmDto,
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

    if (dto.mode === 'for_me') {
      await this.drizzleService.db
        .insert(dmHiddenMessages)
        .values({ message_id: messageId, user_id: userId })
        .onConflictDoNothing();

      return { success: true };
    }

    // mode: for_everyone — sender only
    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    if (message.attachment_id) {
      const [fileRecord] = await this.drizzleService.db
        .select()
        .from(files)
        .where(eq(files.id, message.attachment_id))
        .limit(1);

      if (fileRecord) {
        const filePath = path.join(
          process.cwd(),
          'uploads',
          fileRecord.stored_path,
        );
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // File may not exist — silently ignore
        }

        await this.drizzleService.db
          .delete(files)
          .where(eq(files.id, fileRecord.id));
      }
    }

    await this.drizzleService.db
      .update(directMessages)
      .set({
        content: null,
        quoted_content: null,
        quoted_sender_name: null,
        attachment_id: null,
        is_deleted: true,
        modified_at: new Date(),
      })
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

    if (!message || !message.attachment_id) {
      throw new NotFoundException('Attachment not found');
    }

    const conv = await this.getConversation(message.conversation_id);
    this.assertParticipant(conv, userId);

    const [fileRecord] = await this.drizzleService.db
      .select()
      .from(files)
      .where(eq(files.id, message.attachment_id))
      .limit(1);

    if (!fileRecord) {
      throw new NotFoundException('Attachment not found');
    }

    const filePath = path.join(
      process.cwd(),
      'uploads',
      fileRecord.stored_path,
    );

    return { filePath, filename: fileRecord.original_name };
  }
}
