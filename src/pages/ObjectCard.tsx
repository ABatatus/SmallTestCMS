import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Task, TaskStatus, STATUS_LABELS, Profile, AppObject } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ObjectCard() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [object, setObject] = useState<AppObject | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [executors, setExecutors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // Создание задачи
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState('')

  // Редактирование объекта
  const [editObj, setEditObj] = useState<AppObject | null>(null)

  // Редактирование задачи
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskDescription, setEditTaskDescription] = useState('')
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState('')

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const { data: obj } = await supabase.from('objects').select('*').eq('id', id).single()
    setObject(obj as AppObject)

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
      title: taskTitle,
      description: taskDescription || null,
      assignee_id: taskAssigneeId || null,
      author_id: profile!.id,
      status: 'new',
    })
    if (!error) {
      setTaskTitle(''); setTaskDescription(''); setTaskAssigneeId(''); setShowTaskForm(false)
      loadData()
    } else {
      alert('Ошибка: ' + error.message)
    }
  }

  function openEditObject() {
    if (object) setEditObj({ ...object })
  }

  async function saveEditObject(e: React.FormEvent) {
    e.preventDefault()
    if (!editObj) return
    const { error } = await supabase
      .from('objects')
      .update({ name: editObj.name, address: editObj.address, updated_at: new Date().toISOString() })
      .eq('id', editObj.id)
    if (!error) {
      setEditObj(null)
      loadData()
    } else {
      alert('Ошибка: ' + error.message)
    }
  }

  function openEditTask(task: Task) {
    setEditTask(task)
    setEditTaskTitle(task.title)
    setEditTaskDescription(task.description || '')
    setEditTaskAssigneeId(task.assignee_id || '')
  }

  async function saveEditTask(e: React.FormEvent) {
    e.preventDefault()
    if (!editTask) return
    const { error } = await supabase
      .from('tasks')
      .update({
        title: editTaskTitle,
        description: editTaskDescription || null,
        assignee_id: editTaskAssigneeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editTask.id)
    if (!error) {
      setEditTask(null)
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 }}>
        <div>
          <h2 style={{ margin: '8px 0 4px 0' }}>{object.name}</h2>
          <p style={{ color: '#666', margin: 0 }}>{object.address}</p>
        </div>
        {profile?.role === 'manager' && (
          <button onClick={openEditObject}
            style={{ padding: '6px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Редактировать объект
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Задачи ({tasks.length})</h3>
        {profile?.role === 'manager' && (
          <button onClick={() => setShowTaskForm(!showTaskForm)}
            style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            + Новая задача
          </button>
        )}
      </div>

      {showTaskForm && (
        <form onSubmit={createTask} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <input placeholder="Название задачи" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required
            style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
          <textarea placeholder="Описание" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={3}
            style={{ width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }} />
          <select value={taskAssigneeId} onChange={e => setTaskAssigneeId(e.target.value)}
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
            <div key={task.id} style={{ background: '#fff', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Link to={`/tasks/${task.id}`}
                style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{task.title}</div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  {task.assignee?.full_name || 'Не назначен'} • {new Date(task.created_at).toLocaleDateString('ru-RU')}
                </div>
              </Link>
              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: getBadgeBg(task.status), color: getBadgeColor(task.status) }}>
                {STATUS_LABELS[task.status]}
              </span>
              {profile?.role === 'manager' && (
                <button onClick={() => openEditTask(task)}
                  style={{ padding: '4px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                  Редактировать
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модалка редактирования объекта */}
      {editObj && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setEditObj(null)}>
          <form onSubmit={saveEditObject} onClick={e => e.stopPropagation()}
            style={{ background: '#fff', padding: 24, borderRadius: 8, width: 400, maxWidth: '90vw' }}>
            <h3 style={{ marginTop: 0 }}>Редактировать объект</h3>
            <input value={editObj.name} onChange={e => setEditObj({ ...editObj, name: e.target.value })} required
              style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
            <input value={editObj.address} onChange={e => setEditObj({ ...editObj, address: e.target.value })} required
              style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditObj(null)}
                style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Отмена</button>
              <button type="submit"
                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Сохранить</button>
            </div>
          </form>
        </div>
      )}

      {/* Модалка редактирования задачи */}
      {editTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setEditTask(null)}>
        <form onSubmit={saveEditTask} onClick={e => e.stopPropagation()}
            style={{ background: '#fff', padding: 24, borderRadius: 8, width: 480, maxWidth: '90vw' }}>
          <h3 style={{ marginTop: 0 }}>Редактировать задачу</h3>
          <input value={editTaskTitle} onChange={e => setEditTaskTitle(e.target.value)} required placeholder="Название"
            style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
          <textarea value={editTaskDescription} onChange={e => setEditTaskDescription(e.target.value)} rows={3} placeholder="Описание"
            style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }} />
          <select value={editTaskAssigneeId} onChange={e => setEditTaskAssigneeId(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ccc', borderRadius: 4 }}>
            <option value="">— Не назначен —</option>
            {executors.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditTask(null)}
              style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Отмена</button>
            <button type="submit"
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Сохранить</button>
          </div>
        </form>
      </div>
      )}
    </div>
  )
}

function getBadgeBg(s: TaskStatus) {
  return { new: '#f3f4f6', in_progress: '#dbeafe', on_review: '#fef3c7', accepted: '#dcfce7', rework: '#fee2e2' }[s]
}
function getBadgeColor(s: TaskStatus) {
  return { new: '#374151', in_progress: '#1e3a8a', on_review: '#92400e', accepted: '#166534', rework: '#991b1b' }[s]
}