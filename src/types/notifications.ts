export interface AppNotification {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link_url?: string;
  data?: Record<string, any>;
  created_at: string;
}
