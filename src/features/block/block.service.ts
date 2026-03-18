import { DrizzleService } from '@/core/orm/drizzle.service';
import { blocks, friendships, users } from '@/db';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { BlockUserDto } from './dto/block-user.dto';

@Injectable()
export class BlockService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async block(blockerId: number, dto: BlockUserDto) {
    if (blockerId === dto.blocked_id) {
      throw new BadRequestException('You cannot block yourself');
    }

    const [targetUser] = await this.drizzleService.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, dto.blocked_id))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const [existing] = await this.drizzleService.db
      .select()
      .from(blocks)
      .where(
        and(
          eq(blocks.blocker_id, blockerId),
          eq(blocks.blocked_id, dto.blocked_id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('User is already blocked');
    }

    // Remove any friendship or pending requests between the two
    await this.drizzleService.db
      .delete(friendships)
      .where(
        or(
          and(
            eq(friendships.requester_id, blockerId),
            eq(friendships.addressee_id, dto.blocked_id),
          ),
          and(
            eq(friendships.requester_id, dto.blocked_id),
            eq(friendships.addressee_id, blockerId),
          ),
        ),
      );

    const [block] = await this.drizzleService.db
      .insert(blocks)
      .values({ blocker_id: blockerId, blocked_id: dto.blocked_id })
      .returning();

    return block;
  }

  async unblock(blockerId: number, userId: number) {
    const [block] = await this.drizzleService.db
      .select()
      .from(blocks)
      .where(
        and(eq(blocks.blocker_id, blockerId), eq(blocks.blocked_id, userId)),
      )
      .limit(1);

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    await this.drizzleService.db
      .delete(blocks)
      .where(
        and(eq(blocks.blocker_id, blockerId), eq(blocks.blocked_id, userId)),
      );

    return { success: true };
  }

  async findAll(blockerId: number) {
    return this.drizzleService.db
      .select({
        id: blocks.id,
        blocked_id: blocks.blocked_id,
        blocked_name: users.name,
        created_at: blocks.created_at,
      })
      .from(blocks)
      .innerJoin(users, eq(blocks.blocked_id, users.id))
      .where(eq(blocks.blocker_id, blockerId));
  }
}
