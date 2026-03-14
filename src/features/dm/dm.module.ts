import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/features/common/common.module';
import { Module } from '@nestjs/common';
import { DmController } from './dm.controller';
import { DmService } from './dm.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [DmController],
  providers: [DmService],
})
export class DmModule {}
