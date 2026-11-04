import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Task, TaskHistory, TaskStatus, STATUS_LABELS } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function TaskCard() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [history, setHistory] = useState<TaskHistory[]>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const { data: t } = await supabase
      .from('tasks')
      .select('*, objects(name, address), assignee:profiles!assignee_id(full_name), author:profiles!author_id(full_name)')
      .eq('id', id)
      .single()
    setTask(t as Task)

    const { data: h } = await supabase
      .from('task_history')
      .select('*, profiles(full_name)')
      .eq('task_id', id)
      .order('created_at', { ascending: false })
    setHistory(h as TaskHistory[])
    setLoading(false)
  }

  // Какие действия доступны текущему пользователю
  function getAvailableActions(): { status: TaskStatus; label: string; needComment: boolean }[] {
    if (!task || !profile) return []
    const s = task.status
    const actions: { status: TaskStatus; label: string; needComment: boolean }[] = []

    if (s === 'new' && task.assignee_id === profile.id && profile.role === 'executor') {
      actions.push({ status: 'in_progress', label: 'Взять в работу', needComment: false })
    }
    if (s === 'in_progress' && task.assignee_id === profile.id && profile.role === 'executor') {
      actions.push({ status: 'on_review', label: 'Отправить на проверку', needComment: false })
    }
    if (s === 'on_review' && profile.role === 'manager') {
      actions.push({ status: 'accepted', label: 'Принять', needComment: false })
      actions.push({ status: 'rework', label: 'На доработку', needComment: true })
    }
    if (s === 'rework' && task.assignee_id === profile.id && profile.role === 'executor') {
      actions.push({ status: 'in_progress', label: 'В работу (после доработки)', needComment: false })
    }
    return actions
  }

  async function changeStatus(newStatus: TaskStatus) {
    setError('')
    const { data, error } = await supabase.rpc('change_task_status', {
      p_task_id: id,
      p_new_status: newStatus,
      p_comment: comment || null,
    })
    if (error) {
      setError(error.message)
    } else {
      setComment('')
      loadData()
    }
  }

  if (loading) return <div>Загрузка...</div>
  if (!task) return <div>Задача не найдена или нет доступа</div>

  const actions = getAvailableActions()

  return (
    <div>
      <Link to={`/objects/${task.object_id}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>
        ← {task.objects?.name}
      </Link>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0' }}>{task.title}</h2>
            <span style={{
              padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: getStatusBg(task.status), color: getStatusColor(task.status)
            }}>
              {STATUS_LABELS[task.status]}
            </span>
          </div>
        </div>

        {task.description && <p style={{ color: '#444', marginTop: 12 }}>{task.description}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, fontSize: 14 }}>
          <div><strong>Объект:</strong> {task.objects?.name}</div>
          <div><strong>Адрес:</strong> {task.objects?.address}</div>
          <div><strong>Исполнитель:</strong> {task.assignee?.full_name || '—'}</div>
          <div><strong>Автор:</strong> {task.author?.full_name}</div>
          <div><strong>Создана:</strong> {new Date(task.created_at).toLocaleString('ru-RU')}</div>
          <div><strong>Обновлена:</strong> {new Date(task.updated_at).toLocaleString('ru-RU')}</div>
        </div>

        {actions.length > 0 && (
          <div style={{ marginTop: 20, padding: 16, background: '#f9fafb', borderRadius: 6 }}>
            <strong>Доступные действия:</strong>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {actions.map(a => (
                <button key={a.status}
                  onClick={() => { if (a.needComment && !comment.trim()) { setError('Комментарий обязателен'); return; } changeStatus(a.status) }}
                  style={{
                    padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer',
                    background: a.status === 'accepted' ? '#16a34a' : a.status === 'rework' ? '#dc2626' : '#2563eb',
                    color: '#fff', fontWeight: 600
                  }}>
                  {a.label}
                </button>
              ))}
            </div>
            {actions.some(a => a.needComment) && (
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Комментарий..."
                style={{ width: '100%', marginTop: 8, padding: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }} />
            )}
            {error && <div style={{ color: '#dc2626', marginTop: 8, fontSize: 14 }}>{error}</div>}
          </div>
        )}
      </div>

      <h3 style={{ marginTop: 24 }}>История изменений</h3>
      {history.length === 0 ? (
        <p style={{ color: '#888' }}>История пуста</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {history.map(h => (
            <div key={h.id} style={{ background: '#fff', padding: 12, borderRadius: 6, fontSize: 14 }}>
              <div>
                <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, background: '#f3f4f6', marginRight: 8 }}>
                  {h.from_status ? STATUS_LABELS[h.from_status] : '—'} → {STATUS_LABELS[h.to_status]}
                </span>
                <strong>{h.profiles?.full_name}</strong>
                <span style={{ color: '#888', marginLeft: 8 }}>{new Date(h.created_at).toLocaleString('ru-RU')}</span>
              </div>
              {h.comment && <div style={{ marginTop: 6, color: '#555', fontStyle: 'italic' }}>«{h.comment}»</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getStatusBg(s: TaskStatus) {
  return { new: '#f3f4f6', in_progress: '#dbeafe', on_review: '#fef3c7', accepted: '#dcfce7', rework: '#fee2e2' }[s]
}
function getStatusColor(s: TaskStatus) {
  return { new: '#374151', in_progress: '#1e3a8a', on_review: '#92400e', accepted: '#166534', rework: '#991b1b' }[s]
}