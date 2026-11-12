import { Link } from 'react-router-dom'

type BrandProps = {
  compact?: boolean
}

export default function Brand({ compact = false }: BrandProps) {
  return (
    <Link className={`brand ${compact ? 'brand--compact' : ''}`} to="/">
      <span className="brand__mark"><span /></span>
      <span className="brand__word">code<span>sync</span></span>
      {!compact && <span className="brand__tag">ROOMS</span>}
    </Link>
  )
}