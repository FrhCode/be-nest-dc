import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UploadResponseSchema = z.object({
  url: z.string(),
});

export class UploadResponseDto extends createZodDto(UploadResponseSchema) {}
