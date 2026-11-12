import {
    CircleAlert,
    CircleCheck,
    CircleDot,
    Play,
    RefreshCw,
  } from 'lucide-react'
  
  type ExecutionStatus = 'idle' | 'running' | 'success' | 'error'
  
  type OutputPanelProps = {
    status: ExecutionStatus
    input: string
    setInput: (value: string) => void
    onRun: () => void
    result: any
  }
  
  export default function OutputPanel({
    status,
    input,
    setInput,
    onRun,
    result,
  }: OutputPanelProps) {
    const stdout = result?.stdout ?? ''
    const stderr = result?.stderr ?? ''
    const compileOutput = result?.compile_output ?? ''
    const message = result?.message ?? ''
  
    return (
      <div className="output-panel">
        <div className="output-input">
          <div className="output-heading">
            <span className="eyebrow">STDIN</span>
            <span>Passed to Judge0</span>
          </div>
  
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Enter program input..."
          />
  
          <button
            className="button button--primary button--small"
            onClick={onRun}
            disabled={status === 'running'}
          >
            <Play size={13} fill="currentColor" />
            {status === 'running' ? 'Running' : 'Run code'}
          </button>
        </div>
  
        <div className="output-result">
          <div className="output-heading">
            <span
              className={`execution-status execution-status--${status}`}
            >
              {status === 'running' ? (
                <RefreshCw size={13} className="spin" />
              ) : status === 'success' ? (
                <CircleCheck size={13} />
              ) : status === 'error' ? (
                <CircleAlert size={13} />
              ) : (
                <CircleDot size={13} />
              )}
  
              {status === 'running'
                ? 'Running'
                : status === 'success'
                  ? 'Execution successful'
                  : status === 'error'
                    ? 'Execution failed'
                    : 'Ready'}
            </span>
  
            {result && (
              <span className="output-metadata">
                {result.time ? `${result.time}s` : ''}
                {result.memory ? ` · ${result.memory} KB` : ''}
              </span>
            )}
          </div>
  
          <pre className="output-console">
            {status === 'idle' && (
              <span className="output-muted">
                Press Run to execute the current file with Judge0.
              </span>
            )}
  
            {status === 'running' && (
              <span className="output-muted">
                Sending code to Judge0…
              </span>
            )}
  
            {status === 'success' && (
              stdout ? (
                <span className="output-success">{stdout}</span>
              ) : (
                <span className="output-muted">
                  Program finished successfully with no output.
                </span>
              )
            )}
  
            {status === 'error' && (
              <>
                {compileOutput && (
                  <span className="output-error">
                    {compileOutput}
                  </span>
                )}
  
                {stderr && (
                  <span className="output-error">
                    {stderr}
                  </span>
                )}
  
                {!compileOutput && !stderr && message && (
                  <span className="output-error">
                    {message}
                  </span>
                )}
  
                {!compileOutput && !stderr && !message && (
                  <span className="output-error">
                    Execution failed.
                  </span>
                )}
              </>
            )}
          </pre>
        </div>
      </div>
    )
  }