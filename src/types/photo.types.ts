export interface Photo {
  id: string;
  event_id: string;
  guest_id: string;
  storage_key: string;
  original_filename: string | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  status: 'uploading' | 'uploaded' | 'processing' | 'rejected';
  created_at: string;
  deleted_at: string | null;
  guest_display_name?: string | null;
}

export interface UploadPhotoInput {
  event_id: string;
  guest_id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
}

export interface UploadSignedUrlResponse {
  uploadUrl: string;
  storageKey: string;
}
