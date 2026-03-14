import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BlockUserSchema = z.object({
  blocked_id: z.number().int().positive(),
});

export class BlockUserDto extends createZodDto(BlockUserSchema) {}
