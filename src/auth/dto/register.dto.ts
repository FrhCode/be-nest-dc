import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RegisterSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).max(150),
  email: z.string().email(),
  password: z.string().min(8),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
