import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['video', 'mic', 'message']),
});

export class CreateChannelDto extends createZodDto(CreateChannelSchema) {}
