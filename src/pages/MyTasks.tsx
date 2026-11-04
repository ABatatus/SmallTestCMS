import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Task, TaskStatus, STATUS_LABELS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function MyTasks() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, objects(name, address)')
      .eq('assignee_id', profile!.id)
      .order('updated_at', { ascending: false })
    setTasks(data as Task[])
    setLoading(false)
  }

  if (loading) return <div>Загрузка...</div>

  const grouped: Record<string, Task[]> = {}
  tasks.forEach(t => {
    const key = t.status
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(t)
  })

  return (
    <div>
      <h2>Мои задачи</h2>
      {tasks.length === 0 ? (
        <p style={{ color: '#888' }}>У вас пока нет задач</p>
      ) : (
        Object.entries(grouped).map(([status, list]) => (
          <div key={status} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, color: '#555', marginBottom: 8 }}>
              {STATUS_LABELS[status as TaskStatus]} ({list.length})
            </h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {list.map(t => (
                <Link key={t.id} to={`/tasks/${t.id}`}
                  style={{ background: '#fff', padding: 12, borderRadius: 6, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{t.objects?.name} • {t.objects?.address}</div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}