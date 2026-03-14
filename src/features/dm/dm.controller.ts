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
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as multer from 'multer';
import * as path from 'path';
import { AddReactionDto } from './dto/add-reaction.dto';
import { EditDmDto } from './dto/edit-dm.dto';
import { OpenConversationDto } from './dto/open-conversation.dto';
import { SendDmDto } from './dto/send-dm.dto';
import { DmService } from './dm.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const multerStorage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'temp'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const EXAMPLE_CONV = {
  id: 1,
  user_one_id: 1,
  user_two_id: 2,
  created_at: '2026-03-15T10:00:00.000Z',
  partner: { id: 2, name: 'Bob' },
};

const EXAMPLE_MESSAGE = {
  id: 1,
  content: 'Hey!',
  conversation_id: 1,
  sender_id: 1,
  sender_name: 'Alice',
  attachment_url: null,
  quoted_content: null,
  quoted_sender_name: null,
  created_at: '2026-03-15T10:00:00.000Z',
  modified_at: '2026-03-15T10:00:00.000Z',
};

const EXAMPLE_REACTION = {
  id: 1,
  message_id: 1,
  user_id: 1,
  emoji: '👍',
  created_at: '2026-03-15T10:00:00.000Z',
};

@ApiTags('Direct Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dm')
export class DmController {
  constructor(private readonly dmService: DmService) {}

  private getUser(req: AuthRequest) {
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Open a DM conversation',
    description:
      'Opens or retrieves an existing DM conversation with a friend. Both users must be friends and neither can have blocked the other.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation opened or retrieved.',
    content: {
      'application/json': { example: wrap(201, 'Created', EXAMPLE_CONV) },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot DM yourself.',
    content: {
      'application/json': {
        example: errWrap(400, 'You cannot open a conversation with yourself'),
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
    description: 'Not friends or blocked.',
    content: {
      'application/json': {
        example: errWrap(403, 'You must be friends to perform this action'),
      },
    },
  })
  openConversation(@Req() req: AuthRequest, @Body() dto: OpenConversationDto) {
    const user = this.getUser(req);
    return this.dmService.openConversation(user.sub, dto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List DM conversations',
    description:
      'Returns all DM conversations for the current user with partner info.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of conversations.',
    content: {
      'application/json': { example: wrap(200, 'OK', [EXAMPLE_CONV]) },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  listConversations(@Req() req: AuthRequest) {
    const user = this.getUser(req);
    return this.dmService.listConversations(user.sub);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({
    summary: 'List DM messages',
    description:
      'Returns messages in a conversation with cursor-based pagination.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Message ID cursor for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of messages (default 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of messages.',
    content: {
      'application/json': { example: wrap(200, 'OK', [EXAMPLE_MESSAGE]) },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 403,
    description: 'Not a participant.',
    content: {
      'application/json': {
        example: errWrap(403, 'You are not a participant in this conversation'),
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found.',
    content: {
      'application/json': { example: errWrap(404, 'Conversation not found') },
    },
  })
  listMessages(
    @Req() req: AuthRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const user = this.getUser(req);
    return this.dmService.listMessages(
      user.sub,
      conversationId,
      cursor ? Number(cursor) : undefined,
      limit ? Number(limit) : 50,
    );
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({
    summary: 'Send a DM',
    description:
      'Sends a message in a DM conversation. Supports optional text content, file attachment (images/docs up to 10MB), and inline quoting. At least content or attachment must be provided.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          maxLength: 2000,
          description: 'Message text (optional if attachment provided)',
        },
        attachment: {
          type: 'string',
          format: 'binary',
          description: 'File attachment (optional)',
        },
        quoted_content: {
          type: 'string',
          maxLength: 2000,
          description: 'Quoted message text (optional)',
        },
        quoted_sender_name: {
          type: 'string',
          maxLength: 255,
          description: 'Name of the quoted message sender (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent.',
    content: {
      'application/json': { example: wrap(201, 'Created', EXAMPLE_MESSAGE) },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No content or attachment.',
    content: {
      'application/json': {
        example: errWrap(400, 'Message must have content or an attachment'),
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
    description: 'Not a participant, not friends, or blocked.',
    content: {
      'application/json': {
        example: errWrap(403, 'You are not a participant in this conversation'),
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found.',
    content: {
      'application/json': { example: errWrap(404, 'Conversation not found') },
    },
  })
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: multerStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file type'), false);
        }
      },
    }),
  )
  sendMessage(
    @Req() req: AuthRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() dto: SendDmDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = this.getUser(req);
    return this.dmService.sendMessage(user.sub, conversationId, dto, file);
  }

  @Patch('conversations/:conversationId/messages/:messageId')
  @ApiOperation({
    summary: 'Edit a DM',
    description: 'Edits the text content of a DM. Only the sender can edit.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message updated.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', { ...EXAMPLE_MESSAGE, content: 'Updated' }),
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
    description: 'Not the sender.',
    content: {
      'application/json': {
        example: errWrap(403, 'You can only edit your own messages'),
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
  editMessage(
    @Req() req: AuthRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: EditDmDto,
  ) {
    const user = this.getUser(req);
    return this.dmService.editMessage(user.sub, conversationId, messageId, dto);
  }

  @Delete('conversations/:conversationId/messages/:messageId')
  @ApiOperation({
    summary: 'Delete a DM',
    description:
      'Deletes a DM message. Only the sender can delete. Also removes any attached file.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted.',
    content: {
      'application/json': { example: wrap(200, 'OK', { success: true }) },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 403,
    description: 'Not the sender.',
    content: {
      'application/json': {
        example: errWrap(403, 'You can only delete your own messages'),
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
  deleteMessage(
    @Req() req: AuthRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    const user = this.getUser(req);
    return this.dmService.deleteMessage(user.sub, conversationId, messageId);
  }

  @Post('conversations/:conversationId/messages/:messageId/reactions')
  @ApiOperation({
    summary: 'Add a reaction',
    description: 'Adds an emoji reaction to a DM message.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({
    status: 201,
    description: 'Reaction added.',
    content: {
      'application/json': { example: wrap(201, 'Created', EXAMPLE_REACTION) },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found.',
    content: {
      'application/json': { example: errWrap(404, 'Message not found') },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Already reacted.',
    content: {
      'application/json': {
        example: errWrap(409, 'You already reacted with this emoji'),
      },
    },
  })
  addReaction(
    @Req() req: AuthRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: AddReactionDto,
  ) {
    const user = this.getUser(req);
    return this.dmService.addReaction(user.sub, conversationId, messageId, dto);
  }

  @Delete('conversations/:conversationId/messages/:messageId/reactions/:emoji')
  @ApiOperation({
    summary: 'Remove a reaction',
    description: "Removes the current user's emoji reaction from a DM message.",
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiParam({ name: 'emoji', description: 'The emoji character to remove' })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed.',
    content: {
      'application/json': { example: wrap(200, 'OK', { success: true }) },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Reaction not found.',
    content: {
      'application/json': { example: errWrap(404, 'Reaction not found') },
    },
  })
  removeReaction(
    @Req() req: AuthRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Param('emoji') emoji: string,
  ) {
    const user = this.getUser(req);
    return this.dmService.removeReaction(
      user.sub,
      conversationId,
      messageId,
      emoji,
    );
  }

  @Get('attachments/:messageId')
  @ApiOperation({
    summary: 'Download DM attachment',
    description:
      'Securely serves a DM attachment file. Requires JWT auth and user must be a conversation participant.',
  })
  @ApiParam({
    name: 'messageId',
    description: 'Message ID whose attachment to download',
  })
  @ApiResponse({ status: 200, description: 'File stream.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @ApiResponse({
    status: 403,
    description: 'Not a participant.',
    content: {
      'application/json': {
        example: errWrap(403, 'You are not a participant in this conversation'),
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Attachment not found.',
    content: {
      'application/json': { example: errWrap(404, 'Attachment not found') },
    },
  })
  async serveAttachment(
    @Req() req: AuthRequest,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Res() res: Response,
  ) {
    const user = this.getUser(req);
    const { filePath, filename } = await this.dmService.serveAttachment(
      user.sub,
      messageId,
    );
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(filePath);
  }
}
