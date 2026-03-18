import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const OpenConversationSchema = z.object({
  id: z.number(),
});

export class OpenConversationDto extends createZodDto(OpenConversationSchema) {}
