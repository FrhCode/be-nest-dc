import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendFriendRequestSchema = z.object({
  addressee_id: z.number().int().positive(),
});

export class SendFriendRequestDto extends createZodDto(SendFriendRequestSchema) {}
