import { Module } from '@nestjs/common';
import { ServerPolicy } from './policies/server.policy';

@Module({
  providers: [ServerPolicy],
  exports: [ServerPolicy],
})
export class CommonModule {}
