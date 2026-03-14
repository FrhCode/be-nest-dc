import { Module } from '@nestjs/common';
import { FriendshipPolicy } from './policies/friendship.policy';
import { ServerPolicy } from './policies/server.policy';

@Module({
  providers: [ServerPolicy, FriendshipPolicy],
  exports: [ServerPolicy, FriendshipPolicy],
})
export class CommonModule {}
