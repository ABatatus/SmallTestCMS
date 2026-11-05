import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, AppObject } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ObjectsList() {
  const { profile } = useAuth()
  const [objects, setObjects] = useState<AppObject[]>([])
  const [loading, setLoading] = useState(true)

  // Формы создания
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')

  // Форма редактирования
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')

  useEffect(() => { loadObjects() }, [])

  async function loadObjects() {
    const { data, error } = await supabase
      .from('objects')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setObjects(data as AppObject[])
    setLoading(false)
  }

  async function createObject(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('objects')
      .insert({ name: newName, address: newAddress, created_by: profile!.id })
    if (!error) {
      setNewName(''); setNewAddress(''); setShowCreate(false)
      loadObjects()
    } else {
      alert('Ошибка: ' + error.message)
    }
  }

  function openEdit(obj: AppObject) {
    setEditingId(obj.id)
    setEditName(obj.name)
    setEditAddress(obj.address)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    const { error } = await supabase
      .from('objects')
      .update({ name: editName, address: editAddress, updated_at: new Date().toISOString() })
      .eq('id', editingId)
    if (!error) {
      setEditingId(null)
      loadObjects()
    } else {
      alert('Ошибка: ' + error.message)
    }
  }

  async function deleteObject(id: string) {
    if (!confirm('Удалить объект? Все связанные задачи тоже будут удалены.')) return
    await supabase.from('objects').delete().eq('id', id)
    loadObjects()
  }

  if (loading) return <div>Загрузка...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Объекты</h2>
        {profile?.role === 'manager' && (
          <button onClick={() => setShowCreate(!showCreate)}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            + Новый объект
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={createObject} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12 }}>
          <input placeholder="Название" value={newName} onChange={e => setNewName(e.target.value)} required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, flex: 1 }} />
          <input placeholder="Адрес" value={newAddress} onChange={e => setNewAddress(e.target.value)} required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, flex: 2 }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Создать</button>
        </form>
      )}

      {objects.length === 0 ? (
        <p style={{ color: '#888' }}>Объектов пока нет</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {objects.map(obj => (
            <div key={obj.id} style={{ background: '#fff', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Link to={`/objects/${obj.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{obj.name}</div>
                <div style={{ color: '#666', fontSize: 14 }}>{obj.address}</div>
              </Link>
              {profile?.role === 'manager' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(obj)}
                    style={{ padding: '4px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                    Редактировать
                  </button>
                  <button onClick={() => deleteObject(obj.id)}
                    style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setEditingId(null)}>
          <form onSubmit={saveEdit} onClick={e => e.stopPropagation()}
            style={{ background: '#fff', padding: 24, borderRadius: 8, width: 400, maxWidth: '90vw' }}>
            <h3 style={{ marginTop: 0 }}>Редактировать объект</h3>
            <input value={editName} onChange={e => setEditName(e.target.value)} required
              style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
            <input value={editAddress} onChange={e => setEditAddress(e.target.value)} required
              style={{ width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingId(null)}
                style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                Отмена
              </button>
              <button type="submit"
                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}