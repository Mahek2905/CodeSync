import { apiClient } from './apiClient'

export type LoginPayload = {
  email: string
  password: string
  remember: boolean
}

export type RegisterPayload = LoginPayload & {
  name: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

export type AuthResponse = {
  user: AuthUser
  token: string
}

export const authService = {
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload),

  me: () =>
    apiClient.get<{ user: AuthUser }>('/auth/me'),

  oauthUrl: (provider: 'google' | 'github') =>
    `/api/auth/${provider}`,

  logout: () =>
    apiClient.post('/auth/logout'),
}