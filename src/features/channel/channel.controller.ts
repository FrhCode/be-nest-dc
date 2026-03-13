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
import {
  swaggerErrorExample as errWrap,
  swaggerExample as wrap,
} from '@/core/swagger/swagger-example.helper';

const EXAMPLE_CHANNEL = {
  id: 1,
  name: 'general',
  type: 'message',
  serverId: 1,
  createdAt: '2026-03-13T10:00:00.000Z',
  createdBy: 'john@example.com',
  modifiedAt: '2026-03-13T10:00:00.000Z',
  modifiedBy: 'john@example.com',
};

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
  @ApiResponse({
    status: 201,
    description: 'Channel created.',
    content: {
      'application/json': {
        example: wrap(201, 'Created', EXAMPLE_CHANNEL),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin role required.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found.',
    content: {
      'application/json': { example: errWrap(404, 'Server not found') },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'List of channels.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', [EXAMPLE_CHANNEL]),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this server.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Channel updated.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', {
          ...EXAMPLE_CHANNEL,
          name: 'updated-channel',
        }),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin role required.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found.',
    content: {
      'application/json': { example: errWrap(404, 'Channel not found') },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Channel deleted.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', { success: true }),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin role required.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found.',
    content: {
      'application/json': { example: errWrap(404, 'Channel not found') },
    },
  })
  remove(
    @Req() req: AuthRequest,
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = this.getUser(req);
    return this.channelService.remove(user.sub, serverId, id);
  }
}
