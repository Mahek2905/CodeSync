import {
  ArrowRight,
  Check,
  CircleCheck,
  Clipboard,
  GitBranch,
  GitCommitHorizontal,
  Github,
  X,
} from 'lucide-react'
import { GithubRepository } from '../../services/githubService'

type GithubModalProps = {
    repo: string
    setRepo: (value: string) => void
    commitMessage: string
    setCommitMessage: (value: string) => void
    onClose: () => void
    onCommit: () => void | Promise<void>
    repositories: GithubRepository[]
    loadingRepositories: boolean
    sourceBranch: string
    targetBranch: string
    isCommitting: boolean
    filePaths: string[]
  }

export default function GithubModal({
    repo,
    setRepo,
    commitMessage,
    setCommitMessage,
    onClose,
    onCommit,
    repositories,
    loadingRepositories,
    sourceBranch,
    targetBranch,
    isCommitting,
    filePaths,
}: GithubModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card github-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={17} />
        </button>

        <div className="github-modal__head">
          <span className="github-logo">
            <Github size={22} />
          </span>

          <div>
            <span className="eyebrow">GITHUB SYNC</span>
            <h2>Commit this workspace.</h2>
          </div>
        </div>

        <p>
          Push the current room snapshot to a repository. Your local files stay
          in the room.
        </p>

        <label>
          Repository
          <select
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            disabled={loadingRepositories || repositories.length === 0}
            >
            {loadingRepositories ? (
                <option value="">Loading repositories...</option>
            ) : repositories.length === 0 ? (
                <option value="">No repositories found</option>
            ) : (
                repositories.map((repository) => (
                <option key={repository.id} value={repository.full_name}>
                    {repository.full_name}
                    {repository.private ? ' (Private)' : ''}
                </option>
                ))
            )}
            </select>
        </label>

        <div className="github-branch-row">
            <div>
                <span className="eyebrow">SOURCE</span>
                <span>
                <GitBranch size={13} /> {sourceBranch}
                </span>
            </div>

            <ArrowRight size={16} />

            <div>
                <span className="eyebrow">TARGET</span>
                <span>
                <GitBranch size={13} /> {targetBranch || 'Loading...'}
                </span>
            </div>
        </div>

        <label>
          Commit message
          <input
            value={commitMessage}
            onChange={(event) => setCommitMessage(event.target.value)}
          />
        </label>

        <div className="github-file-summary">
            <div className="github-file-summary__top">
                <span>
                <Check size={14} />
                {filePaths.length} {filePaths.length === 1 ? 'file' : 'files'} ready
                </span>
            </div>

            {filePaths.length > 0 ? (
                filePaths.map((path) => (
                <span key={path}>{path}</span>
                ))
            ) : (
                <span>No files available in this workspace.</span>
            )}
        </div>

        <div className="github-modal__foot">
        <span className="github-auth-state">
            <CircleCheck size={14} /> GitHub account connected
        </span>

          <button
            className="button button--primary"
            onClick={onCommit}
            disabled={
                isCommitting ||
                loadingRepositories ||
                !repo ||
                !targetBranch ||
                !commitMessage.trim()
            }
            >
            <GitCommitHorizontal size={15} />
            {isCommitting ? 'Committing...' : 'Commit to GitHub'}
          </button>
        </div>
      </div>
    </div>
  )
}
