import {
    Bell,
    LogOut,
    Search,
  } from 'lucide-react'
  
  import Brand from '../common/Brand'
  import Avatar from '../common/Avatar'
  import type { User } from '../../types'
  
  type DashboardTopbarProps = {
    user: User
    onLogout: () => void
  }
  
  export default function DashboardTopbar({
    user,
    onLogout,
  }: DashboardTopbarProps) {
    return (
      <header className="dashboard-topbar">
        <Brand compact />
  
        <div className="topbar-center">
          <span className="topbar-search">
            <Search size={15} />
            <span>Search rooms, files, people</span>
            <kbd>⌘ K</kbd>
          </span>
        </div>
  
        <div className="topbar-actions">
          <span className="topbar-status">
            <span className="live-dot" />
            All systems normal
          </span>
  
          <button className="icon-button">
            <Bell size={17} />
          </button>
  
          <button className="avatar-button" title={user.name}>
            <Avatar user={user} size="sm" />
          </button>
  
          <button
            className="icon-button"
            onClick={onLogout}
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
    )
  }