import { DrizzleService } from '@/core/orm/drizzle.service';
import { serverMembers, servers } from '@/db';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class ServerPolicy {
  constructor(private readonly drizzleService: DrizzleService) {}

  async assertMember(userId: number, serverId: number) {
    const [member] = await this.drizzleService.db
      .select()
      .from(serverMembers)
      .where(
        and(
          eq(serverMembers.user_id, userId),
          eq(serverMembers.server_id, serverId),
        ),
      )
      .limit(1);

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    return member;
  }

  async assertAdmin(userId: number, serverId: number) {
    const member = await this.assertMember(userId, serverId);

    if (member.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return member;
  }

  async assertOwner(userId: number, serverId: number) {
    const [server] = await this.drizzleService.db
      .select()
      .from(servers)
      .where(eq(servers.id, serverId))
      .limit(1);

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.owner_id !== userId) {
      throw new ForbiddenException('Only the owner can perform this action');
    }

    return server;
  }
}
