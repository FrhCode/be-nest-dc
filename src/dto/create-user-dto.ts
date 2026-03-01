import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// zod schema for parents
const ParentSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
});

const CredentialsSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string(),
  // min len 2, each item is unique
  parents: z
    .array(ParentSchema)
    .min(2)
    .max(2)
    .refine(
      (parents) => {
        const names = parents.map((p) => p.name);
        return new Set(names).size === names.length;
      },
      {
        message: 'Parent names must be unique',
      },
    ),
});

// class is required for using DTO as a type
export class CreateUserDto extends createZodDto(CredentialsSchema) {}
