import { io, type Socket } from 'socket.io-client'
import type { FileNode, Language, User } from '../types'

export type RoomEvents = {
  'room:join': (payload: { roomId: string; user: User }) => void
  'room:leave': (payload: { roomId: string; userId: string }) => void
  'file:change': (payload: { roomId: string; fileId: string; content: string; version: number }) => void
  'file:sync': (payload: { roomId: string; files: FileNode[] }) => void
  'cursor:move': (payload: { roomId: string; fileId: string; userId: string; line: number; column: number }) => void
  'language:change': (payload: { roomId: string; fileId: string; language: Language }) => void
  'chat:message': (payload: { roomId: string; text: string }) => void
}

export function createRealtimeSocket(): Socket<RoomEvents, RoomEvents> {
  return io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { autoConnect: false, transports: ['websocket'] })
}
