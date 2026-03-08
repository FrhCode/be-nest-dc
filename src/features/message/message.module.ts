import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/features/common/common.module';
import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
