import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ListConversationsSchema = z.object({
  include_last_message: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export class ListConversationsDto extends createZodDto(
  ListConversationsSchema,
) {}
