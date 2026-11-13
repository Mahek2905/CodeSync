import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import type { Socket } from 'socket.io-client'

import {
ChevronDown,
ChevronRight,
CircleAlert,
CircleCheck,
CircleDot,
Ellipsis,
FileCode2,
FilePlus2,
FolderInput,
FolderPlus,
GitBranch,
GitCommitHorizontal,
LogOut,
MessageSquare,
MoreHorizontal,
PanelLeftClose,
PanelRightClose,
Pencil,
Play,
Plus,
Search,
Share2,
Terminal,
Trash2,
Users,
Wifi,
X,
type LucideIcon,
} from 'lucide-react'

import type {
  ChatMessage,
  FileNode,
  Language,
  Room,
  User,
} from '../types'

import { apiClient } from '../services/apiClient'
import { createSocket } from '../services/socket'
import { githubService, GithubRepository } from '../services/githubService'
import { executionService } from '../services/executionService'

import Avatar from '../components/common/Avatar'
import Brand from '../components/common/Brand'

import TreeNode from '../components/room/TreeNode'
import OutputPanel from '../components/room/OutputPanel'
import TerminalPanel from '../components/room/TerminalPanel'
import ChatPanel from '../components/room/ChatPanel'
import ActivityPanel from '../components/room/ActivityPanel'
import GithubModal from '../components/room/GithubModal'

import { languageMeta } from '../constants/languageMeta'

type SearchMatch = {
    line: number
    content: string
  }

type SearchResult = {
    id: string
    name: string
    path: string
    matches: SearchMatch[]
    matchedInPath: boolean
    totalMatches: number
  }

export default function RoomPage({ user, onLogout }: { user: User; onLogout: () => void }) {
    const { roomId } = useParams()
    const [room, setRoom] = useState<Room | null>(null)
    const [files, setFiles] = useState<FileNode[]>([])
    const [activeFileId, setActiveFileId] = useState('')

    const [createDialog, setCreateDialog] = useState<{
      open: boolean
      kind: 'file' | 'folder'
      parentId: string | null
    }>({
      open: false,
      kind: 'file',
      parentId: null,
    })

    const [createName, setCreateName] = useState('')

    const [renameDialog, setRenameDialog] = useState<{
      open: boolean
      nodeId: string | null
      name: string
    }>({
      open: false,
      nodeId: null,
      name: '',
    })

    const [moveDialog, setMoveDialog] = useState<{
      open: boolean
      nodeId: string | null
      targetFolderId: string | null
    }>({
      open: false,
      nodeId: null,
      targetFolderId: null,
    })

    const [socket, setSocket] = useState<Socket | null>(null)
    const [onlineUsers, setOnlineUsers] = useState<User[]>([])
    const [loadingRoom, setLoadingRoom] = useState(true)
    const [saveState, setSaveState] = useState('Saved just now')
    const [bottomTab, setBottomTab] = useState<'terminal' | 'output' | 'problems'>('output')
    const [sideTab, setSideTab] = useState<'chat' | 'activity'>('chat')
    const [message, setMessage] = useState('')
    const [chat, setChat] = useState<ChatMessage[]>([])
    const [execution, setExecution] =
    useState<'idle' | 'running' | 'success' | 'error'>('idle')

    const [executionResult, setExecutionResult] = useState<any>(null)
    const [input, setInput] = useState('orbit-telemetry\n--verbose')
    const [showExplorer, setShowExplorer] = useState(true)
    const [showCollab, setShowCollab] = useState(true)
    const [showGithub, setShowGithub] = useState(false)
    const [githubRepo, setGithubRepo] = useState('')
    const [githubRepositories, setGithubRepositories] = useState<GithubRepository[]>([])
    const [loadingRepositories, setLoadingRepositories] = useState(false)
    const [commitMessage, setCommitMessage] = useState('Update workspace')
    const [isCommitting, setIsCommitting] = useState(false)

    const [cursorPosition, setCursorPosition] = useState({
        line: 1,
        column: 1,
      })

    const [toast, setToast] = useState('')

    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState('')

    const editorRef = useRef<any>(null)

    const [pendingSearchMatch, setPendingSearchMatch] = useState<{
        fileId: string
        line: number
    } | null>(null)

    useEffect(() => {
      if (!roomId) return

      const loadRoom = async () => {
        try {
          setLoadingRoom(true)

          const response = await apiClient.get(`/rooms/${roomId}`)
          const data = response.data

          setRoom(data)

          const messagesResponse = await apiClient.get(
            `/rooms/${roomId}/messages`,
          )

          const savedMessages = messagesResponse.data.map((item: any) => ({
            id: item.id,
            author: item.user?.name ?? 'Unknown user',
            initials: (item.user?.name ?? 'U')
              .split(' ')
              .map((part: string) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            color: '#5eead4',
            text: item.body,
            time: new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            system: false,
          }))

          setChat(savedMessages)

          const folderNodes: FileNode[] = (data.folders ?? []).map((folder: any) => ({
            id: folder.id,
            name: folder.name,
            kind: 'folder',
            parentId: folder.parentId ?? undefined,
          }))

          const fileNodes: FileNode[] = (data.files ?? []).map((file: any) => ({
            ...file,
            kind: 'file',
            parentId: file.folderId ?? undefined,
            language:
              file.language === 'javascript' ||
              file.language === 'typescript' ||
              file.language === 'python' ||
              file.language === 'rust' ||
              file.language === 'json' ||
              file.language === 'markdown' ||
              file.language === 'html' ||
              file.language === 'css' ||
              file.language === 'sql' ||
              file.language === 'java' ||
              file.language === 'cpp' ||
              file.language === 'c' ||
              file.language === 'go'
                ? file.language
                : 'markdown',
            modified: false,
          }))

          setFiles([...folderNodes, ...fileNodes])

          if (data.files?.length > 0) {
            setActiveFileId(data.files[0].id)
          }
        } catch (error) {
          console.error('Failed to load room:', error)
          setToast('Failed to load room')
        } finally {
          setLoadingRoom(false)
        }
      }

      loadRoom()
    }, [roomId])

    useEffect(() => {
      if (!roomId) return

      const nextSocket = createSocket()

      setSocket(nextSocket)

      nextSocket.on('connect', () => {
        console.log('CodeSync Socket connected:', nextSocket.id)

        nextSocket.emit('room:join', {
          roomId,
        })
      })

      nextSocket.on('connect_error', (error) => {
        console.error('CodeSync Socket connection failed:', error.message)
      })

      nextSocket.on('room:error', (payload) => {
        console.error('CodeSync room error:', payload)
      })

      nextSocket.on(
        'room:presence',
        (payload: {
          roomId: string
          users: User[]
        }) => {
          if (payload.roomId !== roomId) return

          setOnlineUsers(payload.users)

          console.log(
            'CodeSync room presence:',
            payload.users.map((person) => person.name),
          )
        },
      )

      nextSocket.on(
        'file:change',
        (payload: {
          roomId: string
          fileId: string
          content: string
          version: number
          userId: string
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) =>
            current.map((file) =>
              file.id === payload.fileId
                ? {
                    ...file,
                    content: payload.content,
                    version: payload.version,
                    modified: false,
                  }
                : file,
            ),
          )
        },
      )

      nextSocket.on(
        'language:change',
        (payload: {
          roomId: string
          fileId: string
          language: Language
          userId: string
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) =>
            current.map((file) =>
              file.id === payload.fileId
                ? {
                    ...file,
                    language: payload.language,
                  }
                : file,
            ),
          )
        },
      )

      nextSocket.on(
        'file:create',
        (payload: {
          roomId: string
          file: FileNode
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) => {
            // Prevent duplicates
            if (
              current.some(
                (file) => file.id === payload.file.id,
              )
            ) {
              return current
            }

            return [
              ...current,
              {
                ...payload.file,
                kind: 'file',
                parentId:
                  payload.file.parentId ?? undefined,
                modified: false,
              },
            ]
          })
        },
      )

      nextSocket.on(
        'folder:create',
        (payload: {
          roomId: string
          folder: FileNode
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) => {
            // Prevent duplicates
            if (
              current.some(
                (file) =>
                  file.id === payload.folder.id,
              )
            ) {
              return current
            }

            return [
              ...current,
              {
                ...payload.folder,
                kind: 'folder',
                parentId:
                  payload.folder.parentId ?? undefined,
              },
            ]
          })
        },
      )

      nextSocket.on(
        'chat:message',
        (payload: {
          roomId: string
          userId: string
          author: string
          avatarUrl: string | null
          text: string
        }) => {
          if (payload.roomId !== roomId) return

          setChat((current) => [
            ...current,
            {
              id: `message-${Date.now()}-${payload.userId}`,
              author: payload.author,
              initials: payload.author
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase(),
              time: 'now',
              text: payload.text,
              color: '#5eead4',
            },
          ])
        },
      )

      nextSocket.on(
        'file:delete',
        (payload: {
          roomId: string
          fileId: string
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) =>
            current.filter(
              (file) => file.id !== payload.fileId,
            ),
          )

          setActiveFileId((currentActiveId) =>
            currentActiveId === payload.fileId
              ? ''
              : currentActiveId,
          )
        },
      )

      nextSocket.on(
        'folder:delete',
        (payload: {
          roomId: string
          folderId: string
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) => {
            const deletedFolderIds = new Set<string>()

            const collectChildren = (
              folderId: string,
            ) => {
              deletedFolderIds.add(folderId)

              current
                .filter(
                  (file) =>
                    file.kind === 'folder' &&
                    file.parentId === folderId,
                )
                .forEach((child) =>
                  collectChildren(child.id),
                )
            }

            collectChildren(payload.folderId)

            return current
              .filter(
                (file) =>
                  !(
                    file.kind === 'folder' &&
                    deletedFolderIds.has(file.id)
                  ),
              )
              .map((file) =>
                file.parentId &&
                deletedFolderIds.has(file.parentId)
                  ? {
                      ...file,
                      parentId: undefined,
                    }
                  : file,
              )
          })
        },
      )

      nextSocket.on(
        'file:rename',
        (payload: {
          roomId: string
          file: {
            id: string
            name: string
            path: string
          }
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) =>
            current.map((file) =>
              file.id === payload.file.id
                ? {
                    ...file,
                    name: payload.file.name,
                    path: payload.file.path,
                  }
                : file,
            ),
          )
        },
      )

      nextSocket.on(
        'folder:rename',
        (payload: {
          roomId: string
          folder: {
            id: string
            name: string
          }
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) =>
            current.map((file) =>
              file.id === payload.folder.id
                ? {
                    ...file,
                    name: payload.folder.name,
                  }
                : file,
            ),
          )
        },
      )

      nextSocket.on(
        'file:move',
        (payload: {
          roomId: string
          file: {
            id: string
            folderId: string | null
            parentId?: string
            path: string
          }
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) =>
            current.map((file) =>
              file.id === payload.file.id
                ? {
                    ...file,
                    folderId:
                      payload.file.folderId,
                    parentId:
                      payload.file.folderId ??
                      undefined,
                    path: payload.file.path,
                  }
                : file,
            ),
          )
        },
      )

      nextSocket.on(
        'folder:move',
        (payload: {
          roomId: string
          folder: {
            id: string
            parentId: string | null
          }
          files: Array<{
            id: string
            folderId: string | null
            path: string
          }>
        }) => {
          if (payload.roomId !== roomId) return

          setFiles((current) =>
            current.map((file) => {
              if (file.id === payload.folder.id) {
                return {
                  ...file,
                  parentId:
                    payload.folder.parentId ??
                    undefined,
                }
              }

              const updatedFile =
                payload.files.find(
                  (item) => item.id === file.id,
                )

              if (!updatedFile) {
                return file
              }

              return {
                ...file,
                parentId:
                  updatedFile.folderId ??
                  undefined,
                path: updatedFile.path,
              }
            }),
          )
        },
      )

      return () => {
        nextSocket.emit('room:leave', {
          roomId,
        })

        nextSocket.disconnect()
        setSocket(null)
        setOnlineUsers([])
      }
    }, [roomId])

    useEffect(() => {
      const modifiedFiles = files.filter((file) => file.modified)

      if (modifiedFiles.length === 0) return

      const timer = window.setTimeout(async () => {
        try {
          await Promise.all(
            modifiedFiles.map((file) =>
              apiClient.patch(
                `/rooms/${roomId}/files/${file.id}`,
                {
                  content: file.content,
                  language: file.language,
                },
              ),
            ),
          )

          setFiles((current) =>
            current.map((file) =>
              modifiedFiles.some((changed) => changed.id === file.id)
                ? { ...file, modified: false }
                : file,
            ),
          )

          setSaveState('Saved just now')
        } catch (error) {
          console.error('Autosave failed:', error)
          setSaveState('Save failed')
        }
      }, 700)

      return () => window.clearTimeout(timer)
    }, [files, roomId])

    useEffect(() => {
        const query = searchQuery.trim()

        if (!showSearch || !roomId || !query) {
          setSearchResults([])
          setSearchLoading(false)
          setSearchError('')
          return
        }

        let cancelled = false

        const timer = window.setTimeout(async () => {
          try {
            setSearchLoading(true)
            setSearchError('')

            const response = await apiClient.get(
              `/rooms/${roomId}/search`,
              {
                params: { q: query },
              },
            )

            if (!cancelled) {
              setSearchResults(response.data.results ?? [])
            }
          } catch (error) {
            if (!cancelled) {
              console.error('Workspace search failed:', error)
              setSearchResults([])
              setSearchError('Unable to search this workspace.')
            }
          } finally {
            if (!cancelled) {
              setSearchLoading(false)
            }
          }
        }, 300)

        return () => {
          cancelled = true
          window.clearTimeout(timer)
        }
    }, [searchQuery, showSearch, roomId])

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            event.shiftKey &&
            event.key.toLowerCase() === 'f'
          ) {
            event.preventDefault()
            setShowExplorer(true)
            setShowSearch(true)
          }
        }

        window.addEventListener('keydown', handleShortcut)

        return () => {
          window.removeEventListener('keydown', handleShortcut)
        }
    }, [])

    useEffect(() => {
        setCursorPosition({ line: 1, column: 1 })
      }, [activeFileId])

    const activeFile =
        files.find(
            (file) => file.id === activeFileId && file.kind === 'file',
    ) ?? files.find((file) => file.kind === 'file')

    const breadcrumbs = (() => {
        if (!activeFile) return []

        const folders: string[] = []
        let parentId = activeFile.parentId

        while (parentId) {
            const parentFolder = files.find(
                (file) => file.id === parentId && file.kind === 'folder'
            )

            if (!parentFolder) break

            folders.unshift(parentFolder.name)
            parentId = parentFolder.parentId
        }

        return [...folders, activeFile.name]
    })()

    useEffect(() => {
        if (
            !pendingSearchMatch ||
            pendingSearchMatch.fileId !== activeFileId ||
            !editorRef.current
        ) {
            return
        }

        const editor = editorRef.current

        editor.revealLineInCenter(pendingSearchMatch.line)

        editor.setPosition({
            lineNumber: pendingSearchMatch.line,
            column: 1,
        })

        editor.focus()

        setPendingSearchMatch(null)
    }, [activeFileId, pendingSearchMatch])

    const activeLanguage = activeFile?.language ?? 'typescript'

    const canGithub = user.provider === 'github'

    const editorLanguageMap: Record<Language, string> = {
      typescript: 'typescript',
      javascript: 'javascript',
      python: 'python',
      rust: 'rust',
      json: 'json',
      markdown: 'markdown',
      html: 'html',
      css: 'css',
      sql: 'sql',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
    }

    const editorLanguage = editorLanguageMap[activeLanguage] ?? 'plaintext'

    const fileTree = useMemo(
      () => files.filter((file) => !file.parentId),
      [files],
    )

    if (loadingRoom) {
      return (
        <main className="room-page">
          <div className="empty-panel">
            <CircleDot size={24} />
            <strong>Loading room…</strong>
            <span>Fetching your workspace from PostgreSQL.</span>
          </div>
        </main>
      )
    }

    if (!room) {
      return (
        <main className="room-page">
          <div className="empty-panel">
            <CircleAlert size={24} />
            <strong>Room not found</strong>
            <span>
              This workspace does not exist or you don't have access to it.
            </span>
          </div>
        </main>
      )
    }

    if (!activeFile) {
      return (
        <main className="room-page">
          <div className="empty-panel">
            <FileCode2 size={24} />
            <strong>No files in this room</strong>
            <span>Create a file to start coding.</span>
          </div>
        </main>
      )
    }

    const updateFile = (value: string) => {
      setFiles((current) =>
        current.map((file) =>
          file.id === activeFileId
            ? {
                ...file,
                content: value,
                modified: true,
              }
            : file,
        ),
      )

      setSaveState('Saving…')

      if (socket?.connected && roomId && activeFileId) {
        const currentFile = files.find(
          (file) => file.id === activeFileId,
        )

        socket.emit('file:change', {
          roomId,
          fileId: activeFileId,
          content: value,
          version: (currentFile?.version ?? 1) + 1,
        })
      }
    }

    const updateLanguage = (language: Language) => {
      setFiles((current) =>
        current.map((file) =>
          file.id === activeFileId
            ? {
                ...file,
                language,
                modified: true,
              }
            : file,
        ),
      )

      if (socket?.connected && roomId && activeFileId) {
        socket.emit('language:change', {
          roomId,
          fileId: activeFileId,
          language,
        })
      }

      setSaveState('Saving…')
    }

    const openCreateDialog = (
      kind: 'file' | 'folder',
      parentId: string | null = null,
    ) => {
      setCreateName('')
      setCreateDialog({
        open: true,
        kind,
        parentId,
      })
    }

    const closeCreateDialog = () => {
      setCreateDialog({
        open: false,
        kind: 'file',
        parentId: null,
      })
      setCreateName('')
    }

    const createNode = async () => {
      const name = createName.trim()

      if (!name) {
        setToast(
          createDialog.kind === 'file'
            ? 'Enter a file name'
            : 'Enter a folder name',
        )
        return
      }

      try {
        setToast(`Creating ${createDialog.kind}…`)

        if (createDialog.kind === 'folder') {
          const response = await apiClient.post(
            `/rooms/${roomId}/folders`,
            {
              name,
              parentId: createDialog.parentId,
            },
          )

          const folder = response.data

          setFiles((current) => [
            ...current,
            {
              id: folder.id,
              name: folder.name,
              kind: 'folder',
              parentId: folder.parentId ?? undefined,
            },
          ])

          if (socket?.connected && roomId) {
            socket.emit('folder:create', {
              roomId,
              folder: {
                id: folder.id,
                name: folder.name,
                parentId: folder.parentId ?? undefined,
              },
            })
          }

          setToast(`${folder.name} created`)
        } else {
          const extension = name.includes('.')
            ? name.split('.').pop()?.toLowerCase()
            : 'typescript'

          const languageMap: Record<string, Language> = {
            ts: 'typescript',
            tsx: 'typescript',
            js: 'javascript',
            jsx: 'javascript',
            py: 'python',
            rs: 'rust',
            json: 'json',
            md: 'markdown',
            html: 'html',
            css: 'css',
            sql: 'sql',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            go: 'go',
          }

          const language =
            languageMap[extension ?? ''] ?? 'typescript'

          const response = await apiClient.post(
            `/rooms/${roomId}/files`,
            {
              name,
              path: createDialog.parentId
                ? `${createDialog.parentId}/${name}`
                : name,
              language,
              content: '',
              folderId: createDialog.parentId,
            },
          )

          const file = response.data

          const newFile: FileNode = {
            ...file,
            kind: 'file',
            parentId: file.folderId ?? undefined,
            language,
            modified: false,
          }

          setFiles((current) => [...current, newFile])
          setActiveFileId(file.id)

          if (socket?.connected && roomId) {
            socket.emit('file:create', {
              roomId,
              file: newFile,
            })
          }

          setToast(`${file.name} created`)
        }

        closeCreateDialog()

        window.setTimeout(() => setToast(''), 2200)
      } catch (error: any) {
        console.error(
          `Failed to create ${createDialog.kind}:`,
          error,
        )

        setToast(
          error?.response?.data?.error ??
            `Failed to create ${createDialog.kind}`,
        )

        window.setTimeout(() => setToast(''), 2600)
      }
    }

    const deleteNode = async (id: string) => {
      const node = files.find((file) => file.id === id)

      if (!node) return

      try {
        setToast(`Deleting ${node.name}…`)

        if (node.kind === 'folder') {
          await apiClient.delete(
            `/rooms/${roomId}/folders/${node.id}`,
          )

          if (socket?.connected && roomId) {
            socket.emit('folder:delete', {
              roomId,
              folderId: node.id,
            })
          }

          const folderIdsToRemove = new Set<string>()

          const collectFolderIds = (folderId: string) => {
            folderIdsToRemove.add(folderId)

            files
              .filter(
                (file) =>
                  file.kind === 'folder' &&
                  file.parentId === folderId,
              )
              .forEach((child) =>
                collectFolderIds(child.id),
              )
          }

          collectFolderIds(node.id)

          setFiles((current) =>
            current
              .filter(
                (file) =>
                  !(
                    file.kind === 'folder' &&
                    folderIdsToRemove.has(file.id)
                  ),
              )
              .map((file) =>
                file.parentId &&
                folderIdsToRemove.has(file.parentId)
                  ? {
                      ...file,
                      parentId: undefined,
                    }
                  : file,
              ),
          )
        } else {
          await apiClient.delete(
            `/rooms/${roomId}/files/${node.id}`,
          )

          if (socket?.connected && roomId) {
            socket.emit('file:delete', {
              roomId,
              fileId: node.id,
            })
          }

          setFiles((current) =>
            current.filter((file) => file.id !== node.id),
          )

          if (activeFileId === node.id) {
            const remainingFiles = files.filter(
              (file) =>
                file.kind === 'file' &&
                file.id !== node.id,
            )

            setActiveFileId(
              remainingFiles[0]?.id ?? '',
            )
          }
        }

        setToast(`${node.name} deleted`)

        window.setTimeout(
          () => setToast(''),
          2200,
        )
      } catch (error: any) {
        console.error('Failed to delete node:', error)

        setToast(
          error?.response?.data?.error ??
            `Failed to delete ${node.name}`,
        )

        window.setTimeout(
          () => setToast(''),
          2600,
        )
      }
    }

    const renameNode = (id: string) => {
      const node = files.find((file) => file.id === id)

      if (!node) return

      setRenameDialog({
        open: true,
        nodeId: id,
        name: node.name,
      })
    }

    const closeRenameDialog = () => {
      setRenameDialog({
        open: false,
        nodeId: null,
        name: '',
      })
    }

    const confirmRename = async () => {
      const node = files.find(
        (file) => file.id === renameDialog.nodeId,
      )

      const newName = renameDialog.name.trim()

      if (!node || !newName) return

      if (newName === node.name) {
        closeRenameDialog()
        return
      }

      try {
        setToast(`Renaming ${node.name}…`)

        if (node.kind === 'folder') {
          const response = await apiClient.patch(
            `/rooms/${roomId}/folders/${node.id}`,
            {
              name: newName,
            },
          )

          const folder = response.data

          setFiles((current) =>
            current.map((file) =>
              file.id === node.id
                ? {
                    ...file,
                    name: folder.name,
                  }
                : file,
            ),
          )

          if (socket?.connected && roomId) {
            socket.emit('folder:rename', {
              roomId,
              folder: {
                id: folder.id,
                name: folder.name,
              },
            })
          }
        } else {
          const oldPath = node.path ?? node.name

          const lastSlash = oldPath.lastIndexOf('/')

          const directory =
            lastSlash >= 0
              ? oldPath.slice(0, lastSlash)
              : ''

          const newPath = directory
            ? `${directory}/${newName}`
            : newName

          const response = await apiClient.patch(
            `/rooms/${roomId}/files/${node.id}`,
            {
              name: newName,
              path: newPath,
            },
          )

          const file = response.data

          setFiles((current) =>
            current.map((currentFile) =>
              currentFile.id === node.id
                ? {
                    ...currentFile,
                    name: file.name,
                    path: file.path,
                  }
                : currentFile,
            ),
          )

          if (socket?.connected && roomId) {
            socket.emit('file:rename', {
              roomId,
              file: {
                id: file.id,
                name: file.name,
                path: file.path,
              },
            })
          }
        }

        closeRenameDialog()

        setToast(`${newName} renamed`)

        window.setTimeout(
          () => setToast(''),
          2200,
        )
      } catch (error: any) {
        console.error('Failed to rename:', error)

        setToast(
          error?.response?.data?.error ??
            `Failed to rename ${node.name}`,
        )

        window.setTimeout(
          () => setToast(''),
          2600,
        )
      }
    }

    const moveNode = (id: string) => {
      const node = files.find(
        (file) => file.id === id,
      )

      if (!node) return

      setMoveDialog({
        open: true,
        nodeId: id,
        targetFolderId:
          node.parentId ?? null,
      })
    }

    const closeMoveDialog = () => {
      setMoveDialog({
        open: false,
        nodeId: null,
        targetFolderId: null,
      })
    }

    const confirmMove = async () => {
      const node = files.find(
        (file) => file.id === moveDialog.nodeId,
      )

      if (!node) return

      const targetFolderId =
        moveDialog.targetFolderId

      // Can't move a node into itself.
      if (targetFolderId === node.id) {
        setToast(
          'An item cannot be moved inside itself.',
        )

        window.setTimeout(
          () => setToast(''),
          2200,
        )

        return
      }

      try {
        setToast(`Moving ${node.name}…`)

        if (node.kind === 'folder') {
          const response = await apiClient.patch(
            `/rooms/${roomId}/folders/${node.id}/move`,
            {
              parentId: targetFolderId,
            },
          )

          const result = response.data

          setFiles((current) =>
            current.map((file) => {
              if (file.id === node.id) {
                return {
                  ...file,
                  parentId:
                    result.folder.parentId ??
                    undefined,
                }
              }

              const updatedFile =
                result.files?.find(
                  (item: any) =>
                    item.id === file.id,
                )

              if (!updatedFile) {
                return file
              }

              return {
                ...file,
                path: updatedFile.path,
                parentId:
                  updatedFile.folderId ??
                  undefined,
              }
            }),
          )

          if (socket?.connected && roomId) {
            socket.emit('folder:move', {
              roomId,
              folder: {
                id: result.folder.id,
                parentId:
                  result.folder.parentId ??
                  null,
              },
              files: result.files ?? [],
            })
          }
        } else {
          const targetFolder = targetFolderId
            ? files.find(
                (file) =>
                  file.kind === 'folder' &&
                  file.id === targetFolderId,
              )
            : null

          const newPath = targetFolder
            ? `${targetFolder.name}/${node.name}`
            : node.name

          const response = await apiClient.patch(
            `/rooms/${roomId}/files/${node.id}`,
            {
              folderId: targetFolderId,
              path: newPath,
            },
          )

          const updatedFile = response.data

          setFiles((current) =>
            current.map((file) =>
              file.id === node.id
                ? {
                    ...file,
                    parentId:
                      updatedFile.folderId ??
                      undefined,
                    path: updatedFile.path,
                  }
                : file,
            ),
          )

          if (socket?.connected && roomId) {
            socket.emit('file:move', {
              roomId,
              file: {
                id: updatedFile.id,
                folderId:
                  updatedFile.folderId ??
                  null,
                parentId:
                  updatedFile.folderId ??
                  undefined,
                path: updatedFile.path,
              },
            })
          }
        }

        closeMoveDialog()

        setToast(`${node.name} moved`)

        window.setTimeout(
          () => setToast(''),
          2200,
        )
      } catch (error: any) {
        console.error(
          'Failed to move item:',
          error,
        )

        setToast(
          error?.response?.data?.error ??
            `Failed to move ${node.name}`,
        )

        window.setTimeout(
          () => setToast(''),
          2600,
        )
      }
    }


    const runWorkspace = async () => {
      setExecution('running')
      setExecutionResult(null)
      setBottomTab('output')

      try {
        const languageIds: Partial<Record<Language, number>> = {
          javascript: 63,
          typescript: 74,
          python: 71,
          rust: 73,
        }

        const languageId = languageIds[activeLanguage]

        if (!languageId) {
          setExecution('error')
          setExecutionResult({
            stderr: `The ${activeLanguage} language cannot be executed.`,
          })
          return
        }

        const sourceCode = activeFile.content ?? ''

        // Step 1: Submit code to Judge0.
        const submission = await executionService.run({
          language_id: languageId,
          source_code: sourceCode,
          stdin: input,
        })

        const token = submission.data.token

        if (!token) {
          throw new Error('Judge0 did not return a submission token.')
        }

        // Step 2: Poll for the execution result.
        const maxAttempts = 30
        const pollingInterval = 2000

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, pollingInterval),
          )

          const response = await executionService.getResult(token)
          const result = response.data

          console.log('Judge0 result:', result)

          if (result.pending) {
            continue
          }

          // Step 3: Display the completed result.
          setExecutionResult(result)

          if (result.status?.id === 3) {
            setExecution('success')
          } else {
            setExecution('error')
          }

          return
        }

        throw new Error('Execution timed out. Please try again.')
      } catch (error: any) {
        console.error('Execution failed:', error)

        setExecution('error')

        setExecutionResult({
          stderr:
            error?.response?.data?.message ??
            error?.response?.data?.error ??
            error?.message ??
            'Failed to execute code.',
        })
      }
    }


    const sendMessage = (event: React.FormEvent) => {
      event.preventDefault()

      const text = message.trim()

      if (!text) return

      if (!socket?.connected || !roomId) {
        setToast('Chat connection unavailable')
        window.setTimeout(() => setToast(''), 2200)
        return
      }

      socket.emit('chat:message', {
        roomId,
        text,
      })

      setMessage('')
    }

    const copyRoom = async () => {
      // const inviteUrl = `${window.location.origin}/rooms/${room.id}`

      await navigator.clipboard.writeText(room.id)

      setToast('Room link copied')
      window.setTimeout(() => setToast(''), 2200)
    }

    const openGithubModal = async () => {
        setShowGithub(true)
        setLoadingRepositories(true)

        try {
            const response = await githubService.repositories()
            const repositories = response.data

            setGithubRepositories(repositories)

            if (repositories.length > 0) {
            setGithubRepo((current) =>
                repositories.some((repo) => repo.full_name === current)
                ? current
                : repositories[0].full_name,
            )
            } else {
            setGithubRepo('')
            }
        } catch (error: any) {
            console.error('Failed to fetch GitHub repositories:', error)

            setShowGithub(false)

            setToast(
            error?.response?.data?.message ??
                'Unable to fetch GitHub repositories',
            )

            window.setTimeout(() => setToast(''), 2600)
        } finally {
            setLoadingRepositories(false)
        }
    }

    const commit = async () => {
        if (!roomId || !githubRepo) {
          setToast('Select a repository first')
          return
        }

        const selectedRepository = githubRepositories.find(
          (repository) => repository.full_name === githubRepo,
        )

        if (!selectedRepository?.default_branch) {
          setToast('Unable to determine the repository default branch')
          return
        }

        if (!commitMessage.trim()) {
          setToast('Enter a commit message')
          return
        }

        try {
          setIsCommitting(true)

          // Make sure all pending workspace changes are saved first.
          const modifiedFiles = files.filter(
            (file) => file.kind === 'file' && file.modified,
          )

          await Promise.all(
            modifiedFiles.map((file) =>
              apiClient.patch(`/rooms/${roomId}/files/${file.id}`, {
                content: file.content,
                language: file.language,
              }),
            ),
          )

          // Update the local modified flags after saving.
          setFiles((current) =>
            current.map((file) =>
              modifiedFiles.some((modified) => modified.id === file.id)
                ? { ...file, modified: false }
                : file,
            ),
          )

          // Create the actual GitHub commit.
          const response = await githubService.commitWorkspace({
            roomId,
            repository: githubRepo,
            branch: selectedRepository.default_branch,
            message: commitMessage.trim(),
          })

          const result = response.data

          setShowGithub(false)
          setToast(
            `Successfully committed ${result.filesCommitted} files to GitHub!`,
          )

          console.log('GitHub commit successful:', result)

          window.setTimeout(() => setToast(''), 3500)
        } catch (error: any) {
          console.error('GitHub commit failed:', error)

          setToast(
            error?.response?.data?.message ??
              error?.response?.data?.error ??
              'GitHub commit failed',
          )

          window.setTimeout(() => setToast(''), 3500)
        } finally {
          setIsCommitting(false)
        }
      }

    const handleEditorMount = (editor: any) => {
        editorRef.current = editor

        editor.onDidChangeCursorPosition(
            ({ position }: {
            position: { lineNumber: number; column: number }
            }) => {
            setCursorPosition({
                line: position.lineNumber,
                column: position.column,
            })
            },
        )
    }

    const openSearchResult = (result: SearchResult) => {
        const line = result.matches[0]?.line ?? 1

        setActiveFileId(result.id)

        setPendingSearchMatch({
          fileId: result.id,
          line,
        })
    }

    return <main className="room-page"><header className="room-topbar"><Brand compact /><div className="room-topbar__crumbs"><ChevronRight size={14} /><span className="room-breadcrumb">Rooms</span><ChevronRight size={14} /><strong>{room.name}</strong><span className="room-id-badge">{room.id}</span></div><div className="room-topbar__actions"><span className="room-connected"><Wifi size={14} /> Connected</span><div className="room-topbar__avatars">
    {onlineUsers.slice(0, 3).map((person) => (
      <Avatar
        key={person.id}
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
        size="xs"
      />
    ))}

    {onlineUsers.length > 3 && (
      <span className="more-avatar">
        +{onlineUsers.length - 3}
      </span>
    )}
  </div><button className="button button--quiet button--small" onClick={copyRoom}><Share2 size={14} /> Share</button><button
  className="button button--primary button--small"
  onClick={() => {
    openGithubModal()
  }}
>
  <GitCommitHorizontal size={14} />
  Commit
</button><button className="icon-button" onClick={onLogout} title="Log out"><LogOut size={15} /></button></div></header><div className="room-commandbar"><div className="commandbar-left"><button className="commandbar-toggle" onClick={() => setShowExplorer(!showExplorer)} title="Toggle explorer"><PanelLeftClose size={15} /></button><span className="commandbar-context"><GitBranch size={14} /> {room.branch} <ChevronDown size={13} /></span><span className="commandbar-divider" /><span className="commandbar-context commandbar-context--muted">
  <CircleCheck size={14} />
  {files.filter(
    (file) => file.kind === 'file' && file.modified,
  ).length > 0
    ? `${files.filter(
        (file) => file.kind === 'file' && file.modified,
      ).length} unsaved changes`
    : saveState}
</span></div>
{showSearch && searchQuery.trim() && (
    <div className="commandbar-search-results">
      {searchError ? (
        <p>{searchError}</p>
      ) : searchLoading ? (
        <p>Searching workspace...</p>
      ) : searchResults.length === 0 ? (
        <p>No results found.</p>
      ) : (
        searchResults.map((result) => (
          <div key={result.id} className="search-result">
            <button className="search-result__header" onClick={() => {
              setActiveFileId(result.id)
              setPendingSearchMatch({
                fileId: result.id,
                line: result.matches[0]?.line ?? 1,
              })
              setShowSearch(false)
            }}>
                <FileCode2 size={14} />
                <span>{result.name}</span>
            </button>

            {result.matches.map((match, index) => (
              <button
                key={`${result.id}-${match.line}-${index}`}
                className="search-result__match"
                onClick={() => {
                  setActiveFileId(result.id)
                  setPendingSearchMatch({
                    fileId: result.id,
                    line: match.line,
                  })
                  setShowSearch(false)
                }}
              >
                <span>{match.line}</span>
                <code>{match.content}</code>
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  )}<div className="commandbar-right">{showSearch ? (
  <div className="commandbar-search">
    <Search size={14} />

    <input
      autoFocus
      placeholder="Search across workspace..."
      value={searchQuery}
      onChange={(event) => setSearchQuery(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setShowSearch(false)
          setSearchQuery('')
        }
      }}
    />

    {searchLoading && <span>Searching...</span>}

    <button
      className="icon-button icon-button--tiny"
      onClick={() => {
        setShowSearch(false)
        setSearchQuery('')
      }}
      title="Close search"
    >
      <X size={14} />
    </button>
  </div>
) : (
  <button
    className="commandbar-action"
    onClick={() => setShowSearch(true)}
  >
    <Search size={14} /> Search <kbd>Ctrl + Shift + F</kbd>
  </button>
)}<button className="commandbar-action" onClick={() => setShowCollab(!showCollab)}><Users size={14} /> Collaborators</button>
{/* <kbd>⌘ ↵</kbd> */}<button className="commandbar-action commandbar-action--run" onClick={runWorkspace}><Play size={14} fill="currentColor" /> Run </button><button className="commandbar-toggle" onClick={() => setShowCollab(!showCollab)} title="Toggle collaboration panel"><PanelRightClose size={15} /></button></div></div><div className="room-body">{showExplorer && <aside className="explorer-panel"><div className="panel-heading">
  <span>Explorer</span>
  <div>
    <button
      className="icon-button icon-button--tiny"
      onClick={() => openCreateDialog('file')}
      title="New file"
    >
      <FilePlus2 size={14} />
    </button>

    <button
      className="icon-button icon-button--tiny"
      onClick={() => openCreateDialog('folder')}
      title="New folder"
    >
      <FolderPlus size={14} />
    </button>

    <button className="icon-button icon-button--tiny">
      <MoreHorizontal size={14} />
    </button>
  </div>
</div><div className="explorer-workspace"><span className="workspace-label">
  <ChevronDown size={13} /> {room.name}
</span><div className="file-tree">{fileTree.map((node) => <TreeNode key={node.id} node={node} files={files} activeFileId={activeFileId} onSelect={setActiveFileId} onRename={renameNode} onMove={moveNode} onDelete={deleteNode} onCreate={openCreateDialog} />)}</div></div><div className="explorer-footer"><div className="explorer-footer__line"><span><CircleCheck size={13} /> Auto Save</span><span className="saved-dot" /></div></div></aside>}<section className="editor-panel"><div className="editor-tabbar"><div className="editor-tabs"><span className="editor-tab editor-tab--active"><span className="language-dot" style={{ background: languageMeta[activeLanguage].color }} /> {activeFile.name} {activeFile.modified && <span className="modified-dot" />}</span><button className="editor-tab-add" onClick={() => openCreateDialog('file')}><Plus size={14} /></button></div><div className="editor-tab-actions"><span className="save-state"><CircleCheck size={13} /> {saveState}</span><button className="icon-button icon-button--tiny"><Ellipsis size={15} /></button></div></div><div className="editor-breadcrumbs">
  {breadcrumbs.map((segment, index) => (
    <React.Fragment key={`${segment}-${index}`}>
      {index > 0 && <ChevronRight size={12} />}

      {index === breadcrumbs.length - 1 ? (
        <strong>{segment}</strong>
      ) : (
        <span>{segment}</span>
      )}
    </React.Fragment>
  ))}<span className="editor-breadcrumbs__spacer" /><select
    value={activeLanguage}
    onChange={(event) => updateLanguage(event.target.value as Language)}
  >
    <option value="typescript">TypeScript</option>
    <option value="javascript">JavaScript</option>
    <option value="python">Python</option>
    <option value="rust">Rust</option>
    <option value="json">JSON</option>
    <option value="markdown">Markdown</option>
    <option value="html">HTML</option>
    <option value="css">CSS</option>
    <option value="sql">SQL</option>
    <option value="java">Java</option>
    <option value="cpp">C++</option>
    <option value="c">C</option>
    <option value="go">Go</option>
  </select><button className="icon-button icon-button--tiny"><MoreHorizontal size={15} /></button></div><div className="editor-canvas"><Editor height="100%" language={editorLanguage} theme="vs-dark" value={activeFile.content ?? ''} onChange={(value) => updateFile(value ?? '')} onMount={handleEditorMount} options={{ minimap: { enabled: false }, fontSize: 13, lineHeight: 21, padding: { top: 16, bottom: 16 }, smoothScrolling: true, cursorBlinking: 'smooth', renderLineHighlight: 'all', scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }, suggest: { showMethods: true } }} /></div><div className="editor-statusbar"><span><GitBranch size={12} /> {room.branch}</span><span><CircleCheck size={12} /> Prettier</span><span className="editor-statusbar__spacer" /><span>
  Ln {cursorPosition.line}, Col {cursorPosition.column}
</span><span>Spaces: 2</span><span>UTF-8</span><span><Wifi size={12} /> Socket.IO</span></div><div className="bottom-panel"><div className="bottom-panel__tabs">{(['output', 'terminal', 'problems'] as const).map((tab) => <button key={tab} className={bottomTab === tab ? 'is-active' : ''} onClick={() => setBottomTab(tab)}>{tab === 'output' ? <CircleCheck size={14} /> : tab === 'terminal' ? <Terminal size={14} /> : <CircleAlert size={14} />} {tab[0].toUpperCase() + tab.slice(1)}{tab === 'problems' && <span className="tab-count">0</span>}</button>)}<span className="bottom-panel__spacer" /><button className="icon-button icon-button--tiny"><Trash2 size={14} /></button><button className="icon-button icon-button--tiny"><X size={14} /></button></div><div className="bottom-panel__content">{bottomTab === 'output' && <OutputPanel status={execution} input={input} setInput={setInput} onRun={runWorkspace} result={executionResult} />}{bottomTab === 'terminal' && <TerminalPanel />}{bottomTab === 'problems' && <div className="empty-panel"><CircleCheck size={24} /><strong>No problems detected</strong><span>Workspace checks are green.</span></div>}</div></div></section>{showCollab && <aside className="collab-panel"><div className="collab-tabs"><button className={sideTab === 'chat' ? 'is-active' : ''} onClick={() => setSideTab('chat')}><MessageSquare size={14} /> Chat</button>
  {/*<button className={sideTab === 'activity' ? 'is-active' : ''} onClick={() => setSideTab('activity')}><Activity size={14} /> Activity</button>*/}
  </div>{sideTab === 'chat' ? <ChatPanel chat={chat} message={message} setMessage={setMessage} onSend={sendMessage} onlineUsers={onlineUsers} /> : <ActivityPanel />}</aside>}</div>{showGithub && (
  <GithubModal
    repo={githubRepo}
    setRepo={setGithubRepo}
    repositories={githubRepositories}
    loadingRepositories={loadingRepositories}
    commitMessage={commitMessage}
    setCommitMessage={setCommitMessage}
    sourceBranch={room.branch}
    targetBranch={
        githubRepositories.find(
        (repository) => repository.full_name === githubRepo,
        )?.default_branch ?? ''
    }
    isCommitting={isCommitting}
    onClose={() => setShowGithub(false)}
    onCommit={commit}
    filePaths={files
        .filter((file) => file.kind === 'file')
        .map((file) => file.path ?? file.name)}
    />
)}{toast && <div className="toast toast--room"><CircleCheck size={16} /> {toast}</div>}{createDialog.open && (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button
          className="modal-close"
          onClick={closeCreateDialog}
        >
          <X size={17} />
        </button>

        <div className="github-modal__head">
          <span className="github-logo">
            {createDialog.kind === 'file' ? (
              <FilePlus2 size={22} />
            ) : (
              <FolderPlus size={22} />
            )}
          </span>

          <div>
            <span className="eyebrow">
              EXPLORER
            </span>

            <h2>
              Create {createDialog.kind}
            </h2>
          </div>
        </div>

        <label>
          {createDialog.kind === 'file'
            ? 'File name'
            : 'Folder name'}

          <input
            autoFocus
            value={createName}
            onChange={(event) =>
              setCreateName(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                createNode()
              }

              if (event.key === 'Escape') {
                closeCreateDialog()
              }
            }}
            placeholder={
              createDialog.kind === 'file'
                ? 'example.ts'
                : 'components'
            }
          />
        </label>

        <div className="github-modal__foot">
          <button
            className="button button--quiet"
            onClick={closeCreateDialog}
          >
            Cancel
          </button>

          <button
            className="button button--primary"
            onClick={createNode}
          >
            {createDialog.kind === 'file' ? (
              <FilePlus2 size={15} />
            ) : (
              <FolderPlus size={15} />
            )}

            Create
          </button>
        </div>
      </div>
    </div>
  )}{renameDialog.open && (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button
          className="modal-close"
          onClick={closeRenameDialog}
        >
          <X size={17} />
        </button>

        <div className="github-modal__head">
          <span className="github-logo">
            <Pencil size={21} />
          </span>

          <div>
            <span className="eyebrow">
              EXPLORER
            </span>

            <h2>Rename item</h2>
          </div>
        </div>

        <label>
          New name

          <input
            autoFocus
            value={renameDialog.name}
            onChange={(event) =>
              setRenameDialog((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                confirmRename()
              }

              if (event.key === 'Escape') {
                closeRenameDialog()
              }
            }}
          />
        </label>

        <div className="github-modal__foot">
          <button
            className="button button--quiet"
            onClick={closeRenameDialog}
          >
            Cancel
          </button>

          <button
            className="button button--primary"
            onClick={confirmRename}
          >
            <Pencil size={15} />
            Rename
          </button>
        </div>
      </div>
    </div>
  )}{moveDialog.open && (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button
          className="modal-close"
          onClick={closeMoveDialog}
        >
          <X size={17} />
        </button>

        <div className="github-modal__head">
          <span className="github-logo">
            <FolderInput size={21} />
          </span>

          <div>
            <span className="eyebrow">
              EXPLORER
            </span>

            <h2>Move file</h2>
          </div>
        </div>

        <label>
          Move to

          <select
            value={moveDialog.targetFolderId ?? ''}
            onChange={(event) =>
              setMoveDialog((current) => ({
                ...current,
                targetFolderId:
                  event.target.value || null,
              }))
            }
          >
            <option value="">
              Workspace root
            </option>

            {files
              .filter(
                (file) =>
                  file.kind === 'folder' &&
                  file.id !== moveDialog.nodeId &&
                  !(
                    nodeIsDescendant(
                      file.id,
                      moveDialog.nodeId,
                      files,
                    )
                  ),
              )
              .map((folder) => (
                <option
                  key={folder.id}
                  value={folder.id}
                >
                  {folder.name}
                </option>
              ))}
          </select>
        </label>

        <div className="github-modal__foot">
          <button
            className="button button--quiet"
            onClick={closeMoveDialog}
          >
            Cancel
          </button>

          <button
            className="button button--primary"
            onClick={confirmMove}
          >
            <FolderInput size={15} />
            Move
          </button>
        </div>
      </div>
    </div>
  )}</main>
  }

  function nodeIsDescendant(
    candidateId: string,
    parentId: string | null,
    files: FileNode[],
  ): boolean {
    if (!parentId) return false

    let current = files.find(
      (file) => file.id === candidateId,
    )

    while (current?.parentId) {
      if (current.parentId === parentId) {
        return true
      }

      current = files.find(
        (file) =>
          file.id === current?.parentId,
      )
    }

    return false
  }