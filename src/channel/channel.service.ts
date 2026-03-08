import { ServerPolicy } from '@/common/policies/server.policy';
import { DrizzleService } from '@/core/orm/drizzle.service';
import { channels } from '@/db';
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly serverPolicy: ServerPolicy,
  ) {}

  async create(
    userId: number,
    serverId: number,
    email: string,
    dto: CreateChannelDto,
  ) {
    await this.serverPolicy.assertAdmin(userId, serverId);

    const [channel] = await this.drizzleService.db
      .insert(channels)
      .values({
        name: dto.name,
        type: dto.type,
        server_id: serverId,
        created_by: email,
        modified_by: email,
      })
      .returning();

    return channel;
  }

  async findAll(userId: number, serverId: number) {
    await this.serverPolicy.assertMember(userId, serverId);

    return this.drizzleService.db
      .select()
      .from(channels)
      .where(eq(channels.server_id, serverId));
  }

  async update(
    userId: number,
    serverId: number,
    channelId: number,
    email: string,
    dto: UpdateChannelDto,
  ) {
    await this.serverPolicy.assertAdmin(userId, serverId);

    const [existing] = await this.drizzleService.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.server_id, serverId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Channel not found');
    }

    const [channel] = await this.drizzleService.db
      .update(channels)
      .set({
        ...(dto.name && { name: dto.name }),
        modified_at: new Date(),
        modified_by: email,
      })
      .where(eq(channels.id, channelId))
      .returning();

    return channel;
  }

  async remove(userId: number, serverId: number, channelId: number) {
    await this.serverPolicy.assertAdmin(userId, serverId);

    const [existing] = await this.drizzleService.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.server_id, serverId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Channel not found');
    }

    await this.drizzleService.db
      .delete(channels)
      .where(eq(channels.id, channelId));

    return { success: true };
  }
}
