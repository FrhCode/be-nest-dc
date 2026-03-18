import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendDmSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  reply_to_message_id: z.coerce.number().int().positive().optional(),
  quoted_content: z.string().min(1).max(2000).optional(),
  quoted_sender_name: z.string().min(1).max(255).optional(),
});

export class SendDmDto extends createZodDto(SendDmSchema) {}
