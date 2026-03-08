import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  iconUrl: z.string().url().max(500).optional(),
});

export class UpdateServerDto extends createZodDto(UpdateServerSchema) {}
