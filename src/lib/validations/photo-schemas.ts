import { z } from 'zod';

export const uploadPhotoSchema = z.object({
  event_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  storage_key: z.string().min(1),
  original_filename: z.string().min(1),
  mime_type: z.string().min(1),
  file_size: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const uploadUrlSchema = z.object({
  event_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  mime_type: z.string().min(1),
  original_filename: z.string().min(1),
});

export type UploadPhotoSchema = z.infer<typeof uploadPhotoSchema>;
export type UploadUrlSchema = z.infer<typeof uploadUrlSchema>;
