
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Circle,
  Github,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'

import Brand from '../components/common/Brand'
import Avatar from '../components/common/Avatar'
import { collaborators } from '../data'
import { apiClient } from '../services/apiClient'

type AuthPageProps = {
  mode: 'login' | 'register'
}

export default function AuthPage({ mode }: AuthPageProps) {
  const [isRegister, setIsRegister] = useState(mode === 'register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)

  const navigate = useNavigate()

  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  const startOAuth = (provider: 'google' | 'github') => {
    const apiUrl =
      import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

    window.location.href = `${apiUrl}/auth/${provider}`
  }

  const handleEmailAuth = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setAuthError('')
    setLoading(true)

    try {
      const endpoint = isRegister
        ? '/auth/register'
        : '/auth/login'

      const response = await apiClient.post(endpoint, {
        ...(isRegister ? { name } : {}),
        email: email.trim(),
        password,
      })

      const { user, token } = response.data

      window.localStorage.setItem(
        'codesync-session',
        JSON.stringify({
          state: {
            token,
          },
        }),
      )

      const uiUser = {
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
        provider: 'email' as const,
      }

      window.localStorage.setItem(
        'codesync-user',
        JSON.stringify(uiUser),
      )

      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      console.error('Email authentication failed:', error)

      setAuthError(
        error?.response?.data?.error ??
          'Authentication failed. Please check your details.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-backdrop" />

      <header className="auth-header page-frame">
        <Brand />
        <Link className="text-button" to="/">
          ← Back to home
        </Link>
      </header>

      <div className="auth-layout page-frame">
        <div className="auth-intro">
          <span className="eyebrow eyebrow--pill">
            <ShieldCheck size={13} /> Secure by default
          </span>

          <h1>
            {isRegister
              ? 'Open a room\nfor the whole team.'
              : 'Welcome back\nto the room.'}
          </h1>

          <p>
            One login for shared workspaces, live execution, and the commits
            that matter.
          </p>

          <div className="hero__proof">
            <div className="proof-avatars">
              <Avatar user={collaborators[1]} size="md" />
              <Avatar user={collaborators[2]} size="md" />
              <Avatar user={collaborators[3]} size="md" />

              <span className="avatar avatar--md avatar--add">
                <Plus size={15} />
              </span>
            </div>

            <div>
              <strong>12 active rooms</strong>
              <span>across your workspace</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card__head">
            <span className="auth-card__eyebrow">CODESYNC ACCOUNT</span>

            <h2>
              {isRegister
                ? 'Create your account'
                : 'Sign in to CodeSync'}
            </h2>

            <p>
              {isRegister
                ? 'Start with a private room. Invite the rest when you are ready.'
                : 'Your active rooms are waiting.'}
            </p>
          </div>

          <div className="auth-providers">
            <button
              className="provider-button"
              onClick={() => startOAuth('google')}
            >
              <span className="provider-mark provider-mark--google">
                G
              </span>
              Continue with Google
            </button>

            <button
              className="provider-button"
              onClick={() => startOAuth('github')}
            >
              <Github size={17} />
              Continue with GitHub
            </button>
          </div>

          <div className="or-divider">
            <span>or use email</span>
          </div>

          <form className="auth-form" onSubmit={handleEmailAuth}>
            {isRegister && (
              <label>
                Full name

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </label>
            )}

            <label>
              Email address

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
              />
            </label>

            <label>
              Password

              <div className="input-with-action">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />

                <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                    {showPassword ? (
                        <EyeOff size={18} />
                    ) : (
                        <Eye size={18} />
                    )}
                    </button>
              </div>
            </label>

            {isRegister && (
              <label className="terms-check">
                <input type="checkbox" defaultChecked />

                <span>
                  I agree to the <a href="#terms">room terms</a> and privacy
                  policy.
                </span>
              </label>
            )}

            {!isRegister && (
              <div className="auth-options">
                <label className="terms-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />

                  <span>Keep me signed in</span>
                </label>

                <a href="#reset">Forgot password?</a>
              </div>
            )}

            {authError && (
              <p className="auth-error">
                {authError}
              </p>
            )}

            <button
              className="button button--primary button--full"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Signing in...'
                : isRegister
                  ? 'Create account'
                  : 'Enter workspace'}

              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister
              ? 'Already have an account?'
              : 'New to CodeSync?'}

            {' '}

            <button onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Log in' : 'Create an account'}
            </button>
          </p>

          <div className="auth-card__foot">
            <LockKeyhole size={13} />
            Your data is encrypted in transit and at rest.
          </div>
        </div>
      </div>
    </main>
  )
}

function EyeIcon() {
  return (
    <span className="eye-icon">
      <Circle size={13} />
      <span />
    </span>
  )
}
