import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Не заданы VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY в .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// Типы
// ============================================================

export type Profile = {
  id: string
  email: string
  full_name: string
  role: 'manager' | 'executor'
  created_at?: string
}

export type TaskStatus = 'new' | 'in_progress' | 'on_review' | 'accepted' | 'rework'

export type Task = {
  id: string
  object_id: string
  title: string
  description: string | null
  status: TaskStatus
  assignee_id: string | null
  author_id: string
  created_at: string
  updated_at: string
  // Связанные данные (подгружаются через join)
  objects?: { name: string; address: string }
  assignee?: { full_name: string }
  author?: { full_name: string }
}

export type TaskHistory = {
  id: string
  task_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  changed_by: string
  comment: string | null
  created_at: string
  profiles?: { full_name: string }
}

export type AppObject = {
  id: string
  name: string
  address: string
  created_by: string
  created_at: string
}

// ============================================================
// Справочники для UI
// ============================================================

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  on_review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  new: 'bg-gray-200 text-gray-800',
  in_progress: 'bg-blue-200 text-blue-900',
  on_review: 'bg-yellow-200 text-yellow-900',
  accepted: 'bg-green-200 text-green-900',
  rework: 'bg-red-200 text-red-900',
}