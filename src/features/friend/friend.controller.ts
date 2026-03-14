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
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendService } from './friend.service';

const EXAMPLE_REQUEST = {
  id: 1,
  requester_id: 1,
  addressee_id: 2,
  status: 'pending',
  created_at: '2026-03-15T10:00:00.000Z',
  modified_at: '2026-03-15T10:00:00.000Z',
};

const EXAMPLE_FRIEND = {
  id: 1,
  friend_id: 2,
  friend_name: 'Bob',
  since: '2026-03-15T10:00:00.000Z',
};

@ApiTags('Friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  private getUser(req: AuthRequest) {
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  }

  @Post('requests')
  @ApiOperation({
    summary: 'Send a friend request',
    description:
      'Sends a friend request to another user. Fails if either user has blocked the other.',
  })
  @ApiResponse({
    status: 201,
    description: 'Friend request sent.',
    content: {
      'application/json': { example: wrap(201, 'Created', EXAMPLE_REQUEST) },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot send request to yourself.',
    content: {
      'application/json': {
        example: errWrap(400, 'You cannot send a friend request to yourself'),
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
    description: 'Blocked.',
    content: {
      'application/json': {
        example: errWrap(403, 'You cannot send a friend request to this user'),
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
    content: {
      'application/json': { example: errWrap(404, 'User not found') },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Already friends or request exists.',
    content: {
      'application/json': {
        example: errWrap(409, 'A friend request already exists'),
      },
    },
  })
  sendRequest(@Req() req: AuthRequest, @Body() dto: SendFriendRequestDto) {
    const user = this.getUser(req);
    return this.friendService.sendRequest(user.sub, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List friends',
    description: 'Returns a list of all accepted friends.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of friends.',
    content: {
      'application/json': { example: wrap(200, 'OK', [EXAMPLE_FRIEND]) },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  listFriends(@Req() req: AuthRequest) {
    const user = this.getUser(req);
    return this.friendService.listFriends(user.sub);
  }

  @Get('requests/incoming')
  @ApiOperation({
    summary: 'List incoming friend requests',
    description:
      'Returns all pending friend requests sent to the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of incoming requests.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', [
          {
            id: 1,
            requester_id: 2,
            requester_name: 'Bob',
            created_at: '2026-03-15T10:00:00.000Z',
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
  listIncoming(@Req() req: AuthRequest) {
    const user = this.getUser(req);
    return this.friendService.listIncomingRequests(user.sub);
  }

  @Get('requests/outgoing')
  @ApiOperation({
    summary: 'List outgoing friend requests',
    description:
      'Returns all pending friend requests sent by the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of outgoing requests.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', [
          {
            id: 1,
            addressee_id: 2,
            addressee_name: 'Bob',
            created_at: '2026-03-15T10:00:00.000Z',
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
  listOutgoing(@Req() req: AuthRequest) {
    const user = this.getUser(req);
    return this.friendService.listOutgoingRequests(user.sub);
  }

  @Patch('requests/:requestId/accept')
  @ApiOperation({
    summary: 'Accept a friend request',
    description: 'Accepts a pending friend request sent to the current user.',
  })
  @ApiParam({ name: 'requestId', description: 'Friend request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request accepted.',
    content: {
      'application/json': {
        example: wrap(200, 'OK', { ...EXAMPLE_REQUEST, status: 'accepted' }),
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
    description: 'Not your request to accept.',
    content: {
      'application/json': {
        example: errWrap(403, 'You can only accept requests sent to you'),
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Request not found.',
    content: {
      'application/json': { example: errWrap(404, 'Friend request not found') },
    },
  })
  acceptRequest(
    @Req() req: AuthRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const user = this.getUser(req);
    return this.friendService.acceptRequest(user.sub, requestId);
  }

  @Patch('requests/:requestId/reject')
  @ApiOperation({
    summary: 'Reject a friend request',
    description:
      'Rejects and deletes a pending friend request sent to the current user.',
  })
  @ApiParam({ name: 'requestId', description: 'Friend request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request rejected.',
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
    description: 'Not your request to reject.',
    content: {
      'application/json': {
        example: errWrap(403, 'You can only reject requests sent to you'),
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Request not found.',
    content: {
      'application/json': { example: errWrap(404, 'Friend request not found') },
    },
  })
  rejectRequest(
    @Req() req: AuthRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const user = this.getUser(req);
    return this.friendService.rejectRequest(user.sub, requestId);
  }

  @Delete('requests/:requestId')
  @ApiOperation({
    summary: 'Cancel a friend request',
    description: 'Cancels a pending friend request sent by the current user.',
  })
  @ApiParam({ name: 'requestId', description: 'Friend request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request cancelled.',
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
    description: 'Not your request to cancel.',
    content: {
      'application/json': {
        example: errWrap(403, 'You can only cancel your own friend requests'),
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Request not found.',
    content: {
      'application/json': { example: errWrap(404, 'Friend request not found') },
    },
  })
  cancelRequest(
    @Req() req: AuthRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const user = this.getUser(req);
    return this.friendService.cancelRequest(user.sub, requestId);
  }

  @Delete(':userId')
  @ApiOperation({
    summary: 'Remove a friend',
    description: 'Removes an existing friendship.',
  })
  @ApiParam({ name: 'userId', description: 'ID of the friend to remove' })
  @ApiResponse({
    status: 200,
    description: 'Friend removed.',
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
    description: 'Friendship not found.',
    content: {
      'application/json': { example: errWrap(404, 'Friendship not found') },
    },
  })
  removeFriend(
    @Req() req: AuthRequest,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const user = this.getUser(req);
    return this.friendService.removeFriend(user.sub, userId);
  }
}
