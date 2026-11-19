export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  event_date: string | null;
  status: 'draft' | 'active' | 'closed' | 'expired';
  max_photos_per_guest: number;
  max_file_size_mb: number;
  organizer_id: string;
  created_at: string;
  expires_at: string | null;
}

export interface EventAdmin {
  id: string;
  event_id: string;
  user_id: string;
  role: 'admin' | 'moderator';
  created_at: string;
}

export interface CreateEventInput {
  name: string;
  description?: string;
  event_date?: string;
  max_photos_per_guest?: number;
  max_file_size_mb?: number;
  expires_at?: string;
}

export interface UpdateEventInput {
  name?: string;
  description?: string;
  event_date?: string;
  cover_image?: string | null;
  status?: 'draft' | 'active' | 'closed' | 'expired';
  max_photos_per_guest?: number;
  max_file_size_mb?: number;
  expires_at?: string;
}
