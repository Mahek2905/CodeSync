export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'json'
  | 'markdown'
  | 'html'
  | 'css'
  | 'sql'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'

export type FileNode = {
  id: string
  name: string
  kind: 'file' | 'folder'
  language?: Language
  parentId?: string
  content?: string
  modified?: boolean
  path?: string
  version?: number
}

export type User = {
  id: string
  name: string
  email: string
  initials: string
  color: string
  avatarUrl?: string
  provider?: 'email' | 'google' | 'github'
}

export type Room = {
  id: string
  name: string
  description: string
  branch: string
  language: Language
  files: number
  members: number
  updatedAt: string
  accent: string
}

export type ChatMessage = {
  id: string
  author: string
  initials: string
  time: string
  text: string
  color: string
  system?: boolean
}

export type ExecutionState = {
  status: 'idle' | 'running' | 'success' | 'error'
  duration: string
  output: string
  error: string
}
