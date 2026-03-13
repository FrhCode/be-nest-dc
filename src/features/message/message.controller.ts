import type { AuthRequest } from '@/auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  swaggerErrorExample as errWrap,
  swaggerExample as wrap,
} from '@/core/swagger/swagger-example.helper';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageService } from './message.service';

const EXAMPLE_MESSAGE = {
  id: 1,
  content: 'Hello, world!',
  channelId: 1,
  senderId: 1,
  createdAt: '2026-03-13T10:00:00.000Z',
  modifiedAt: '2026-03-13T10:00:00.000Z',
};

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  private getUser(req: AuthRequest) {
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  }

  @Post()
  @ApiOperation({
    summary: 'Send a message',
    description:
      'Posts a new message to the specified channel. Requires server membership.',
  })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({
    status: 201,
    description: 'Message sent.',
    content: {
      'application/json': {
        example: wrap(201, 'Created', EXAMPLE_MESSAGE),
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    content: {
      'application/json': {
        example: errWrap(400, 'Bad Request', [
          {
            code: 'too_small',
            message: 'String must contain at least 1 character(s)',
            path: ['content'],
          },
        ]),
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
  @ApiResponse({
    status: 404,
    description: 'Channel not found.',
    content: {
      'application/json': { example: errWrap(404, 'Channel not found') },
    },
  })
  create(
    @Req() req: AuthRequest,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body() dto: CreateMessageDto,
  ) {
    const user = this.getUser(req);
    return this.messageService.create(user.sub, channelId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List messages',
    description:
      'Fetches messages from a channel with cursor-based pagination. Requires server membership.',
  })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'Message ID cursor for pagination. Returns messages after this ID.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of messages to return. Defaults to 50.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of messages.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', [EXAMPLE_MESSAGE]),
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
    @Param('channelId', ParseIntPipe) channelId: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const user = this.getUser(req);
    return this.messageService.findAll(
      user.sub,
      channelId,
      cursor ? Number(cursor) : undefined,
      limit ? Number(limit) : 50,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a message',
    description: 'Updates the content of a message. Only the sender can edit.',
  })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message updated.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', {
          ...EXAMPLE_MESSAGE,
          content: 'Updated message content',
          modifiedAt: '2026-03-13T11:00:00.000Z',
        }),
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    content: {
      'application/json': {
        example: errWrap(400, 'Bad Request', [
          {
            code: 'too_small',
            message: 'String must contain at least 1 character(s)',
            path: ['content'],
          },
        ]),
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
    description: 'Only the sender can edit.',
    content: {
      'application/json': { example: errWrap(403, 'Only the sender can edit') },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found.',
    content: {
      'application/json': { example: errWrap(404, 'Message not found') },
    },
  })
  update(
    @Req() req: AuthRequest,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMessageDto,
  ) {
    const user = this.getUser(req);
    return this.messageService.update(user.sub, channelId, id, dto.content);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a message',
    description: 'Deletes a message. The sender or a server admin can delete.',
  })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted.',
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
    description: 'Only the sender or an admin can delete.',
    content: {
      'application/json': {
        example: errWrap(403, 'Only the sender or an admin can delete'),
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found.',
    content: {
      'application/json': { example: errWrap(404, 'Message not found') },
    },
  })
  remove(
    @Req() req: AuthRequest,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = this.getUser(req);
    return this.messageService.remove(user.sub, channelId, id);
  }
}
