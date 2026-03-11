export interface Profile {
  id: number;
  name: string;
  avatar: string;
  logo?: string | null; // Logo URL or data URL
  color_theme: string;
  app_background_theme: string;
  custom_background_image?: string | null; // Custom background image as data URL
  font_family?: string; // Font family name
  text_color?: string; // Font color (hex)
  is_archived?: boolean;
  custom_labels?: Record<string, string>; // Custom labels for UI text
}

export interface Category {
  id: number;
  profile_id: number;
  name: string;
  color: string;
}

export interface Affaire {
  id: number;
  profile_id: number;
  number: string;
  name: string;
  color: string;
  status: 'Active' | 'En pause' | 'Clôturée';
  created_at: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_complete: boolean;
  assignee_id?: number | null;
  assignee_name?: string;
  assignee_avatar?: string;
  created_at?: string;
  due_date?: string | null;
  time_spent?: number; // in minutes
  completed_at?: string;
}

export interface TaskAssignee {
  id: number;
  task_id: number;
  assignee_name: string;
  assignee_avatar: string;
}

export interface Comment {
  id: number;
  entity_type: 'task' | 'subtask';
  entity_id: number;
  text: string;
  created_at: string;
}

export interface Task {
  id: number;
  profile_id: number;
  title: string;
  description_md: string;
  start_date: string | null;
  due_date: string | null;
  start_time?: string | null; // HH:mm format
  end_time?: string | null; // HH:mm format
  priority: 'High' | 'Medium' | 'Low';
  category_id: number | null;
  affaire_id?: number | null;
  is_complete: boolean;
  kanban_column: string;
  order_index: number;
  subtasks: Subtask[];
  assignees?: TaskAssignee[];
  category_name?: string;
  category_color?: string;
  affaire_number?: string;
  affaire_name?: string;
  affaire_color?: string;
  created_at?: string;
  completed_at?: string;
  time_spent?: number; // in minutes
  bg_color?: string; // background color for task
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null; // Recurrence pattern
  recurrence_end_date?: string | null; // ISO 8601 date when recurrence ends
  _isRecurringOccurrence?: boolean; // Internal flag for recurring instances
  _parentTaskId?: number; // Reference to the original recurring task
  _occurrenceIndex?: number; // Which occurrence this is
}

export type ViewMode = 'list' | 'kanban' | 'calendar' | 'stats' | 'archive' | 'trash' | 'affaires' | 'backups';

export interface AppointmentParticipant {
  id: number;
  appointment_id: number;
  first_name: string;
  last_name: string;
  company_entity: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface Appointment {
  id: number;
  profile_id: number;
  title: string;
  description: string;
  location: string;
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  affaire_id?: number | null;
  affaire_name?: string;
  affaire_color?: string;
  video_call_link?: string;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  recurrence_end_date?: string | null; // ISO 8601 date
  participants: AppointmentParticipant[];
  created_at: string;
  updated_at: string;
}

