import { useState, type KeyboardEvent } from 'react'
import { Trash2 } from 'lucide-react'

import { apiClient } from '../../services/apiClient'

export default function TerminalPanel() {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const runCommand = async () => {
    const trimmed = command.trim()

    if (!trimmed || running) return

    setHistory((prev) => [...prev, `$ ${trimmed}`])
    setCommand('')
    setRunning(true)

    try {
      const response = await apiClient.post('/terminal/execute', {
        command: trimmed,
      })

      const data = response.data

      if (data.stdout) {
        setHistory((prev) => [...prev, data.stdout])
      }

      if (data.stderr) {
        setHistory((prev) => [...prev, data.stderr])
      }

      if (typeof data.exitCode === 'number' && data.exitCode !== 0) {
        setHistory((prev) => [
          ...prev,
          `Process exited with code ${data.exitCode}`,
        ])
      }
    } catch (error: any) {
      setHistory((prev) => [
        ...prev,
        error?.response?.data?.error ?? 'Failed to execute command.',
      ])
    } finally {
      setRunning(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void runCommand()
    }
  }

  const clearTerminal = () => {
    setHistory([])
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-toolbar">
        <span>Terminal</span>

        <button
          type="button"
          className="icon-button icon-button--tiny"
          onClick={clearTerminal}
          title="Clear terminal"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="terminal-output-area">
        {history.map((line, index) => (
          <div key={`${index}-${line}`} className="terminal-line">
            {line}
          </div>
        ))}

        <div className="terminal-input-line">
          <span className="terminal-prompt">
            ~/codesync/orbital-console
          </span>

          <span className="terminal-caret">$</span>

          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            autoFocus
            placeholder={running ? 'Running...' : 'Type a command...'}
            className="terminal-input"
          />

          {running && (
            <span className="terminal-running">
              Running...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}