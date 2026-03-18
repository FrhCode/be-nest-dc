import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendFriendRequestSchema = z.object({
  email: z.string().email(),
});

export class SendFriendRequestDto extends createZodDto(
  SendFriendRequestSchema,
) {}
