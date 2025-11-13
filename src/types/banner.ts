export interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  is_active: boolean;
  display_order: number;
  link_url: string | null;
  button_text: string;
  event_id: number | null;
}


