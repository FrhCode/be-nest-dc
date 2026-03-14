import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/features/common/common.module';
import { UploadModule } from '@/features/upload/upload.module';
import { Module } from '@nestjs/common';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';

@Module({
  imports: [AuthModule, CommonModule, UploadModule],
  controllers: [ServerController],
  providers: [ServerService],
  exports: [ServerService],
})
export class ServerModule {}
