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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateServerDto } from './dto/create-server.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { JoinServerDto } from './dto/join-server.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { ServerService } from './server.service';

@ApiTags('Servers')
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
  @ApiOperation({
    summary: 'Create a server',
    description:
      'Creates a new server. The authenticated user becomes the owner and first member.',
  })
  @ApiResponse({ status: 201, description: 'Server created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Req() req: AuthRequest, @Body() dto: CreateServerDto) {
    const user = this.getUser(req);
    return this.serverService.create(user.sub, user.email, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List my servers',
    description: 'Returns all servers the authenticated user is a member of.',
  })
  @ApiResponse({ status: 200, description: 'List of servers.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Req() req: AuthRequest) {
    const user = this.getUser(req);
    return this.serverService.findUserServers(user.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get server details',
    description:
      'Returns server details including its channels. Requires membership.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiResponse({ status: 200, description: 'Server details with channels.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not a member of this server.' })
  @ApiResponse({ status: 404, description: 'Server not found.' })
  findOne(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update server',
    description: 'Updates server name and/or icon. Requires admin role.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiResponse({ status: 200, description: 'Server updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 404, description: 'Server not found.' })
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServerDto,
  ) {
    const user = this.getUser(req);
    return this.serverService.update(user.sub, id, user.email, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete server',
    description: 'Permanently deletes a server. Requires owner role.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiResponse({ status: 200, description: 'Server deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Owner role required.' })
  @ApiResponse({ status: 404, description: 'Server not found.' })
  remove(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.remove(user.sub, id);
  }

  @Post('join')
  @ApiOperation({
    summary: 'Join a server',
    description: 'Joins a server using an invite code.',
  })
  @ApiResponse({ status: 201, description: 'Joined server successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Invalid invite code.' })
  @ApiResponse({ status: 409, description: 'Already a member.' })
  join(@Req() req: AuthRequest, @Body() dto: JoinServerDto) {
    const user = this.getUser(req);
    return this.serverService.join(user.sub, dto.inviteCode);
  }

  @Post(':id/leave')
  @ApiOperation({
    summary: 'Leave a server',
    description:
      'Leaves a server. The owner cannot leave without transferring ownership first.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiResponse({ status: 200, description: 'Left server.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Owner must transfer ownership before leaving.',
  })
  leave(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.leave(user.sub, id);
  }

  @Post(':id/invite')
  @ApiOperation({
    summary: 'Invite a user',
    description:
      'Adds a user to the server by user ID. Requires admin role.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiResponse({ status: 201, description: 'User invited.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 404, description: 'User or server not found.' })
  inviteUser(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InviteUserDto,
  ) {
    const user = this.getUser(req);
    return this.serverService.inviteUser(user.sub, id, dto.userId);
  }

  @Patch(':id/transfer')
  @ApiOperation({
    summary: 'Transfer ownership',
    description:
      'Transfers server ownership to another member. Requires owner role.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiResponse({ status: 200, description: 'Ownership transferred.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Owner role required.' })
  @ApiResponse({
    status: 404,
    description: 'Target user is not a member.',
  })
  transferOwnership(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferOwnershipDto,
  ) {
    const user = this.getUser(req);
    return this.serverService.transferOwnership(user.sub, id, dto.userId);
  }

  @Get(':id/members')
  @ApiOperation({
    summary: 'List server members',
    description:
      'Returns all members of a server with their roles. Requires membership.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiResponse({ status: 200, description: 'List of members.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not a member of this server.' })
  getMembers(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.getMembers(user.sub, id);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({
    summary: 'Update member role',
    description:
      "Changes a member's role to admin or member. Requires admin role.",
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'Role updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
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
  @ApiOperation({
    summary: 'Kick a member',
    description:
      'Removes a member from the server. Requires admin role.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiParam({ name: 'userId', description: 'User ID to kick' })
  @ApiResponse({ status: 200, description: 'Member kicked.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  kickMember(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const user = this.getUser(req);
    return this.serverService.kickMember(user.sub, id, userId);
  }
}
