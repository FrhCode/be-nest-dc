import { ServerPolicy } from '@/common/policies/server.policy';
import { DrizzleService } from '@/core/orm/drizzle.service';
import { channels, serverMembers, servers } from '@/db';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@Injectable()
export class ServerService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly serverPolicy: ServerPolicy,
  ) {}

  async create(userId: number, email: string, dto: CreateServerDto) {
    const inviteCode = randomBytes(10).toString('hex').slice(0, 20);

    const [server] = await this.drizzleService.db
      .insert(servers)
      .values({
        name: dto.name,
        icon_url: dto.iconUrl,
        invite_code: inviteCode,
        owner_id: userId,
        created_by: email,
        modified_by: email,
      })
      .returning();

    await this.drizzleService.db.insert(serverMembers).values({
      user_id: userId,
      server_id: server.id,
      role: 'admin',
    });

    await this.drizzleService.db.insert(channels).values({
      name: 'general',
      type: 'message',
      server_id: server.id,
      created_by: email,
      modified_by: email,
    });

    return server;
  }

  async findUserServers(userId: number) {
    const members = await this.drizzleService.db
      .select({ server: servers })
      .from(serverMembers)
      .innerJoin(servers, eq(serverMembers.server_id, servers.id))
      .where(eq(serverMembers.user_id, userId));

    return members.map((m) => m.server);
  }

  async findOne(userId: number, serverId: number) {
    await this.serverPolicy.assertMember(userId, serverId);

    const [server] = await this.drizzleService.db
      .select()
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    const serverChannels = await this.drizzleService.db
      .select()
      .from(channels)
      .where(eq(channels.server_id, serverId));

    return { ...server, channels: serverChannels };
  }

  async update(
    userId: number,
    serverId: number,
    email: string,
    dto: UpdateServerDto,
  ) {
    await this.serverPolicy.assertAdmin(userId, serverId);

    const [server] = await this.drizzleService.db
      .update(servers)
      .set({
        ...(dto.name && { name: dto.name }),
        ...(dto.iconUrl !== undefined && { icon_url: dto.iconUrl }),
        modified_at: new Date(),
        modified_by: email,
      })
      .where(eq(servers.id, serverId))
      .returning();

    return server;
  }

  async remove(userId: number, serverId: number) {
    const server = await this.serverPolicy.assertOwner(userId, serverId);

    await this.drizzleService.db
      .delete(servers)
      .where(eq(servers.id, server.id));

    return { success: true };
  }

  async join(userId: number, inviteCode: string) {
    const [server] = await this.drizzleService.db
      .select()
      .from(servers)
      .where(eq(servers.invite_code, inviteCode))
      .limit(1);

    if (!server) {
      throw new NotFoundException('Invalid invite code');
    }

    const [existing] = await this.drizzleService.db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.user_id, userId),
          eq(serverMembers.server_id, server.id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('Already a member of this server');
    }

    await this.drizzleService.db.insert(serverMembers).values({
      user_id: userId,
      server_id: server.id,
      role: 'member',
    });

    return { success: true, serverId: server.id };
  }

  async leave(userId: number, serverId: number) {
    await this.serverPolicy.assertMember(userId, serverId);

    const [server] = await this.drizzleService.db
      .select()
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    if (server?.owner_id === userId) {
      throw new BadRequestException(
        'Owner cannot leave the server. Transfer ownership first.',
      );
    }

    await this.drizzleService.db
      .delete(serverMembers)
      .where(
        and(
          eq(serverMembers.user_id, userId),
          eq(serverMembers.server_id, serverId),
        ),
      );

    return { success: true };
  }

  async inviteUser(
    adminUserId: number,
    serverId: number,
    targetUserId: number,
  ) {
    await this.serverPolicy.assertAdmin(adminUserId, serverId);

    const [existing] = await this.drizzleService.db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.user_id, targetUserId),
          eq(serverMembers.server_id, serverId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('User is already a member');
    }

    await this.drizzleService.db.insert(serverMembers).values({
      user_id: targetUserId,
      server_id: serverId,
      role: 'member',
    });

    return { success: true };
  }

  async transferOwnership(
    userId: number,
    serverId: number,
    targetUserId: number,
  ) {
    await this.serverPolicy.assertOwner(userId, serverId);

    const [targetMember] = await this.drizzleService.db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.user_id, targetUserId),
          eq(serverMembers.server_id, serverId),
        ),
      )
      .limit(1);

    if (!targetMember || targetMember.role !== 'admin') {
      throw new BadRequestException('Target user must be an admin member');
    }

    await this.drizzleService.db
      .update(servers)
      .set({ owner_id: targetUserId, modified_by: String(userId) })
      .where(eq(servers.id, serverId));

    return { success: true };
  }

  async getMembers(userId: number, serverId: number) {
    await this.serverPolicy.assertMember(userId, serverId);

    return this.drizzleService.db
      .select()
      .from(serverMembers)
      .where(eq(serverMembers.server_id, serverId));
  }

  async updateMemberRole(
    adminUserId: number,
    serverId: number,
    targetUserId: number,
    role: 'admin' | 'member',
  ) {
    await this.serverPolicy.assertAdmin(adminUserId, serverId);

    const [member] = await this.drizzleService.db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.user_id, targetUserId),
          eq(serverMembers.server_id, serverId),
        ),
      )
      .limit(1);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.drizzleService.db
      .update(serverMembers)
      .set({ role })
      .where(
        and(
          eq(serverMembers.user_id, targetUserId),
          eq(serverMembers.server_id, serverId),
        ),
      );

    return { success: true };
  }

  async kickMember(
    adminUserId: number,
    serverId: number,
    targetUserId: number,
  ) {
    await this.serverPolicy.assertAdmin(adminUserId, serverId);

    const [member] = await this.drizzleService.db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.user_id, targetUserId),
          eq(serverMembers.server_id, serverId),
        ),
      )
      .limit(1);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.drizzleService.db
      .delete(serverMembers)
      .where(
        and(
          eq(serverMembers.user_id, targetUserId),
          eq(serverMembers.server_id, serverId),
        ),
      );

    return { success: true };
  }
}
