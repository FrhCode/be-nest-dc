import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DeleteDmSchema = z.object({
  mode: z.enum(['for_me', 'for_everyone']),
});

export class DeleteDmDto extends createZodDto(DeleteDmSchema) {}
