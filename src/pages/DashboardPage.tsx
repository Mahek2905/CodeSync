import { useEffect, useState, type FormEvent, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CircleCheck,
  Code2,
  Hash,
  LayoutDashboard,
  Plus,
  Users,
  X,
  Zap,
} from 'lucide-react'

import type { Room, User } from '../types'
import { apiClient } from '../services/apiClient'
import StatCard from '../components/common/StatCard'
import DashboardTopbar from '../components/dashboard/DashboardTopbar'
import RoomCard from '../components/dashboard/RoomCard'

type DashboardPageProps = {
  user: User
  onLogout: () => void
}

export default function DashboardPage({
  user,
  onLogout,
}: DashboardPageProps) {
  const navigate = useNavigate()

  const [createOpen, setCreateOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [joinId, setJoinId] = useState('')

  const [roomsState, setRoomsState] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)

  const [toast, setToast] = useState('')

  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  const dayName = currentDateTime.toLocaleDateString('en-IN', {
    weekday: 'long',
  })

  const dateNumber = currentDateTime.toLocaleDateString('en-IN', {
    day: '2-digit',
  })

  const monthName = currentDateTime.toLocaleDateString('en-IN', {
    month: 'long',
  })

  const year = currentDateTime.getFullYear()

  const currentTime = currentDateTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  // Live clock
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  // Fetch rooms
  useEffect(() => {
    const loadRooms = async () => {
      try {
        setRoomsLoading(true)

        const response = await apiClient.get('/rooms')

        const apiRooms = response.data as Array<{
          id: string
          slug: string
          name: string
          description: string
          branch: string
          members: number
          files: number
          updatedAt: string
          ownerId: string
        }>

        const mappedRooms: Room[] = apiRooms.map((room) => ({
          id: room.id,
          name: room.name,
          description: room.description,
          branch: room.branch,
          language: 'typescript',
          files: room.files,
          members: room.members,
          updatedAt: new Date(room.updatedAt).toLocaleDateString(),
          accent: '#8b7cff',
        }))

        setRoomsState(mappedRooms)
      } catch (error) {
        console.error('Failed to load rooms:', error)

        setToast('Could not load your rooms')
        window.setTimeout(() => setToast(''), 2600)
      } finally {
        setRoomsLoading(false)
      }
    }

    loadRooms()
  }, [])

  // Create room
  const createRoom = async (event: FormEvent) => {
    event.preventDefault()

    const name = roomName.trim()

    if (!name) {
      setToast('Enter a room name')
      window.setTimeout(() => setToast(''), 2600)
      return
    }

    try {
      const response = await apiClient.post('/rooms', {
        name,
        description: 'A fresh collaborative coding room.',
        branch: 'main',
      })

      const room = response.data

      const mappedRoom: Room = {
        id: room.id,
        name: room.name,
        description: room.description,
        branch: room.branch,
        language: 'typescript',
        files: room.files,
        members: room.members,
        updatedAt: new Date(room.updatedAt).toLocaleDateString(),
        accent: '#8b7cff',
      }

      setRoomsState((current) => [mappedRoom, ...current])

      setCreateOpen(false)
      setRoomName('')

      setToast(`Room "${room.name}" created`)

      window.setTimeout(() => setToast(''), 2600)
    } catch (error) {
      console.error('Failed to create room:', error)

      setToast('Could not create room')
      window.setTimeout(() => setToast(''), 2600)
    }
  }

  // Join room
  const joinRoom = async (event: FormEvent) => {
    event.preventDefault()

    const requestedId = joinId.trim()

    if (!requestedId) {
      setToast('Enter a room ID')
      window.setTimeout(() => setToast(''), 2600)
      return
    }

    try {
      setToast('Joining room…')

      await apiClient.post(`/rooms/${requestedId}/join`)

      setJoinId('')

      navigate(`/rooms/${requestedId}`)
    } catch (error: any) {
      console.error('Failed to join room:', error)

      const status = error?.response?.status
      const code = error?.response?.data?.error

      if (status === 401) {
        setToast('Please log in again before joining a room')
      } else if (status === 404 || code === 'room_not_found') {
        setToast('Room not found — check the Room ID')
      } else {
        setToast('Could not join room')
      }

      window.setTimeout(() => setToast(''), 2600)
    }
  }

  // Delete room
  const deleteRoom = async (id: string) => {
    try {
      await apiClient.delete(`/rooms/${id}`)

      setRoomsState((current) =>
        current.filter((room) => room.id !== id),
      )

      setToast('Room deleted')
      window.setTimeout(() => setToast(''), 2600)
    } catch (error) {
      console.error('Failed to delete room:', error)

      setToast('Could not delete room')
      window.setTimeout(() => setToast(''), 2600)
    }
  }

  return (
    <main className="dashboard-page">
      <DashboardTopbar user={user} onLogout={onLogout} />

      <div className="dashboard-layout">
        {/* <DashboardRail /> */}

        <section className="dashboard-main">
          <div className="dashboard-heading">
            <div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {dayName}
                </span>

                <span className="text-2xl font-semibold">
                  {dateNumber} {monthName}, {year}
                </span>

                <span className="text-sm text-muted-foreground">
                  {currentTime}
                </span>
              </div>

              <h1>
                Good morning, {user.name.split(' ')[0]}{' '}
                <span className="heading-spark">✦</span>
              </h1>

              <p>Pick up where your team left off.</p>
            </div>

            <div className="dashboard-actions">
              <form className="join-form" onSubmit={joinRoom}>
                <Hash size={15} />

                <input
                  aria-label="Room ID"
                  placeholder="Room ID"
                  value={joinId}
                  onChange={(event) => setJoinId(event.target.value)}
                />

                <button type="submit">
                  Join <ArrowRight size={14} />
                </button>
              </form>

              <button
                className="button button--primary"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={16} /> New room
              </button>
            </div>
          </div>

          <div className="dashboard-stats">
            <StatCard
              label="Active rooms"
              value={String(roomsState.length).padStart(2, '0')}
              detail="your workspace"
              tone="iris"
              icon={LayoutDashboard}
            />

            <StatCard
              label="Collaborators"
              value={String(
                roomsState.reduce(
                  (total, room) => total + room.members,
                  0,
                ),
              ).padStart(2, '0')}
              detail="across your rooms"
              tone="mint"
              icon={Users}
            />

            {/* <StatCard
              label="Runs this week"
              value="142"
              detail="98.7% passed"
              tone="amber"
              icon={Play}
            /> */}

            {/* <StatCard
              label="GitHub sync"
              value="ON"
              detail="orbital-console"
              tone="rose"
              icon={GitBranch}
            /> */}
          </div>

          <div className="section-row">
            <div>
              <span className="eyebrow">Your rooms</span>
              <h2>Keep the loop moving.</h2>
            </div>

            {/* <button className="inline-action">
              View activity <ArrowRight size={14} />
            </button> */}
          </div>

          <div className="room-grid">
            {roomsLoading ? (
              <div className="room-loading">
                Loading your rooms…
              </div>
            ) : (
              roomsState.map((room, index) => (
                <RoomCard
                  room={room}
                  key={room.id}
                  featured={index === 0}
                  onOpen={() => navigate(`/rooms/${room.id}`)}
                  onDelete={() => deleteRoom(room.id)}
                />
              ))
            )}

            <button
              className="empty-room-card"
              onClick={() => setCreateOpen(true)}
            >
              <span className="empty-room-card__icon">
                <Plus size={20} />
              </span>

              <strong>Make a new room</strong>
              <span>Give an idea a shared address.</span>
            </button>
          </div>

          <div className="dashboard-bottom">
            {/* Existing activity and tip sections remain intentionally commented out. */}
          </div>
        </section>
      </div>

      {createOpen && (
        <div className="modal-backdrop">
          <form className="modal-card" onSubmit={createRoom}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setCreateOpen(false)}
            >
              <X size={17} />
            </button>

            <span className="feature-icon feature-icon--iris">
              <Code2 size={17} />
            </span>

            <span className="eyebrow">NEW COLLABORATIVE ROOM</span>

            <h2>Give the idea a room.</h2>

            <p>
              A private workspace with live editing, execution, and GitHub
              sync ready when you are.
            </p>

            <label>
              Room name
              <input
                autoFocus
                placeholder="e.g. checkout-rebuild"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
              />
            </label>

            <div className="modal-row">
              <span>
                <CircleCheck size={14} /> Private by default
              </span>

              <span>
                <Zap size={14} /> Run in the room
              </span>
            </div>

            <button
              className="button button--primary button--full"
              type="submit"
            >
              Create room <ArrowRight size={16} />
            </button>
          </form>
        </div>
      )}

      {toast && (
        <div className="toast">
          <CircleCheck size={16} /> {toast}
        </div>
      )}
    </main>
  )
}