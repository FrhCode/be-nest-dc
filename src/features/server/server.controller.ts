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

const EXAMPLE_SERVER = {
  id: 1,
  name: 'My Server',
  iconUrl: 'https://example.com/icon.png',
  inviteCode: 'abc123xyz',
  ownerId: 1,
  createdAt: '2026-03-13T10:00:00.000Z',
  createdBy: 'john@example.com',
  modifiedAt: '2026-03-13T10:00:00.000Z',
  modifiedBy: 'john@example.com',
};

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

const EXAMPLE_MEMBER = {
  id: 1,
  user_id: 1,
  server_id: 1,
  role: 'member',
  created_at: '2026-03-13T10:00:00.000Z',
  username: 'john_doe',
};

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
  @ApiResponse({
    status: 201,
    description: 'Server created.',
    content: {
      'application/json': {
        example: wrap(201, 'Created', EXAMPLE_SERVER),
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
            path: ['name'],
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
  create(@Req() req: AuthRequest, @Body() dto: CreateServerDto) {
    const user = this.getUser(req);
    return this.serverService.create(user.sub, user.email, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List my servers',
    description: 'Returns all servers the authenticated user is a member of.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of servers.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', [EXAMPLE_SERVER]),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Server details with channels.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', {
          ...EXAMPLE_SERVER,
          channels: [EXAMPLE_CHANNEL],
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
    description: 'Not a member of this server.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found.',
    content: {
      'application/json': { example: errWrap(404, 'Server not found') },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Server updated.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', { ...EXAMPLE_SERVER, name: 'Updated Server' }),
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
    content: {
      'application/json': {
        example: errWrap(400, 'Bad Request', [
          { code: 'invalid_string', message: 'Invalid url', path: ['iconUrl'] },
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
  @ApiResponse({
    status: 200,
    description: 'Server deleted.',
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
    description: 'Owner role required.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found.',
    content: {
      'application/json': { example: errWrap(404, 'Server not found') },
    },
  })
  remove(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.remove(user.sub, id);
  }

  @Post('join')
  @ApiOperation({
    summary: 'Join a server',
    description: 'Joins a server using an invite code.',
  })
  @ApiResponse({
    status: 201,
    description: 'Joined server successfully.',
    content: {
      'application/json': {
        example: wrap(201, 'Created', { success: true, serverId: 1 }),
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
            path: ['inviteCode'],
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
    status: 404,
    description: 'Invalid invite code.',
    content: {
      'application/json': { example: errWrap(404, 'Invalid invite code') },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Already a member.',
    content: {
      'application/json': {
        example: errWrap(409, 'Already a member of this server'),
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Left server.',
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
    description: 'Owner must transfer ownership before leaving.',
    content: {
      'application/json': {
        example: errWrap(403, 'Owner must transfer ownership before leaving'),
      },
    },
  })
  leave(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = this.getUser(req);
    return this.serverService.leave(user.sub, id);
  }

  @Post(':id/invite')
  @ApiOperation({
    summary: 'Invite a user',
    description: 'Adds a user to the server by user ID. Requires admin role.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiResponse({
    status: 201,
    description: 'User invited.',
    content: {
      'application/json': {
        example: wrap(201, 'Created', { success: true }),
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
            code: 'invalid_type',
            message: 'Expected number, received string',
            path: ['userId'],
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
    description: 'Admin role required.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
  @ApiResponse({
    status: 404,
    description: 'User or server not found.',
    content: {
      'application/json': { example: errWrap(404, 'User not found') },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Ownership transferred.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', { success: true }),
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
            code: 'invalid_type',
            message: 'Expected number, received string',
            path: ['userId'],
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
    description: 'Owner role required.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Target user is not a member.',
    content: {
      'application/json': {
        example: errWrap(404, 'Target user is not a member'),
      },
    },
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
  @ApiResponse({
    status: 200,
    description: 'List of members.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', [EXAMPLE_MEMBER]),
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
  @ApiResponse({
    status: 200,
    description: 'Role updated.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', { success: true }),
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
            code: 'invalid_enum_value',
            message: "Invalid enum value. Expected 'admin' | 'member'",
            path: ['role'],
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
    description: 'Admin role required.',
    content: { 'application/json': { example: errWrap(403, 'Forbidden') } },
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found.',
    content: {
      'application/json': { example: errWrap(404, 'Member not found') },
    },
  })
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
    description: 'Removes a member from the server. Requires admin role.',
  })
  @ApiParam({ name: 'id', description: 'Server ID' })
  @ApiParam({ name: 'userId', description: 'User ID to kick' })
  @ApiResponse({
    status: 200,
    description: 'Member kicked.',
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
    description: 'Member not found.',
    content: {
      'application/json': { example: errWrap(404, 'Member not found') },
    },
  })
  kickMember(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const user = this.getUser(req);
    return this.serverService.kickMember(user.sub, id, userId);
  }
}
