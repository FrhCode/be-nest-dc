import type { AuthRequest } from '@/auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers/:serverId/channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  private getUser(req: AuthRequest) {
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  }

  @Post()
  create(
    @Req() req: AuthRequest,
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() dto: CreateChannelDto,
  ) {
    const user = this.getUser(req);
    return this.channelService.create(user.sub, serverId, user.email, dto);
  }

  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Param('serverId', ParseIntPipe) serverId: number,
  ) {
    const user = this.getUser(req);
    return this.channelService.findAll(user.sub, serverId);
  }

  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChannelDto,
  ) {
    const user = this.getUser(req);
    return this.channelService.update(user.sub, serverId, id, user.email, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: AuthRequest,
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = this.getUser(req);
    return this.channelService.remove(user.sub, serverId, id);
  }
}
