import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateServerSchema = z.object({
  name: z.string().min(1).max(100),
  iconUrl: z.string().url().max(500).optional(),
});

export class CreateServerDto extends createZodDto(CreateServerSchema) {}
