import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const TransferOwnershipSchema = z.object({
  userId: z.number().int().positive(),
});

export class TransferOwnershipDto extends createZodDto(TransferOwnershipSchema) {}
