import { io, type Socket } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

const SOCKET_URL = API_URL.replace(/\/api\/?$/, '')

export function createSocket(): Socket {
  const raw = window.localStorage.getItem('codesync-session')

  let token: string | null = null

  if (raw) {
    try {
      const session = JSON.parse(raw) as {
        state?: {
          token?: string
        }
      }

      token = session.state?.token ?? null
    } catch {
      token = null
    }
  }

  return io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket'],
  })
}