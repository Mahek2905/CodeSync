import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderInput,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import type { FileNode } from '../../types'
import { languageMeta } from '../../constants/languageMeta'

type TreeNodeProps = {
  node: FileNode
  files: FileNode[]
  activeFileId: string
  onSelect: (id: string) => void
  onRename: (id: string) => void
  onMove: (id: string) => void
  onDelete: (id: string) => void
  onCreate: (
    kind: 'file' | 'folder',
    parentId?: string | null,
  ) => void
}

export default function TreeNode({
  node,
  files,
  activeFileId,
  onSelect,
  onRename,
  onMove,
  onDelete,
  onCreate,
}: TreeNodeProps) {
  const [open, setOpen] = useState(true)

  const children = files.filter(
    (file) => file.parentId === node.id,
  )

  // Folder
  if (node.kind === 'folder') {
    return (
      <div className="tree-group">
        <div className="tree-folder-row">
          <button
            className="tree-folder-toggle"
            onClick={() => setOpen(!open)}
          >
            <span className="tree-chevron">
              {open ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
            </span>

            {open ? (
              <FolderOpen
                size={15}
                className="tree-icon tree-icon--folder"
              />
            ) : (
              <Folder
                size={15}
                className="tree-icon tree-icon--folder"
              />
            )}

            <span className="tree-folder-name">
              {node.name}
            </span>
          </button>

          <div className="tree-folder-actions">
            <button
              onClick={() => onCreate('file', node.id)}
              title="New file in folder"
            >
              <Plus size={12} />
            </button>

            <button
              onClick={() => onRename(node.id)}
              title="Rename folder"
            >
              <Pencil size={11} />
            </button>

            <button
              onClick={() => onMove(node.id)}
              title="Move folder"
            >
              <FolderInput size={11} />
            </button>

            <button
              onClick={() => onDelete(node.id)}
              title="Delete folder"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {open && (
          <div className="tree-children">
            {children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                files={files}
                activeFileId={activeFileId}
                onSelect={onSelect}
                onRename={onRename}
                onMove={onMove}
                onDelete={onDelete}
                onCreate={onCreate}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // File
  return (
    <div
      className={`tree-row-wrap ${
        activeFileId === node.id ? 'is-active' : ''
      }`}
    >
      <button
        className="tree-row"
        onClick={() => onSelect(node.id)}
      >
        <span className="tree-indent" />

        <FileCode2
          size={14}
          style={{
            color: languageMeta[
              node.language ?? 'typescript'
            ].color,
          }}
        />

        <span>{node.name}</span>

        {node.modified && (
          <span className="modified-dot" />
        )}
      </button>

      <div className="tree-actions">
        <button
          onClick={() => onRename(node.id)}
          title="Rename"
        >
          <Pencil size={11} />
        </button>

        <button
          onClick={() => onMove(node.id)}
          title="Move"
        >
          <FolderInput size={11} />
        </button>

        <button
          onClick={() => onDelete(node.id)}
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}