import { apiClient } from './apiClient'

export type GithubRepository = {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  owner: string
}

export type GithubCommitPayload = {
  roomId: string
  repository: string
  branch: string
  message: string
}

export const githubService = {
  repositories: () =>
    apiClient.get<GithubRepository[]>('/github/repositories'),

  workspacePreview: (roomId: string) =>
    apiClient.get(`/github/workspace/${roomId}`),

  commitWorkspace: (payload: GithubCommitPayload) =>
    apiClient.post('/github/commit', payload),
}
