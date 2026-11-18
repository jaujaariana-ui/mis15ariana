export interface GuestProfile {
  id: string;
  auth_user_id: string;
  display_name: string;
  event_id: string;
  is_blocked: boolean;
  created_at: string;
}

export interface CreateGuestProfileInput {
  display_name: string;
  event_id: string;
}
