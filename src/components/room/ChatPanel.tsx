import type { FormEvent } from 'react'
import { Radio, Send } from 'lucide-react'
import Avatar from '../common/Avatar'
import { currentUser } from '../../data'
import type { ChatMessage, User } from '../../types'

type ChatPanelProps = {
  chat: ChatMessage[]
  message: string
  setMessage: (value: string) => void
  onSend: (event: FormEvent) => void
  onlineUsers: User[]
}

export default function ChatPanel({
  chat,
  message,
  setMessage,
  onSend,
  onlineUsers,
}: ChatPanelProps) {
  return (
    <div className="chat-panel">
      <div className="chat-presence">
        <span className="eyebrow">ACTIVE NOW</span>

        <div className="presence-row">
          {onlineUsers.map((person) => (
            <div className="presence-person" key={person.id}>
              <Avatar
                user={{
                  id: person.id,
                  name: person.name,
                  email: person.email,
                  initials: person.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase(),
                  color: '#5eead4',
                  avatarUrl: person.avatarUrl ?? undefined,
                }}
                size="sm"
              />

              <span
                className="presence-online"
                style={{ background: '#5eead4' }}
              />

              <span>{person.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-divider">
        <span>Today</span>
      </div>

      <div className="chat-messages">
        {chat.map((item) => (
          <div
            className={`chat-message ${
              item.system ? 'chat-message--system' : ''
            }`}
            key={item.id}
          >
            {item.system ? (
              <>
                <span className="system-dot">
                  <Radio size={12} />
                </span>

                <span>{item.text}</span>

                <time>{item.time}</time>
              </>
            ) : (
              <>
                <Avatar
                  user={{
                    id: item.id,
                    name: item.author,
                    email: '',
                    initials: item.initials,
                    color: item.color,
                  }}
                  size="xs"
                />

                <div>
                  <div className="chat-message__meta">
                    <strong>
                      {item.author === currentUser.name
                        ? 'You'
                        : item.author}
                    </strong>

                    <time>{item.time}</time>
                  </div>

                  <p>{item.text}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form className="chat-compose" onSubmit={onSend}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Message the room…"
        />

        <button type="submit" aria-label="Send message">
          <Send size={14} />
        </button>

        <span className="chat-compose__hint">↵</span>
      </form>
    </div>
  )
}
