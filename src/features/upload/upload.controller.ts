import type { AuthRequest } from '@/auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  swaggerErrorExample as errWrap,
  swaggerExample as wrap,
} from '@/core/swagger/swagger-example.helper';
import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({
    summary: 'Upload an image',
    description:
      'Uploads an image file (jpeg, png, gif, webp) and returns the URL to use in other endpoints such as server icon or user avatar. Max size: 5MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpeg, png, gif, webp). Max 5MB.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded. Returns the accessible URL.',
    content: {
      'application/json': {
        example: wrap(201, 'Created', {
          url: '/uploads/550e8400-e29b-41d4-a716-446655440000.png',
        }),
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or file too large.',
    content: {
      'application/json': {
        example: errWrap(
          400,
          'Validation failed (expected type is /(jpeg|png|gif|webp)/)',
        ),
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    content: { 'application/json': { example: errWrap(401, 'Unauthorized') } },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Req() req: AuthRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(jpeg|png|gif|webp)/,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.uploadService.handleUpload(file);
  }
}
