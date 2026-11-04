import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import ObjectsList from './pages/ObjectsList'
import ObjectCard from './pages/ObjectCard'
import TaskCard from './pages/TaskCard'
import MyTasks from './pages/MyTasks'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div style={{ padding: 40 }}>Загрузка...</div>
  if (!session) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { session } = useAuth()
  if (!session) return <Login />

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><ObjectsList /></ProtectedRoute>} />
      <Route path="/objects/:id" element={<ProtectedRoute><ObjectCard /></ProtectedRoute>} />
      <Route path="/tasks/:id" element={<ProtectedRoute><TaskCard /></ProtectedRoute>} />
      <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}