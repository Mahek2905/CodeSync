
import {
  FileCode2,
  GitBranch,
  Play,
  UserPlus,
} from 'lucide-react'
import { recentActivity } from '../../data'

export default function ActivityPanel() {
  return (
    <div className="activity-panel">
      {recentActivity.map((item) => (
        <div className="activity-item" key={item.text}>
          <span
            className="activity-icon"
            style={{ color: item.color }}
          >
            {item.icon === 'file' ? (
              <FileCode2 size={14} />
            ) : item.icon === 'branch' ? (
              <GitBranch size={14} />
            ) : item.icon === 'join' ? (
              <UserPlus size={14} />
            ) : (
              <Play size={14} />
            )}
          </span>

          <div>
            <strong>{item.text}</strong>
            <time>{item.time} ago</time>
          </div>
        </div>
      ))}
    </div>
  )
}
