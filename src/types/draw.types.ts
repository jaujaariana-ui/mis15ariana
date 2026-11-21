export interface DrawSession {
  id: string;
  event_id: string;
  status: 'pending' | 'running' | 'finished' | 'cancelled';
  winner_participant_id: string | null;
  winner_display_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_by: string;
  animation_duration_ms: number;
  created_at: string;
}

export interface DrawParticipant {
  id: string;
  display_name: string;
  photo_count: number;
}

export interface DrawEligibleParticipantsResponse {
  participants: DrawParticipant[];
  count: number;
}

export interface DrawSessionResponse {
  session: DrawSession | null;
  activeSession: DrawSession | null;
}
