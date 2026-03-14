import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChannelModule } from './features/channel/channel.module';
import { CoreModule } from './core/core.module';
import { BlockModule } from './features/block/block.module';
import { DmModule } from './features/dm/dm.module';
import { FriendModule } from './features/friend/friend.module';
import { MessageModule } from './features/message/message.module';
import { ServerModule } from './features/server/server.module';
import { UploadModule } from './features/upload/upload.module';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    ServerModule,
    ChannelModule,
    MessageModule,
    UploadModule,
    BlockModule,
    FriendModule,
    DmModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
