import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const linkStyle = (path: string) => ({
    padding: '8px 12px',
    textDecoration: 'none',
    color: location.pathname === path ? '#2563eb' : '#333',
    fontWeight: location.pathname === path ? 600 : 400,
    borderBottom: location.pathname === path ? '2px solid #2563eb' : 'none',
  })

  return (
    <div>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <strong style={{ fontSize: 18 }}>🏗️ СтройCRM</strong>
          <Link to="/" style={linkStyle('/')}>Объекты</Link>
          {profile?.role === 'executor' && (
            <Link to="/my-tasks" style={linkStyle('/my-tasks')}>Мои задачи</Link>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#666' }}>
            {profile?.full_name} ({profile?.role === 'manager' ? 'Постановщик' : 'Исполнитель'})
          </span>
          <button onClick={signOut} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
            Выйти
          </button>
        </div>
      </header>
      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}