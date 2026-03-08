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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('Channels')
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
  @ApiOperation({
    summary: 'Create a channel',
    description:
      'Creates a new channel in the specified server. Requires admin role.',
  })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @ApiResponse({ status: 201, description: 'Channel created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 404, description: 'Server not found.' })
  create(
    @Req() req: AuthRequest,
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() dto: CreateChannelDto,
  ) {
    const user = this.getUser(req);
    return this.channelService.create(user.sub, serverId, user.email, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List channels',
    description:
      'Returns all channels in the specified server. Requires membership.',
  })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @ApiResponse({ status: 200, description: 'List of channels.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not a member of this server.' })
  findAll(
    @Req() req: AuthRequest,
    @Param('serverId', ParseIntPipe) serverId: number,
  ) {
    const user = this.getUser(req);
    return this.channelService.findAll(user.sub, serverId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a channel',
    description: 'Updates the channel name. Requires admin role.',
  })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 404, description: 'Channel not found.' })
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
  @ApiOperation({
    summary: 'Delete a channel',
    description:
      'Permanently deletes a channel and all its messages. Requires admin role.',
  })
  @ApiParam({ name: 'serverId', description: 'Server ID' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 404, description: 'Channel not found.' })
  remove(
    @Req() req: AuthRequest,
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = this.getUser(req);
    return this.channelService.remove(user.sub, serverId, id);
  }
}
