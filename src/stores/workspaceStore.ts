import { create } from 'zustand'
import type { FileNode, Language } from '../types'

type WorkspaceState = {
  files: FileNode[]
  activeFileId: string | null
  saveState: 'saved' | 'saving' | 'offline'
  setFiles: (files: FileNode[]) => void
  selectFile: (id: string) => void
  updateContent: (id: string, content: string) => void
  updateLanguage: (id: string, language: Language) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  files: [],
  activeFileId: null,
  saveState: 'saved',
  setFiles: (files) => set({ files, activeFileId: files.find((file) => file.kind === 'file')?.id ?? null }),
  selectFile: (activeFileId) => set({ activeFileId }),
  updateContent: (id, content) => set((state) => ({ saveState: 'saving', files: state.files.map((file) => file.id === id ? { ...file, content, modified: true } : file) })),
  updateLanguage: (id, language) => set((state) => ({ files: state.files.map((file) => file.id === id ? { ...file, language } : file) })),
}))
