import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AddReactionSchema = z.object({
  emoji: z.string().min(1).max(50),
});

export class AddReactionDto extends createZodDto(AddReactionSchema) {}
