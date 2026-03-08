import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChannelModule } from './features/channel/channel.module';
import { CoreModule } from './core/core.module';
import { MessageModule } from './features/message/message.module';
import { ServerModule } from './features/server/server.module';

@Module({
  imports: [CoreModule, AuthModule, ServerModule, ChannelModule, MessageModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
