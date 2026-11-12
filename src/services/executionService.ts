import { apiClient } from './apiClient'
import type { Language } from '../types'

export type ExecutionRequest = { language: Language; sourceCode: string; stdin?: string }
export type ExecutionResult = { status: 'accepted' | 'success' | 'compilation_error' | 'runtime_error'; stdout?: string; stderr?: string; compileOutput?: string; time?: string; memory?: number }

export const executionService = {
  run: (payload: ExecutionRequest) => apiClient.post<ExecutionResult>('/execution/run', payload),
  languages: () => apiClient.get('/execution/languages'),
}
