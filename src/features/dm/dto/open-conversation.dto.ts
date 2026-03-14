import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const OpenConversationSchema = z.object({
  user_id: z.number().int().positive(),
});

export class OpenConversationDto extends createZodDto(OpenConversationSchema) {}
