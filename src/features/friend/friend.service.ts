import { DrizzleService } from '@/core/orm/drizzle.service';
import { blocks, friendships, users } from '@/db';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@Injectable()
export class FriendService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async sendRequest(requesterId: number, dto: SendFriendRequestDto) {
    const [targetUser] = await this.drizzleService.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (requesterId === targetUser.id) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    // Check blocks in either direction
    const [block] = await this.drizzleService.db
      .select()
      .from(blocks)
      .where(
        or(
          and(
            eq(blocks.blocker_id, requesterId),
            eq(blocks.blocked_id, targetUser.id),
          ),
          and(
            eq(blocks.blocker_id, targetUser.id),
            eq(blocks.blocked_id, requesterId),
          ),
        ),
      )
      .limit(1);

    if (block) {
      throw new ForbiddenException(
        'You cannot send a friend request to this user',
      );
    }

    const [existing] = await this.drizzleService.db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requester_id, requesterId),
            eq(friendships.addressee_id, targetUser.id),
          ),
          and(
            eq(friendships.requester_id, targetUser.id),
            eq(friendships.addressee_id, requesterId),
          ),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.status === 'accepted') {
        throw new ConflictException('You are already friends');
      }
      throw new ConflictException('A friend request already exists');
    }

    const [request] = await this.drizzleService.db
      .insert(friendships)
      .values({ requester_id: requesterId, addressee_id: targetUser.id })
      .returning();

    return request;
  }

  async acceptRequest(userId: number, requestId: number) {
    const [request] = await this.drizzleService.db
      .select()
      .from(friendships)
      .where(
        and(eq(friendships.id, requestId), eq(friendships.status, 'pending')),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.addressee_id !== userId) {
      throw new ForbiddenException('You can only accept requests sent to you');
    }

    const [updated] = await this.drizzleService.db
      .update(friendships)
      .set({ status: 'accepted', modified_at: new Date() })
      .where(eq(friendships.id, requestId))
      .returning();

    return updated;
  }

  async rejectRequest(userId: number, requestId: number) {
    const [request] = await this.drizzleService.db
      .select()
      .from(friendships)
      .where(
        and(eq(friendships.id, requestId), eq(friendships.status, 'pending')),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.addressee_id !== userId) {
      throw new ForbiddenException('You can only reject requests sent to you');
    }

    await this.drizzleService.db
      .delete(friendships)
      .where(eq(friendships.id, requestId));

    return { success: true };
  }

  async cancelRequest(userId: number, requestId: number) {
    const [request] = await this.drizzleService.db
      .select()
      .from(friendships)
      .where(
        and(eq(friendships.id, requestId), eq(friendships.status, 'pending')),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.requester_id !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own friend requests',
      );
    }

    await this.drizzleService.db
      .delete(friendships)
      .where(eq(friendships.id, requestId));

    return { success: true };
  }

  async removeFriend(userId: number, friendUserId: number) {
    const [friendship] = await this.drizzleService.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(
            and(
              eq(friendships.requester_id, userId),
              eq(friendships.addressee_id, friendUserId),
            ),
            and(
              eq(friendships.requester_id, friendUserId),
              eq(friendships.addressee_id, userId),
            ),
          ),
        ),
      )
      .limit(1);

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.drizzleService.db
      .delete(friendships)
      .where(eq(friendships.id, friendship.id));

    return { success: true };
  }

  async listFriends(userId: number) {
    const rows = await this.drizzleService.db
      .select({
        id: friendships.id,
        friend_id: users.id,
        friend_name: users.name,
        since: friendships.modified_at,
      })
      .from(friendships)
      .innerJoin(
        users,
        or(
          and(
            eq(friendships.requester_id, userId),
            eq(users.id, friendships.addressee_id),
          ),
          and(
            eq(friendships.addressee_id, userId),
            eq(users.id, friendships.requester_id),
          ),
        ),
      )
      .where(eq(friendships.status, 'accepted'));

    return rows;
  }

  async listIncomingRequests(userId: number) {
    return this.drizzleService.db
      .select({
        id: friendships.id,
        requester_id: friendships.requester_id,
        requester_name: users.name,
        created_at: friendships.created_at,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requester_id, users.id))
      .where(
        and(
          eq(friendships.addressee_id, userId),
          eq(friendships.status, 'pending'),
        ),
      );
  }

  async listOutgoingRequests(userId: number) {
    return this.drizzleService.db
      .select({
        id: friendships.id,
        addressee_id: friendships.addressee_id,
        addressee_name: users.name,
        created_at: friendships.created_at,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.addressee_id, users.id))
      .where(
        and(
          eq(friendships.requester_id, userId),
          eq(friendships.status, 'pending'),
        ),
      );
  }
}
