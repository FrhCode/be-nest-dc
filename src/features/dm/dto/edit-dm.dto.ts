import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const EditDmSchema = z.object({
  content: z.string().min(1).max(2000),
});

export class EditDmDto extends createZodDto(EditDmSchema) {}
