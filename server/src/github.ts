const GITHUB_API = 'https://api.github.com'

export class GithubApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'GithubApiError'
  }
}

export async function githubRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'CodeSync',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new GithubApiError(
      data?.message ?? 'GitHub API request failed',
      response.status,
    )
  }

  return data as T
}
