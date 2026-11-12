import { useEffect, useState } from 'react'
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom'

import type { User } from './types'

import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import RoomPage from './pages/RoomPage'

import { authService } from './services/authService'

function OAuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const finishOAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search)

        const token = params.get('token')
        const provider = params.get('provider') as 'google' | 'github' | null

        if (!token) {
          throw new Error('Missing OAuth token')
        }

        // Store JWT so apiClient can authenticate requests
        window.localStorage.setItem(
          'codesync-session',
          JSON.stringify({
            state: {
              token,
            },
          }),
        )

        // Get the actual user from our backend
        const response = await authService.me()
        const user = response.data.user

        const uiUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          initials: user.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          color: '#6366f1',
          provider: provider ?? 'email',
        }

        window.localStorage.setItem(
          'codesync-user',
          JSON.stringify(uiUser),
        )
        
        navigate('/dashboard', { replace: true })
      } catch (error) {
        console.error('OAuth callback failed:', error)

        window.localStorage.removeItem('codesync-session')
        window.localStorage.removeItem('codesync-user')

        navigate('/login', { replace: true })
      }
    }

    void finishOAuth()
  }, [navigate])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Signing you in...</p>
    </main>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [sessionUser, setSessionUser] = useState<User | null>(() => {
    const stored = window.localStorage.getItem('codesync-user')

    if (!stored) return null

    try {
      return JSON.parse(stored)
    } catch {
      window.localStorage.removeItem('codesync-user')
      return null
    }
  })

  // Keep React state synchronized with the user saved by OAuthCallback
  useEffect(() => {
    const stored = window.localStorage.getItem('codesync-user')

    if (!stored) {
      setSessionUser(null)
      return
    }

    try {
      setSessionUser(JSON.parse(stored))
    } catch {
      window.localStorage.removeItem('codesync-user')
      setSessionUser(null)
    }
  }, [location.pathname])

  useEffect(() => {
    const loadSession = async () => {
      const rawSession =
        window.localStorage.getItem('codesync-session')
  
      if (!rawSession) {
        setSessionUser(null)
        return
      }
  
      try {
        const session = JSON.parse(rawSession)
  
        if (!session?.state?.token) {
          setSessionUser(null)
          return
        }
  
        const response = await authService.me()
        const user = response.data.user
  
        const uiUser: User = {
          id: user.id,
          name: user.name,
          email: user.email,
          initials: user.name
            .split(' ')
            .map((part: string) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          color: '#6366f1',
          provider:
            JSON.parse(
              window.localStorage.getItem('codesync-user') ?? '{}',
            ).provider ?? 'email',
        }
  
        setSessionUser(uiUser)
  
        window.localStorage.setItem(
          'codesync-user',
          JSON.stringify(uiUser),
        )
      } catch (error) {
        console.error('Failed to restore session:', error)
  
        window.localStorage.removeItem('codesync-session')
        window.localStorage.removeItem('codesync-user')
  
        setSessionUser(null)
      }
    }
  
    void loadSession()
  }, [])

  const signOut = () => {
    setSessionUser(null)

    window.localStorage.removeItem('codesync-user')
    window.localStorage.removeItem('codesync-session')

    navigate('/')
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage onEnter={() => navigate('/login')} />}
      />

      <Route
        path="/login"
        element={<AuthPage mode="login" />}
      />

      <Route
        path="/register"
        element={<AuthPage mode="register" />}
      />

      <Route
        path="/oauth/callback"
        element={<OAuthCallback />}
      />

      <Route
        path="/dashboard"
        element={
          sessionUser ? (
            <DashboardPage
              user={sessionUser}
              onLogout={signOut}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/rooms/:roomId"
        element={
          sessionUser ? (
            <RoomPage
              user={sessionUser}
              onLogout={signOut}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="*"
        element={<LandingPage onEnter={() => navigate('/login')} />}
      />
    </Routes>
  )
}

// function DashboardRail() { return <aside className="dashboard-rail"><div className="rail-group"><span className="rail-label">Workspace</span><NavLink className="rail-link rail-link--active" to="/dashboard"><LayoutDashboard size={16} /> Overview</NavLink><NavLink className="rail-link" to="/rooms/room-x72k"><Code2 size={16} /> All rooms <span className="rail-count">3</span></NavLink><a className="rail-link" href="#activity"><Activity size={16} /> Activity</a></div><div className="rail-group rail-group--bottom"><span className="rail-label">Manage</span><a className="rail-link" href="#settings"><Settings2 size={16} /> Settings</a><a className="rail-link" href="#docs"><Globe2 size={16} /> Docs <ExternalLink size={12} className="rail-external" /></a><div className="rail-storage"><div className="rail-storage__top"><Database size={14} /><span>Storage</span><span>42%</span></div><div className="storage-bar"><span /></div><small>4.2 GB of 10 GB</small></div></div></aside> }

export default App
