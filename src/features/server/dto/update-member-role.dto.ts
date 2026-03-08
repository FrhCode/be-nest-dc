import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export class UpdateMemberRoleDto extends createZodDto(UpdateMemberRoleSchema) {}
