import type { LucideIcon } from 'lucide-react'

type FeatureCardProps = {
  icon: LucideIcon
  number: string
  title: string
  copy: string
  tone: string
}

export default function FeatureCard({
  icon: Icon,
  number,
  title,
  copy,
  tone,
}: FeatureCardProps) {
  return (
    <article className={`feature-card feature-card--${tone}`}>
      <div className="feature-card__top">
        <span className="feature-icon">
          <Icon size={17} />
        </span>

        <span>{number}</span>
      </div>

      <h3>{title}</h3>
      <p>{copy}</p>

      <span className="feature-card__rule" />
    </article>
  )
}