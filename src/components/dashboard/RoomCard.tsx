import { useState, type CSSProperties } from 'react'
import {
  ExternalLink,
  GitBranch,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'

import Avatar from '../common/Avatar'
import { collaborators } from '../../data'
import type { Room } from '../../types'

type RoomCardProps = {
  room: Room
  featured?: boolean
  onOpen: () => void
  onDelete: () => void
}

export default function RoomCard({
  room,
  featured,
  onOpen,
  onDelete,
}: RoomCardProps) {
  const [menu, setMenu] = useState(false)

  return (
    <article
      className={`room-card ${featured ? 'room-card--featured' : ''}`}
      style={{ '--room-accent': room.accent } as React.CSSProperties}
    >
      <div className="room-card__glow" />

      <div className="room-card__head">
        <span className="room-card__code">
          <span className="iris-square" />
          {room.id}
        </span>

        <button
          className="icon-button icon-button--small"
          onClick={() => setMenu(!menu)}
        >
          <MoreHorizontal size={16} />
        </button>

        {menu && (
          <div className="room-menu">
            <button onClick={onOpen}>
              <ExternalLink size={14} />
              Open room
            </button>

            <button onClick={onDelete}>
              <Trash2 size={14} />
              Delete room
            </button>
          </div>
        )}
      </div>

      <button className="room-card__body" onClick={onOpen}>
        <div className="room-card__title">
          <h3>{room.name}</h3>

          {featured && (
            <span className="room-live">
              <span className="live-dot" />
              Live
            </span>
          )}
        </div>

        <p>{room.description}</p>

        <div className="room-code-line">
          <GitBranch size={13} />
          {room.branch}
        </div>
      </button>

      <div className="room-card__footer">
        <div className="room-members">
          {collaborators.slice(0, room.members).map((person) => (
            <Avatar
              key={person.id}
              user={person}
              size="xs"
            />
          ))}

          <span className="room-member-count">
            {room.members} online
          </span>
        </div>

        <span className="room-card__time">
          {room.updatedAt}
        </span>
      </div>
    </article>
  )
}