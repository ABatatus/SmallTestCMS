import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, AppObject } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ObjectsList() {
  const { profile } = useAuth()
  const [objects, setObjects] = useState<AppObject[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

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
      .insert({ name, address, created_by: profile!.id })
    if (!error) {
      setName(''); setAddress(''); setShowForm(false)
      loadObjects()
    } else {
      alert('Ошибка: ' + error.message)
    }
  }

  async function deleteObject(id: string) {
    if (!confirm('Удалить объект?')) return
    await supabase.from('objects').delete().eq('id', id)
    loadObjects()
  }

  if (loading) return <div>Загрузка...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Объекты</h2>
        {profile?.role === 'manager' && (
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            + Новый объект
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createObject} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12 }}>
          <input placeholder="Название" value={name} onChange={e => setName(e.target.value)} required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, flex: 1 }} />
          <input placeholder="Адрес" value={address} onChange={e => setAddress(e.target.value)} required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, flex: 2 }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Создать</button>
        </form>
      )}

      {objects.length === 0 ? (
        <p style={{ color: '#888' }}>Объектов пока нет</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {objects.map(obj => (
            <div key={obj.id} style={{ background: '#fff', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link to={`/objects/${obj.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{obj.name}</div>
                <div style={{ color: '#666', fontSize: 14 }}>{obj.address}</div>
              </Link>
              {profile?.role === 'manager' && (
                <button onClick={() => deleteObject(obj.id)}
                  style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                  Удалить
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}