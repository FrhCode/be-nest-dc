import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const InviteUserSchema = z.object({
  userId: z.number().int().positive(),
});

export class InviteUserDto extends createZodDto(InviteUserSchema) {}
