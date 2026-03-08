import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { Module } from '@nestjs/common';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [ServerController],
  providers: [ServerService],
  exports: [ServerService],
})
export class ServerModule {}
