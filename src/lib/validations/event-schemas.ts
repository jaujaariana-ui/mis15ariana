import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  description: z.string().max(500).optional(),
  event_date: z.string().optional(),
  max_photos_per_guest: z.number().int().min(1).max(100).optional(),
  max_file_size_mb: z.number().int().min(1).max(50).optional(),
  expires_at: z.string().optional(),
});

export const updateEventSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  event_date: z.string().optional(),
  status: z.enum(['draft', 'active', 'closed', 'expired']).optional(),
  max_photos_per_guest: z.number().int().min(1).max(100).optional(),
  max_file_size_mb: z.number().int().min(1).max(50).optional(),
  expires_at: z.string().optional(),
});

export type CreateEventSchema = z.infer<typeof createEventSchema>;
export type UpdateEventSchema = z.infer<typeof updateEventSchema>;
