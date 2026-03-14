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
import { BlockService } from './block.service';
import { BlockUserDto } from './dto/block-user.dto';

const EXAMPLE_BLOCK = {
  id: 1,
  blocked_id: 2,
  blocked_name: 'Bob',
  created_at: '2026-03-15T10:00:00.000Z',
};

@ApiTags('Blocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('blocks')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  private getUser(req: AuthRequest) {
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  }

  @Post()
  @ApiOperation({
    summary: 'Block a user',
    description:
      'Blocks another user. Automatically removes any existing friendship or pending friend requests.',
  })
  @ApiResponse({
    status: 201,
    description: 'User blocked.',
    content: {
      'application/json': { example: wrap(201, 'Created', EXAMPLE_BLOCK) },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot block yourself.',
    content: {
      'application/json': {
        example: errWrap(400, 'You cannot block yourself'),
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
    description: 'User not found.',
    content: {
      'application/json': { example: errWrap(404, 'User not found') },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User already blocked.',
    content: {
      'application/json': { example: errWrap(409, 'User is already blocked') },
    },
  })
  block(@Req() req: AuthRequest, @Body() dto: BlockUserDto) {
    const user = this.getUser(req);
    return this.blockService.block(user.sub, dto);
  }

  @Delete(':userId')
  @ApiOperation({
    summary: 'Unblock a user',
    description: 'Removes a block on another user.',
  })
  @ApiParam({ name: 'userId', description: 'ID of the user to unblock' })
  @ApiResponse({
    status: 200,
    description: 'User unblocked.',
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
    status: 404,
    description: 'Block not found.',
    content: {
      'application/json': { example: errWrap(404, 'Block not found') },
    },
  })
  unblock(
    @Req() req: AuthRequest,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const user = this.getUser(req);
    return this.blockService.unblock(user.sub, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List blocked users',
    description: 'Returns a list of users the current user has blocked.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of blocked users.',
    content: {
      'application/json': { example: wrap(200, 'OK', [EXAMPLE_BLOCK]) },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  findAll(@Req() req: AuthRequest) {
    const user = this.getUser(req);
    return this.blockService.findAll(user.sub);
  }
}
