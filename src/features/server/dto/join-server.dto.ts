import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const JoinServerSchema = z.object({
  inviteCode: z.string().min(1),
});

export class JoinServerDto extends createZodDto(JoinServerSchema) {}
