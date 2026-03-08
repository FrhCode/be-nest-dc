import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChannelModule } from './channel/channel.module';
import { CoreModule } from './core/core.module';
import { MessageModule } from './message/message.module';
import { ServerModule } from './server/server.module';

@Module({
  imports: [CoreModule, AuthModule, ServerModule, ChannelModule, MessageModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
