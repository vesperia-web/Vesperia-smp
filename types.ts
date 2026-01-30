
export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  is_admin?: boolean;
}

export interface Topic {
  id: number;
  created_at: string;
  title: string;
  author_id: string;
  profiles?: Profile; // Joined from Supabase
}

export interface Post {
  id: number;
  created_at: string;
  content: string;
  topic_id: number;
  author_id: string;
  profiles?: Profile; // Joined from Supabase
}

export interface GalleryImage {
  id: number;
  created_at: string;
  url: string;
  title: string;
  author_id: string;
}

export interface User {
  id: string;
  email?: string;
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
    name?: string;
  };
}

export type ToastType = 'success' | 'error' | 'info';

export interface ModalConfig {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
  inputPlaceholder?: string;
}
