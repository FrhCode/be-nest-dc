import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthRequest } from '@/auth/guards/jwt-auth.guard';
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
import { CreateServerDto } from './dto/create-server.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { JoinServerDto } from './dto/join-server.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { ServerService } from './server.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers')
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  private getUser(req: AuthRequest) {
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateServerDto) {
    const user = this.getUser(req);
    return this.serverService.create(user.sub, user.email, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    const user = this.getUser(req);
    return this.serverService.findUserServers(user.sub);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.findOne(user.sub, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServerDto,
  ) {
    const user = this.getUser(req);
    return this.serverService.update(user.sub, id, user.email, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.remove(user.sub, id);
  }

  @Post('join')
  join(@Req() req: AuthRequest, @Body() dto: JoinServerDto) {
    const user = this.getUser(req);
    return this.serverService.join(user.sub, dto.inviteCode);
  }

  @Post(':id/leave')
  leave(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.leave(user.sub, id);
  }

  @Post(':id/invite')
  inviteUser(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InviteUserDto,
  ) {
    const user = this.getUser(req);
    return this.serverService.inviteUser(user.sub, id, dto.userId);
  }

  @Patch(':id/transfer')
  transferOwnership(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferOwnershipDto,
  ) {
    const user = this.getUser(req);
    return this.serverService.transferOwnership(user.sub, id, dto.userId);
  }

  @Get(':id/members')
  getMembers(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.getMembers(user.sub, id);
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const user = this.getUser(req);
    return this.serverService.updateMemberRole(user.sub, id, userId, dto.role);
  }

  @Delete(':id/members/:userId')
  kickMember(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const user = this.getUser(req);
    return this.serverService.kickMember(user.sub, id, userId);
  }
}
