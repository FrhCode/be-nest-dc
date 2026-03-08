import { ServerPolicy } from '@/common/policies/server.policy';
import { DrizzleService } from '@/core/orm/drizzle.service';
import { channels, messages } from '@/db';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly serverPolicy: ServerPolicy,
  ) {}

  private async getMessageChannel(channelId: number) {
    const [channel] = await this.drizzleService.db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.type !== 'message') {
      throw new BadRequestException(
        'Messages are only allowed in message-type channels',
      );
    }

    return channel;
  }

  async create(userId: number, channelId: number, dto: CreateMessageDto) {
    const channel = await this.getMessageChannel(channelId);
    await this.serverPolicy.assertMember(userId, channel.server_id);

    const [message] = await this.drizzleService.db
      .insert(messages)
      .values({
        content: dto.content,
        channel_id: channelId,
        sender_id: userId,
      })
      .returning();

    return message;
  }

  async findAll(
    userId: number,
    channelId: number,
    cursor?: number,
    limit = 50,
  ) {
    const channel = await this.getMessageChannel(channelId);
    await this.serverPolicy.assertMember(userId, channel.server_id);

    return this.drizzleService.db
      .select()
      .from(messages)
      .where(
        cursor
          ? and(eq(messages.channel_id, channelId), lt(messages.id, cursor))
          : eq(messages.channel_id, channelId),
      )
      .limit(limit)
      .orderBy(messages.id);
  }

  async update(
    userId: number,
    channelId: number,
    messageId: number,
    content: string,
  ) {
    const channel = await this.getMessageChannel(channelId);
    await this.serverPolicy.assertMember(userId, channel.server_id);

    const [message] = await this.drizzleService.db
      .select()
      .from(messages)
      .where(
        and(eq(messages.id, messageId), eq(messages.channel_id, channelId)),
      )
      .limit(1);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const [updated] = await this.drizzleService.db
      .update(messages)
      .set({ content, modified_at: new Date() })
      .where(eq(messages.id, messageId))
      .returning();

    return updated;
  }

  async remove(userId: number, channelId: number, messageId: number) {
    const channel = await this.getMessageChannel(channelId);
    const member = await this.serverPolicy.assertMember(
      userId,
      channel.server_id,
    );

    const [message] = await this.drizzleService.db
      .select()
      .from(messages)
      .where(
        and(eq(messages.id, messageId), eq(messages.channel_id, channelId)),
      )
      .limit(1);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId && member.role !== 'admin') {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.drizzleService.db
      .delete(messages)
      .where(eq(messages.id, messageId));

    return { success: true };
  }
}
