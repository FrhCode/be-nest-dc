import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export class UpdateChannelDto extends createZodDto(UpdateChannelSchema) {}
