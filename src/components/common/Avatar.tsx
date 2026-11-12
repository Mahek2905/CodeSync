import type { User } from '../../types'

type AvatarProps = {
  user: User
  size?: 'xs' | 'sm' | 'md'
}

export default function Avatar({
  user,
  size = 'md',
}: AvatarProps) {
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ background: user.color }}
      title={user.name}
    >
      {user.initials}
    </span>
  )
}