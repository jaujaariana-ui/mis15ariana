export interface Organizer {
  id: string;
  auth_user_id: string;
  email: string;
  created_at: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}
