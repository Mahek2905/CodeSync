import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const raw = window.localStorage.getItem('codesync-session')
  if (raw) {
    try {
      const session = JSON.parse(raw) as { state?: { token?: string } }
      if (session.state?.token) config.headers.Authorization = `Bearer ${session.state.token}`
    } catch {
      // Ignore an invalid preview session and let the API return its normal auth response.
    }
  }
  return config
})

export const healthApi = {
  get: () => apiClient.get<{ status: string }>('/health'),
}
