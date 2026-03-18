import { DrizzleService } from '@/core/orm/drizzle.service';
import { blocks, friendships } from '@/db';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';

@Injectable()
export class FriendshipPolicy {
  constructor(private readonly drizzleService: DrizzleService) {}

  async assertFriends(userA: number, userB: number): Promise<void> {
    const [friendship] = await this.drizzleService.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(
            and(
              eq(friendships.requester_id, userA),
              eq(friendships.addressee_id, userB),
            ),
            and(
              eq(friendships.requester_id, userB),
              eq(friendships.addressee_id, userA),
            ),
          ),
        ),
      )
      .limit(1);

    if (!friendship) {
      throw new ForbiddenException(
        'You must be friends to perform this action',
      );
    }
  }

  async assertNotBlocked(actorId: number, targetId: number): Promise<void> {
    const [block] = await this.drizzleService.db
      .select()
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blocker_id, actorId), eq(blocks.blocked_id, targetId)),
          and(eq(blocks.blocker_id, targetId), eq(blocks.blocked_id, actorId)),
        ),
      )
      .limit(1);

    if (block) {
      throw new ForbiddenException('This action is not allowed');
    }
  }
}
