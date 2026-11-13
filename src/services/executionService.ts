import { apiClient } from './apiClient'
import type { Language } from '../types'

export type ExecutionRequest = {
  language_id: number
  source_code: string
  stdin?: string
}

export type ExecutionSubmission = {
  token: string
}

export type ExecutionResult = {
  stdout?: string | null
  stderr?: string | null
  compile_output?: string | null
  message?: string | null
  time?: string | null
  memory?: number | null
  status?: {
    id: number
    description: string
  }
  pending?: boolean
}

export const executionService = {
  run: (payload: ExecutionRequest) =>
    apiClient.post<ExecutionSubmission>('/execution/run', payload),

  getResult: (token: string) =>
    apiClient.get<ExecutionResult>(`/execution/${encodeURIComponent(token)}`),
}