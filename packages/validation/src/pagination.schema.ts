import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.string().trim().optional(),
});

export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;
