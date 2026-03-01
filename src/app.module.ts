import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';

@Module({
  imports: [CoreModule, AuthModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
