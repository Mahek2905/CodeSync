import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  detail: string
  tone: string
  icon: LucideIcon
}

export default function StatCard({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span>{label}</span>
        <Icon size={16} />
      </div>

      <strong>{value}</strong>

      <span className="stat-card__detail">
        <span className="stat-dot" /> {detail}
      </span>
    </div>
  )
}