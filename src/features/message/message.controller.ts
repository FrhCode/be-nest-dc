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
  @ApiResponse({ status: 201, description: 'Message sent.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not a member of this server.' })
  @ApiResponse({ status: 404, description: 'Channel not found.' })
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
    description: 'Message ID cursor for pagination. Returns messages after this ID.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of messages to return. Defaults to 50.',
  })
  @ApiResponse({ status: 200, description: 'List of messages.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not a member of this server.' })
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
  @ApiResponse({ status: 200, description: 'Message updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Only the sender can edit.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
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
    description:
      'Deletes a message. The sender or a server admin can delete.',
  })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Only the sender or an admin can delete.',
  })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  remove(
    @Req() req: AuthRequest,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = this.getUser(req);
    return this.messageService.remove(user.sub, channelId, id);
  }
}
