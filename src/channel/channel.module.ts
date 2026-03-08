import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { Module } from '@nestjs/common';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
