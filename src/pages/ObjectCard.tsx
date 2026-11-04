import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Task, TaskStatus, STATUS_LABELS, STATUS_COLORS, Profile } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ObjectCard() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [object, setObject] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [executors, setExecutors] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const { data: obj } = await supabase.from('objects').select('*').eq('id', id).single()
    setObject(obj)

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!assignee_id(full_name), author:profiles!author_id(full_name)')
      .eq('object_id', id)
      .order('created_at', { ascending: false })
    setTasks(tasksData as Task[])

    if (profile?.role === 'manager') {
      const { data: execs } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'executor')
        .order('full_name')
      setExecutors(execs as Profile[])
    }

    setLoading(false)
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('tasks').insert({
      object_id: id,
      title,
      description: description || null,
      assignee_id: assigneeId || null,
      author_id: profile!.id,
      status: 'new',
    })
    if (!error) {
      setTitle(''); setDescription(''); setAssigneeId(''); setShowForm(false)
      loadData()
    } else {
      alert('Ошибка: ' + error.message)
    }
  }

  if (loading) return <div>Загрузка...</div>
  if (!object) return <div>Объект не найден</div>

  return (
    <div>
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>← Назад к объектам</Link>
      <h2 style={{ marginTop: 8 }}>{object.name}</h2>
      <p style={{ color: '#666' }}>{object.address}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Задачи ({tasks.length})</h3>
        {profile?.role === 'manager' && (
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            + Новая задача
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createTask} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <input placeholder="Название задачи" value={title} onChange={e => setTitle(e.target.value)} required
            style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
          <textarea placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} rows={3}
            style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }} />
          <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ccc', borderRadius: 4 }}>
            <option value="">— Не назначен —</option>
            {executors.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <button type="submit" style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Создать</button>
        </form>
      )}

      {tasks.length === 0 ? (
        <p style={{ color: '#888' }}>Задач пока нет</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {tasks.map(task => (
            <Link key={task.id} to={`/tasks/${task.id}`}
              style={{ background: '#fff', padding: 12, borderRadius: 6, textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{task.title}</div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  {task.assignee?.full_name || 'Не назначен'} • {new Date(task.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, ...getBadgeStyle(task.status) }}>
                {STATUS_LABELS[task.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function getBadgeStyle(status: TaskStatus) {
  const colors: Record<TaskStatus, { bg: string; color: string }> = {
    new: { bg: '#f3f4f6', color: '#374151' },
    in_progress: { bg: '#dbeafe', color: '#1e3a8a' },
    on_review: { bg: '#fef3c7', color: '#92400e' },
    accepted: { bg: '#dcfce7', color: '#166534' },
    rework: { bg: '#fee2e2', color: '#991b1b' },
  }
  return { background: colors[status].bg, color: colors[status].color }
}