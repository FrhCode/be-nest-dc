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
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageService } from './message.service';

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
  create(
    @Req() req: AuthRequest,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Body() dto: CreateMessageDto,
  ) {
    const user = this.getUser(req);
    return this.messageService.create(user.sub, channelId, dto);
  }

  @Get()
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
  remove(
    @Req() req: AuthRequest,
    @Param('channelId', ParseIntPipe) channelId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = this.getUser(req);
    return this.messageService.remove(user.sub, channelId, id);
  }
}
