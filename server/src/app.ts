import 'dotenv/config'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import http from 'node:http'
import passport from './auth.js'
import { hashPassword, issueToken, verifyPassword, verifyToken } from './auth.js'
import { PrismaClient } from '@prisma/client'
import { Server } from 'socket.io'
import {
  githubRequest,
  GithubApiError,
} from './github.js'

type MemoryUser = { id: string; name: string; email: string; passwordHash: string; provider: 'email' | 'google' | 'github' }
type MemoryFile = { id: string; name: string; path: string; language: string; content: string; version: number }
type MemoryRoom = { id: string; name: string; description: string; ownerId: string; branch: string; files: MemoryFile[]; members: string[]; messages: Array<{ id: string; userId: string; body: string; createdAt: string }> }

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  }),
)

app.use((request, response, next) => {
  const origin = request.headers.origin

  if (
    origin &&
    /^http:\/\/localhost:\d+$/.test(origin)
  ) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  )

  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  )

  if (request.method === 'OPTIONS') {
    return response.sendStatus(204)
  }

  return next()
})

const prisma = new PrismaClient()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token

    if (!token) {
      return next(new Error('authentication_required'))
    }

    const payload = verifyToken(token)
    const userId = payload.sub

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    })

    if (!user) {
      return next(new Error('user_not_found'))
    }

    socket.data.user = user

    next()
  } catch {
    next(new Error('authentication_failed'))
  }
})

const port = Number(process.env.PORT ?? 4000)
const users = new Map<string, MemoryUser>()
const rooms = new Map<string, MemoryRoom>()

app.use(express.json({ limit: '2mb' }))
app.use(passport.initialize())

function bearerUser(request: Request) {
  const value = request.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!value) return null
  try { return verifyToken(value).sub } catch { return null }
}

function requireAuth(request: Request, response: Response, next: NextFunction) {
  const userId = bearerUser(request)
  if (!userId) return response.status(401).json({ error: 'authentication_required' })
  response.locals.userId = userId
  return next()
}

async function handleOAuthLogin(
  provider: 'google' | 'github',
  oauthUser: {
    profile: {
      id: string
      displayName?: string
      username?: string
      emails?: Array<{ value: string }>
      photos?: Array<{ value: string }>
    }
    accessToken: string
    refreshToken?: string
  },
) {
  const { profile, accessToken, refreshToken } = oauthUser

  const providerAccountId = profile.id
  const email = profile.emails?.[0]?.value?.trim().toLowerCase()

  if (!email) {
    throw new Error(`No email address returned by ${provider}`)
  }

  const name =
    profile.displayName ||
    profile.username ||
    email.split('@')[0]

  const avatarUrl = profile.photos?.[0]?.value ?? null

  // 1. Does this Google/GitHub account already exist?
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    include: {
      user: true,
    },
  })

  if (existingAccount) {
    await prisma.oAuthAccount.update({
      where: {
        id: existingAccount.id,
      },
      data: {
        accessToken,
        refreshToken: refreshToken ?? existingAccount.refreshToken,
      },
    })

    return existingAccount.user
  }

  // 2. Does a CodeSync account already exist with this email?
  let user = await prisma.user.findUnique({
    where: {
      email,
    },
  })

  // 3. If not, create one.
  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email,
        avatarUrl,
      },
    })
  }

  // 4. Link Google/GitHub account to the CodeSync user.
  await prisma.oAuthAccount.create({
    data: {
      userId: user.id,
      provider,
      providerAccountId,
      accessToken,
      refreshToken,
    },
  })

  return user
}

function seedRoom(id: string, name: string, branch: string, language: string) {
  rooms.set(id, {
    id,
    name,
    description: `Collaborative workspace for ${name}.`,
    ownerId: 'demo-user',
    branch,
    members: ['demo-user'],
    files: [{ id: `${id}-readme`, name: 'README.md', path: 'README.md', language: 'markdown', content: `# ${name}\n\nShared CodeSync room.`, version: 1 }],
    messages: [],
  })
}
seedRoom('room-x72k', 'orbital-console', 'feat/command-center', 'typescript')
seedRoom('room-p91m', 'signal-lab', 'main', 'python')
seedRoom('room-j44q', 'tiny-router', 'refactor/matchers', 'rust')

app.get('/api/health', (_request, response) => response.json({ status: 'ok', service: 'codesync-api', database: Boolean(process.env.DATABASE_URL), judge0: Boolean(process.env.JUDGE0_URL) }))

app.get('/api/auth/me', requireAuth, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: {
      id: response.locals.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  })

  if (!user) {
    return response.status(404).json({
      error: 'user_not_found',
    })
  }

  return response.json({ user })
})

app.get('/api/auth/providers', (_request, response) => response.json({ email: true, google: Boolean(process.env.GOOGLE_CLIENT_ID), github: Boolean(process.env.GITHUB_CLIENT_ID) }))

app.post('/api/auth/register', async (request, response) => {
  const { name, email, password } = request.body as {
    name?: string
    email?: string
    password?: string
  }

  if (!name || !email || !password) {
    return response.status(400).json({
      error: 'name_email_password_required',
    })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  })

  if (existingUser) {
    return response.status(409).json({
      error: 'email_already_registered',
    })
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
  })

  return response.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token: issueToken(user.id),
  })
})


app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body as {
    email?: string
    password?: string
  }

  if (!email || !password) {
    return response.status(400).json({
      error: 'email_password_required',
    })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  })

  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    return response.status(401).json({
      error: 'invalid_credentials',
    })
  }

  return response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token: issueToken(user.id),
  })
})


app.post('/api/auth/logout', (_request, response) => {
  return response.status(204).send()
})


/* =========================
   GOOGLE LOGIN
========================= */

app.get(
  '/api/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
)


app.get(
  '/api/auth/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_ORIGIN ?? 'http://localhost:3000'}/login?error=google_auth_failed`,
  }),
  async (request, response) => {
    try {
      const oauthUser = request.user as {
        profile: {
          id: string
          displayName?: string
          username?: string
          emails?: Array<{ value: string }>
          photos?: Array<{ value: string }>
        }
        accessToken: string
        refreshToken?: string
      }

      const user = await handleOAuthLogin(
        'google',
        oauthUser,
      )

      const token = issueToken(user.id)

      const frontendUrl =
        process.env.CLIENT_ORIGIN ?? 'http://localhost:3000'

      return response.redirect(
        `${frontendUrl}/oauth/callback?token=${encodeURIComponent(token)}&provider=google`,
      )
    } catch (error) {
      console.error('Google OAuth error:', error)

      const frontendUrl =
        process.env.CLIENT_ORIGIN ?? 'http://localhost:3000'

      return response.redirect(
        `${frontendUrl}/login?error=google_auth_failed`,
      )
    }
  },
)


/* =========================
   GITHUB LOGIN
========================= */

app.get(
  '/api/auth/github',
  passport.authenticate('github', {
    scope: ['repo', 'user:email'],
    session: false,
  }),
)

async function getGithubEmail(accessToken: string): Promise<string | null> {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'CodeSync',
    },
  })

  if (!response.ok) {
    console.error(
      'GitHub email API failed:',
      response.status,
      await response.text(),
    )
    return null
  }

  const emails = (await response.json()) as Array<{
    email: string
    primary: boolean
    verified: boolean
  }>

  const primaryVerified = emails.find(
    (email) => email.primary && email.verified,
  )

  const verified = emails.find(
    (email) => email.verified,
  )

  return primaryVerified?.email ?? verified?.email ?? null
}

app.get(
  '/api/auth/github/callback',
  (request, response, next) => {
    passport.authenticate(
      'github',
      {
        session: false,
      },
      (error: Error | null, user: Express.User | false | null, info: unknown) => {

        if (error) return next(error)

        if (!user) {
          return response.status(401).json({
            error: 'github_auth_failed',
            info,
          })
        }

        request.user = user
        return next()
      },
    )(request, response, next)
  },
  async (request, response) => {
    try {
      const oauthUser = request.user as {
        profile: {
          id: string
          displayName?: string
          username?: string
          emails?: Array<{ value: string }>
          photos?: Array<{ value: string }>
        }
        accessToken: string
        refreshToken?: string
      }

      if (!oauthUser.profile.emails?.length) {
        const githubEmail = await getGithubEmail(
          oauthUser.accessToken,
        )
      
        if (githubEmail) {
          oauthUser.profile.emails = [
            {
              value: githubEmail,
            },
          ]
        }
      }
      
      const user = await handleOAuthLogin(
        'github',
        oauthUser,
      )

      const token = issueToken(user.id)

      const frontendUrl =
        process.env.CLIENT_ORIGIN ?? 'http://localhost:3000'

      return response.redirect(
        `${frontendUrl}/oauth/callback?token=${encodeURIComponent(token)}&provider=github`,
      )
    } catch (error) {
      console.error('GitHub OAuth error:', error)

      const frontendUrl =
        process.env.CLIENT_ORIGIN ?? 'http://localhost:3000'

      return response.redirect(
        `${frontendUrl}/login?error=github_auth_failed`,
      )
    }
  },
)


app.get('/api/rooms', requireAuth, async (_request, response) => {
  try {
    const userId = response.locals.userId as string

    const rooms = await prisma.room.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
        files: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return response.json(
      rooms.map((room) => ({
        id: room.id,
        slug: room.slug,
        name: room.name,
        description: room.description ?? '',
        branch: room.branch,
        members: room.members.length,
        files: room.files.length,
        updatedAt: room.updatedAt,
        ownerId: room.ownerId,
      })),
    )
  } catch (error) {
    console.error('Failed to fetch rooms:', error)

    return response.status(500).json({
      error: 'rooms_fetch_failed',
    })
  }
})


app.post('/api/rooms', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string

    const {
      name,
      description,
      branch = 'main',
    } = request.body as {
      name?: string
      description?: string
      branch?: string
    }

    const trimmedName = name?.trim()

    if (!trimmedName) {
      return response.status(400).json({
        error: 'room_name_required',
      })
    }

    const baseSlug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const slug = `${baseSlug || 'room'}-${Math.random()
      .toString(36)
      .slice(2, 7)}`

    const room = await prisma.room.create({
      data: {
        slug,
        name: trimmedName,
        description: description?.trim() || null,
        branch,
        ownerId: userId,
    
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
    
        files: {
          create: {
            name: 'README.md',
            path: 'README.md',
            language: 'markdown',
            content: `# ${trimmedName}
    
        Welcome to your CodeSync workspace.
        
        Start collaborating and writing code together!
        `,
          },
        },
      },
    
      include: {
        members: true,
        files: true,
      },
    })

    return response.status(201).json({
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description ?? '',
      branch: room.branch,
      members: room.members.length,
      files: room.files.length,
      updatedAt: room.updatedAt,
      ownerId: room.ownerId,
    })
  } catch (error) {
    console.error('Failed to create room:', error)

    return response.status(500).json({
      error: 'room_creation_failed',
    })
  }
})


app.get('/api/rooms/:roomId', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
        folders: true,
        files: true,
      },
    })

    if (!room) {
      return response.status(404).json({
        error: 'room_not_found',
      })
    }

    return response.json(room)
  } catch (error) {
    console.error('Failed to fetch room:', error)

    return response.status(500).json({
      error: 'room_fetch_failed',
    })
  }
})

app.post('/api/rooms/:roomId/join', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)

    const room = await prisma.room.findUnique({
      where: {
        id: roomId,
      },
    })

    if (!room) {
      return response.status(404).json({
        error: 'room_not_found',
      })
    }

    const membership = await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      update: {},
      create: {
        roomId,
        userId,
        role: 'member',
      },
    })

    return response.status(200).json(membership)
  } catch (error) {
    console.error('Failed to join room:', error)

    return response.status(500).json({
      error: 'room_join_failed',
    })
  }
})

app.get('/api/rooms/:roomId/members', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const members = await prisma.roomMember.findMany({
      where: {
        roomId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    return response.json(
      members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    )
  } catch (error) {
    console.error('Failed to fetch room members:', error)

    return response.status(500).json({
      error: 'room_members_fetch_failed',
    })
  }
})

app.delete('/api/rooms/:roomId', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)

    const room = await prisma.room.findUnique({
      where: {
        id: roomId,
      },
    })

    if (!room) {
      return response.status(404).json({
        error: 'room_not_found',
      })
    }

    if (room.ownerId !== userId) {
      return response.status(403).json({
        error: 'room_owner_required',
      })
    }

    await prisma.room.delete({
      where: {
        id: roomId,
      },
    })

    return response.status(204).send()
  } catch (error) {
    console.error('Failed to delete room:', error)

    return response.status(500).json({
      error: 'room_delete_failed',
    })
  }
})

app.get(
  '/api/rooms/:roomId/search',
  requireAuth,
  async (request, response) => {
    try {
      const userId = response.locals.userId as string
      const roomId = String(request.params.roomId)
      const query =
        typeof request.query.q === 'string'
          ? request.query.q.trim()
          : ''

      if (!query) {
        return response.status(400).json({
          error: 'search_query_required',
          message: 'Enter something to search for.',
        })
      }

      if (query.length > 100) {
        return response.status(400).json({
          error: 'search_query_too_long',
          message: 'Search query cannot exceed 100 characters.',
        })
      }

      // Verify that the user belongs to this room.
      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      })

      if (!membership) {
        return response.status(403).json({
          error: 'room_membership_required',
        })
      }

      // Search file names, paths and contents.
      const files = await prisma.file.findMany({
        where: {
          roomId,
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              path: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          path: true,
          content: true,
        },
        orderBy: {
          path: 'asc',
        },
        take: 50,
      })

      const normalizedQuery = query.toLowerCase()

      const results = files.map((file) => {
        const lines = (file.content ?? '').split(/\r?\n/)

        const matches = lines
          .map((line, index) => ({
            line: index + 1,
            content: line.trim(),
          }))
          .filter((match) =>
            match.content.toLowerCase().includes(normalizedQuery),
          )
          .slice(0, 5)

        return {
          id: file.id,
          name: file.name,
          path: file.path,
          matches,
          matchedInPath:
            file.path.toLowerCase().includes(normalizedQuery) ||
            file.name.toLowerCase().includes(normalizedQuery),
          totalMatches: lines.filter((line) =>
            line.toLowerCase().includes(normalizedQuery),
          ).length,
        }
      })

      return response.json({
        query,
        totalResults: results.length,
        results,
      })
    } catch (error) {
      console.error('Room search failed:', error)

      return response.status(500).json({
        error: 'room_search_failed',
        message: 'Unable to search this workspace.',
      })
    }
  },
)

app.get('/api/rooms/:roomId/files', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const files = await prisma.file.findMany({
      where: {
        roomId,
      },
      orderBy: {
        path: 'asc',
      },
    })

    return response.json(files)
  } catch (error) {
    console.error('Failed to fetch room files:', error)

    return response.status(500).json({
      error: 'room_files_fetch_failed',
    })
  }
})

app.post('/api/rooms/:roomId/files', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const {
      name,
      path,
      language = 'typescript',
      content = '',
      folderId = null,
    } = request.body as {
      name?: string
      path?: string
      language?: string
      content?: string
      folderId?: string | null
    }

    if (!name || !path) {
      return response.status(400).json({
        error: 'name_and_path_required',
      })
    }

    const file = await prisma.file.create({
      data: {
        roomId,
        folderId,
        name,
        path,
        language,
        content,
      },
    })

    return response.status(201).json(file)
  } catch (error) {
    console.error('Failed to create room file:', error)

    return response.status(500).json({
      error: 'room_file_create_failed',
    })
  }
})

app.patch('/api/rooms/:roomId/files/:fileId', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)
    const fileId = String(request.params.fileId)

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const existingFile = await prisma.file.findFirst({
      where: {
        id: fileId,
        roomId,
      },
    })

    if (!existingFile) {
      return response.status(404).json({
        error: 'file_not_found',
      })
    }

    const {
      name,
      path,
      language,
      content,
      folderId,
    } = request.body as {
      name?: string
      path?: string
      language?: string
      content?: string
      folderId?: string | null
    }

    const file = await prisma.file.update({
      where: {
        id: fileId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(path !== undefined && { path }),
        ...(language !== undefined && { language }),
        ...(content !== undefined && { content }),
        ...(folderId !== undefined && { folderId }),
        version: {
          increment: 1,
        },
      },
    })

    return response.json(file)
  } catch (error) {
    console.error('Failed to update room file:', error)

    return response.status(500).json({
      error: 'room_file_update_failed',
    })
  }
})

app.patch(
  '/api/rooms/:roomId/folders/:folderId/move',
  requireAuth,
  async (request, response) => {
    try {
      const userId = response.locals.userId as string
      const roomId = String(request.params.roomId)
      const folderId = String(request.params.folderId)

      const { parentId = null } = request.body as {
        parentId?: string | null
      }

      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      })

      if (!membership) {
        return response.status(403).json({
          error: 'room_membership_required',
        })
      }

      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          roomId,
        },
      })

      if (!folder) {
        return response.status(404).json({
          error: 'folder_not_found',
        })
      }

      // Moving to workspace root.
      if (!parentId) {
        const updated = await prisma.$transaction(async (tx) => {
          const updatedFolder = await tx.folder.update({
            where: { id: folderId },
            data: { parentId: null },
          })

          const descendantFolders =
            await tx.folder.findMany({
              where: { roomId },
              select: {
                id: true,
                parentId: true,
              },
            })

          const folderMap = new Map(
            descendantFolders.map((item) => [
              item.id,
              item,
            ]),
          )

          const descendantIds = new Set<string>()

          const collectDescendants = (
            currentId: string,
          ) => {
            descendantIds.add(currentId)

            descendantFolders
              .filter(
                (item) =>
                  item.parentId === currentId,
              )
              .forEach((child) => {
                if (
                  !descendantIds.has(child.id)
                ) {
                  collectDescendants(child.id)
                }
              })
          }

          collectDescendants(folderId)

          const affectedFiles =
            await tx.file.findMany({
              where: {
                roomId,
                folderId: {
                  in: [...descendantIds],
                },
              },
              select: {
                id: true,
                name: true,
                path: true,
                folderId: true,
              },
            })

          const folderPaths = new Map<
            string,
            string
          >()

          const getFolderPath = (
            currentId: string,
          ): string => {
            if (folderPaths.has(currentId)) {
              return folderPaths.get(currentId)!
            }

            const current =
              folderMap.get(currentId)

            if (!current?.parentId) {
              const result =
                currentId === folderId
                  ? folder.name
                  : ''

              folderPaths.set(
                currentId,
                result,
              )

              return result
            }

            const parentPath =
              getFolderPath(current.parentId)

            const result = parentPath
              ? `${parentPath}/${folderMap.get(currentId)?.id ?? currentId}`
              : currentId

            folderPaths.set(
              currentId,
              result,
            )

            return result
          }

          // Rebuild paths from actual folder names.
          const folders = await tx.folder.findMany({
            where: {
              roomId,
              id: {
                in: [...descendantIds],
              },
            },
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          })

          const folderById = new Map(
            folders.map((item) => [
              item.id,
              item,
            ]),
          )

          const buildPath = (
            currentId: string,
          ): string => {
            const current =
              folderById.get(currentId)

            if (!current) return ''

            if (
              current.id === folderId ||
              !current.parentId ||
              !descendantIds.has(
                current.parentId,
              )
            ) {
              return current.name
            }

            const parentPath =
              buildPath(current.parentId)

            return parentPath
              ? `${parentPath}/${current.name}`
              : current.name
          }

          for (const file of affectedFiles) {
            const fileFolderPath =
              file.folderId
                ? buildPath(file.folderId)
                : ''

            const newPath = fileFolderPath
              ? `${fileFolderPath}/${file.name}`
              : file.name

            await tx.file.update({
              where: { id: file.id },
              data: { path: newPath },
            })
          }

          return {
            folder: updatedFolder,
            files: affectedFiles.map(
              (file) => ({
                id: file.id,
                folderId: file.folderId,
                name: file.name,
              }),
            ),
          }
        })

        return response.json(updated)
      }

      // Parent must belong to this room.
      const parent = await prisma.folder.findFirst({
        where: {
          id: parentId,
          roomId,
        },
      })

      if (!parent) {
        return response.status(404).json({
          error: 'parent_folder_not_found',
        })
      }

      // Prevent moving a folder inside itself.
      if (parentId === folderId) {
        return response.status(400).json({
          error: 'folder_cannot_contain_itself',
        })
      }

      // Prevent circular folder trees.
      const allFolders = await prisma.folder.findMany({
        where: { roomId },
        select: {
          id: true,
          parentId: true,
        },
      })

      const descendants = new Set<string>()

      const collect = (currentId: string) => {
        descendants.add(currentId)

        allFolders
          .filter(
            (item) =>
              item.parentId === currentId,
          )
          .forEach((child) => {
            if (!descendants.has(child.id)) {
              collect(child.id)
            }
          })
      }

      collect(folderId)

      if (descendants.has(parentId)) {
        return response.status(400).json({
          error: 'folder_move_would_create_cycle',
        })
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const updatedFolder =
            await tx.folder.update({
              where: { id: folderId },
              data: { parentId },
            })

          const roomFolders =
            await tx.folder.findMany({
              where: {
                roomId,
                id: {
                  in: [...descendants],
                },
              },
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            })

          const folderById = new Map(
            roomFolders.map((item) => [
              item.id,
              item,
            ]),
          )

          const buildPath = (
            currentId: string,
          ): string => {
            const current =
              folderById.get(currentId)

            if (!current) {
              if (currentId === parentId) {
                return parent.name
              }

              return ''
            }

            if (!current.parentId) {
              return current.name
            }

            if (
              current.parentId === parentId
            ) {
              return `${parent.name}/${current.name}`
            }

            const parentPath =
              buildPath(current.parentId)

            return parentPath
              ? `${parentPath}/${current.name}`
              : current.name
          }

          const affectedFiles =
            await tx.file.findMany({
              where: {
                roomId,
                folderId: {
                  in: [...descendants],
                },
              },
              select: {
                id: true,
                name: true,
                folderId: true,
              },
            })

          const updatedFiles = []

          for (const file of affectedFiles) {
            if (!file.folderId) continue

            const folderPath = buildPath(
              file.folderId,
            )

            const newPath = folderPath
              ? `${folderPath}/${file.name}`
              : file.name

            const updatedFile =
              await tx.file.update({
                where: {
                  id: file.id,
                },
                data: {
                  path: newPath,
                },
              })

            updatedFiles.push({
              id: updatedFile.id,
              folderId:
                updatedFile.folderId,
              name: updatedFile.name,
              path: updatedFile.path,
            })
          }

          return {
            folder: updatedFolder,
            files: updatedFiles,
          }
        },
      )

      return response.json(result)
    } catch (error) {
      console.error(
        'Failed to move folder:',
        error,
      )

      return response.status(500).json({
        error: 'folder_move_failed',
      })
    }
  },
)

app.delete(
  '/api/rooms/:roomId/files/:fileId',
  requireAuth,
  async (request, response) => {
    try {
      const userId = response.locals.userId as string
      const roomId = String(request.params.roomId)
      const fileId = String(request.params.fileId)

      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      })

      if (!membership) {
        return response.status(403).json({
          error: 'room_membership_required',
        })
      }

      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          roomId,
        },
      })

      if (!file) {
        return response.status(404).json({
          error: 'file_not_found',
        })
      }

      await prisma.file.delete({
        where: {
          id: fileId,
        },
      })

      return response.status(204).send()
    } catch (error) {
      console.error('Failed to delete file:', error)

      return response.status(500).json({
        error: 'file_delete_failed',
      })
    }
  },
)

app.post('/api/rooms/:roomId/folders', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const {
      name,
      parentId = null,
    } = request.body as {
      name?: string
      parentId?: string | null
    }

    const trimmedName = name?.trim()

    if (!trimmedName) {
      return response.status(400).json({
        error: 'folder_name_required',
      })
    }

    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: {
          id: parentId,
          roomId,
        },
      })

      if (!parent) {
        return response.status(404).json({
          error: 'parent_folder_not_found',
        })
      }
    }

    const folder = await prisma.folder.create({
      data: {
        roomId,
        parentId,
        name: trimmedName,
      },
    })

    return response.status(201).json(folder)
  } catch (error) {
    console.error('Failed to create folder:', error)

    return response.status(500).json({
      error: 'folder_create_failed',
    })
  }
})

app.patch('/api/rooms/:roomId/folders/:folderId', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)
    const folderId = String(request.params.folderId)

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        roomId,
      },
    })

    if (!existingFolder) {
      return response.status(404).json({
        error: 'folder_not_found',
      })
    }

    const {
      name,
      parentId,
    } = request.body as {
      name?: string
      parentId?: string | null
    }

    const folder = await prisma.folder.update({
      where: {
        id: folderId,
      },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(parentId !== undefined && { parentId }),
      },
    })

    return response.json(folder)
  } catch (error) {
    console.error('Failed to update folder:', error)

    return response.status(500).json({
      error: 'folder_update_failed',
    })
  }
})

app.delete('/api/rooms/:roomId/folders/:folderId', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)
    const folderId = String(request.params.folderId)

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        roomId,
      },
    })

    if (!folder) {
      return response.status(404).json({
        error: 'folder_not_found',
      })
    }

    await prisma.folder.delete({
      where: {
        id: folderId,
      },
    })

    return response.status(204).send()
  } catch (error) {
    console.error('Failed to delete folder:', error)

    return response.status(500).json({
      error: 'folder_delete_failed',
    })
  }
})

app.get('/api/rooms/:roomId/messages', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 200,
    })

    return response.json(messages)
  } catch (error) {
    console.error('Failed to fetch room messages:', error)

    return response.status(500).json({
      error: 'room_messages_fetch_failed',
    })
  }
})

app.post('/api/rooms/:roomId/messages', requireAuth, async (request, response) => {
  try {
    const userId = response.locals.userId as string
    const roomId = String(request.params.roomId)
    const body = String(request.body?.body ?? '').trim()

    if (!body) {
      return response.status(400).json({
        error: 'message_body_required',
      })
    }

    const membership = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    })

    if (!membership) {
      return response.status(403).json({
        error: 'room_membership_required',
      })
    }

    const message = await prisma.message.create({
      data: {
        roomId,
        userId,
        body,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return response.status(201).json(message)
  } catch (error) {
    console.error('Failed to create room message:', error)

    return response.status(500).json({
      error: 'room_message_create_failed',
    })
  }
})

app.get('/api/dashboard/stats', requireAuth, async (_request, response) => {
  try {
    const userId = response.locals.userId as string

    const membershipRows = await prisma.roomMember.findMany({
      where: {
        userId,
      },
      select: {
        roomId: true,
      },
    })

    const roomIds = membershipRows.map((row) => row.roomId)

    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)

    const day = startOfWeek.getDay()
    const diff = day === 0 ? 6 : day - 1

    startOfWeek.setDate(startOfWeek.getDate() - diff)

    const [
      activeRooms,
      collaboratorRows,
      runsThisWeek,
      passedRuns,
      githubAccount,
    ] = await Promise.all([
      prisma.roomMember.count({
        where: {
          userId,
        },
      }),

      prisma.roomMember.findMany({
        where: {
          roomId: {
            in: roomIds,
          },
        },
        distinct: ['userId'],
        select: {
          userId: true,
        },
      }),

      prisma.execution.count({
        where: {
          roomId: {
            in: roomIds,
          },
          createdAt: {
            gte: startOfWeek,
          },
        },
      }),

      prisma.execution.count({
        where: {
          roomId: {
            in: roomIds,
          },
          createdAt: {
            gte: startOfWeek,
          },
          status: 'success',
        },
      }),

      prisma.oAuthAccount.findFirst({
        where: {
          userId,
          provider: 'github',
        },
      }),
    ])

    const collaborators = collaboratorRows.filter(
      (row) => row.userId !== userId,
    ).length

    return response.json({
      activeRooms,
      collaborators,
      runsThisWeek,
      passedRuns,
      githubConnected: Boolean(githubAccount),
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)

    return response.status(500).json({
      error: 'dashboard_stats_failed',
    })
  }
})

const JUDGE0_PENDING_STATUSES = new Set([1, 2])

// Submit code for asynchronous execution.
app.post('/api/execution/run', requireAuth, async (request, response) => {
  const judge0Url = process.env.JUDGE0_URL?.replace(/\/+$/, '')

  if (!judge0Url) {
    return response.status(503).json({
      error: 'judge0_not_configured',
      message: 'Code execution is not configured.',
    })
  }

  const { language_id, source_code, stdin } = request.body ?? {}

  if (
    !Number.isInteger(language_id) ||
    typeof source_code !== 'string' ||
    source_code.length === 0
  ) {
    return response.status(400).json({
      error: 'invalid_execution_request',
    })
  }

  try {
    const upstream = await fetch(
      `${judge0Url}/submissions?base64_encoded=false&wait=false`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language_id,
          source_code,
          stdin: typeof stdin === 'string' ? stdin : '',
        }),
        signal: AbortSignal.timeout(15000),
      },
    )

    const data = await upstream.json()

    if (!upstream.ok) {
      return response.status(upstream.status).json(data)
    }

    if (!data.token) {
      return response.status(502).json({
        error: 'judge0_invalid_response',
      })
    }

    return response.status(202).json({
      token: data.token,
    })
  } catch (error) {
    console.error('Judge0 submission failed:', error)

    return response.status(502).json({
      error: 'judge0_unavailable',
    })
  }
})

// Retrieve submission status/result.
app.get(
  '/api/execution/:token',
  requireAuth,
  async (request, response) => {
    const judge0Url = process.env.JUDGE0_URL?.replace(/\/+$/, '')
    const tokenParam = request.params.token

    const token = Array.isArray(tokenParam)
      ? tokenParam[0]
      : tokenParam

    if (!judge0Url) {
      return response.status(503).json({
        error: 'judge0_not_configured',
      })
    }

    if (!/^[a-f0-9-]{20,64}$/i.test(token)) {
      return response.status(400).json({
        error: 'invalid_submission_token',
      })
    }

    try {
      const upstream = await fetch(
        `${judge0Url}/submissions/${encodeURIComponent(token)}?base64_encoded=false`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        },
      )

      const data = await upstream.json()

      if (!upstream.ok) {
        return response.status(upstream.status).json(data)
      }

      return response.json({
        ...data,
        pending: JUDGE0_PENDING_STATUSES.has(data.status?.id),
      })
    } catch (error) {
      console.error('Judge0 result retrieval failed:', error)

      return response.status(502).json({
        error: 'judge0_unavailable',
      })
    }
  },
)


type GithubRepository = {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  owner: {
    login: string
  }
}

app.get(
  '/api/github/repositories',
  requireAuth,
  async (_request, response) => {
    try {
      const userId = response.locals.userId as string

      // Retrieve this CodeSync user's GitHub token.
      const githubAccount = await prisma.oAuthAccount.findFirst({
        where: {
          userId,
          provider: 'github',
        },
        select: {
          accessToken: true,
        },
      })

      if (!githubAccount?.accessToken) {
        return response.status(403).json({
          error: 'github_connection_required',
          message: 'Connect your GitHub account first.',
        })
      }

      // Fetch repositories belonging to this GitHub user.
      const repositories =
        await githubRequest<GithubRepository[]>(
          githubAccount.accessToken,
          '/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member',
        )

      return response.json(
        repositories.map((repo) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          html_url: repo.html_url,
          default_branch: repo.default_branch,
          owner: repo.owner.login,
        })),
      )
    } catch (error) {
      console.error('GitHub repositories fetch failed:', error)

      if (error instanceof GithubApiError) {
        return response.status(
          error.status === 401 ? 401 : 502,
        ).json({
          error: 'github_api_failed',
          message: error.message,
        })
      }

      return response.status(500).json({
        error: 'github_repositories_fetch_failed',
      })
    }
  },
)


type GithubGitRef = {
  object: {
    sha: string
  }
}

type GithubGitCommit = {
  tree: {
    sha: string
  }
}

type GithubCreatedCommit = {
  sha: string
  html_url: string
}

type GithubCreatedTree = {
  sha: string
}

app.post(
  '/api/github/commit',
  requireAuth,
  async (request, response) => {
    try {
      const userId = response.locals.userId as string

      const {
        roomId,
        repository,
        branch,
        message,
      } = request.body as {
        roomId?: string
        repository?: string
        branch?: string
        message?: string
      }

      // Validate request.
      if (!roomId || !repository || !branch || !message?.trim()) {
        return response.status(400).json({
          error: 'commit_fields_required',
          message: 'Room, repository, branch and commit message are required.',
        })
      }

      // Repository must be in owner/repository format.
      const repositoryParts = repository.split('/')

      if (
        repositoryParts.length !== 2 ||
        !repositoryParts.every((part) =>
          /^[a-zA-Z0-9_.-]+$/.test(part),
        )
      ) {
        return response.status(400).json({
          error: 'invalid_repository',
        })
      }

      const [owner, repo] = repositoryParts

      // Prevent invalid branch names.
      if (
        branch.startsWith('/') ||
        branch.endsWith('/') ||
        branch.includes('..') ||
        branch.includes('//') ||
        /[\s~^:?*[\]\\]/.test(branch)
      ) {
        return response.status(400).json({
          error: 'invalid_branch',
        })
      }

      // Verify that the user belongs to this room.
      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      })

      if (!membership) {
        return response.status(403).json({
          error: 'room_membership_required',
        })
      }

      // Retrieve this user's GitHub OAuth token.
      const githubAccount = await prisma.oAuthAccount.findFirst({
        where: {
          userId,
          provider: 'github',
        },
        select: {
          accessToken: true,
        },
      })

      if (!githubAccount?.accessToken) {
        return response.status(403).json({
          error: 'github_connection_required',
          message: 'Connect your GitHub account first.',
        })
      }

      const accessToken = githubAccount.accessToken

      // Load workspace files from the database.
      const files = await prisma.file.findMany({
        where: {
          roomId,
        },
        orderBy: {
          path: 'asc',
        },
        select: {
          path: true,
          content: true,
        },
      })

      if (files.length === 0) {
        return response.status(400).json({
          error: 'empty_workspace',
          message: 'There are no files to commit.',
        })
      }

      // Validate paths before sending them to GitHub.
      for (const file of files) {
        const segments = file.path.split('/')

        if (
          !file.path ||
          file.path.startsWith('/') ||
          file.path.includes('\\') ||
          segments.some(
            (segment) =>
              !segment || segment === '.' || segment === '..',
          )
        ) {
          return response.status(400).json({
            error: 'invalid_workspace_file_path',
            message: `Invalid file path: ${file.path}`,
          })
        }
      }

      // 1. Get the current target branch reference.
      const encodedBranch = encodeURIComponent(branch)
      const repoEndpoint = `/repos/${owner}/${repo}`

      const branchRef = await githubRequest<GithubGitRef>(
        accessToken,
        `${repoEndpoint}/git/ref/heads/${encodedBranch}`,
      )

      // 2. Get the current commit and its tree.
      const parentCommit = await githubRequest<GithubGitCommit>(
        accessToken,
        `${repoEndpoint}/git/commits/${branchRef.object.sha}`,
      )

      // 3. Create a new Git tree containing workspace files.
      const tree = await githubRequest<GithubCreatedTree>(
        accessToken,
        `${repoEndpoint}/git/trees`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base_tree: parentCommit.tree.sha,
            tree: files.map((file) => ({
              path: file.path,
              mode: '100644',
              type: 'blob',
              content: file.content,
            })),
          }),
        },
      )

      // 4. Create the Git commit.
      const commit = await githubRequest<GithubCreatedCommit>(
        accessToken,
        `${repoEndpoint}/git/commits`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message.trim(),
            tree: tree.sha,
            parents: [branchRef.object.sha],
          }),
        },
      )

      // 5. Update the branch to point to the new commit.
      await githubRequest(
        accessToken,
        `${repoEndpoint}/git/refs/heads/${encodedBranch}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sha: commit.sha,
            force: false,
          }),
        },
      )

      return response.status(201).json({
        success: true,
        message: 'Workspace committed successfully.',
        commit: {
          sha: commit.sha,
          url: commit.html_url,
        },
        repository,
        branch,
        filesCommitted: files.length,
      })
    } catch (error) {
      console.error('GitHub commit failed:', error)

      if (error instanceof GithubApiError) {
        return response.status(
          error.status === 401
            ? 401
            : error.status === 404
              ? 404
              : error.status === 409
                ? 409
                : 502,
        ).json({
          error: 'github_commit_failed',
          message: error.message,
        })
      }

      return response.status(500).json({
        error: 'github_commit_internal_error',
        message: 'An unexpected error occurred while committing.',
      })
    }
  },
)


const roomPresence = new Map<
  string,
  Map<
    string,
    {
      id: string
      name: string
      email: string
      avatarUrl: string | null
    }
  >
>()

io.on('connection', (socket) => {
  const user = socket.data.user as {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }

  socket.on('room:join', async ({ roomId }) => {
    try {
      const id = String(roomId)
  
      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: id,
            userId: user.id,
          },
        },
      })
  
      if (!membership) {
        socket.emit('room:error', {
          error: 'room_membership_required',
        })
        return
      }
  
      socket.join(id)
  
      let presence = roomPresence.get(id)
  
      if (!presence) {
        presence = new Map()
        roomPresence.set(id, presence)
      }
  
      presence.set(socket.id, user)
  
      const onlineUsers = Array.from(presence.values())
  
      io.to(id).emit('room:presence', {
        roomId: id,
        users: onlineUsers,
      })
  
      socket.to(id).emit('room:join', {
        roomId: id,
        user,
      })
    } catch (error) {
      console.error('Socket room join failed:', error)
  
      socket.emit('room:error', {
        error: 'room_join_failed',
      })
    }
  })

  socket.on('room:leave', ({ roomId }) => {
    const id = String(roomId)
    const presence = roomPresence.get(id)
  
    if (presence) {
      presence.delete(socket.id)
  
      if (presence.size === 0) {
        roomPresence.delete(id)
      }
    }
  
    socket.leave(id)
  
    const onlineUsers = presence
      ? Array.from(presence.values())
      : []
  
    io.to(id).emit('room:presence', {
      roomId: id,
      users: onlineUsers,
    })
  
    socket.to(id).emit('room:leave', {
      roomId: id,
      userId: user.id,
    })
  })

  socket.on('file:change', ({ roomId, fileId, content, version }) => {
    socket.to(String(roomId)).emit('file:change', {
      roomId: String(roomId),
      fileId,
      content,
      version,
      userId: user.id,
    })
  })

  socket.on('file:sync', (payload) => {
    socket.to(String(payload.roomId)).emit('file:sync', {
      ...payload,
      userId: user.id,
    })
  })

  socket.on('language:change', (payload) => {
    socket.to(String(payload.roomId)).emit('language:change', {
      ...payload,
      userId: user.id,
    })
  })

  socket.on(
    'file:create',
    (payload) => {
      socket.to(payload.roomId).emit(
        'file:create',
        payload,
      )
    },
  )

  socket.on(
    'file:delete',
    (payload) => {
      socket.to(payload.roomId).emit(
        'file:delete',
        payload,
      )
    },
  )
  
  socket.on(
    'folder:create',
    (payload) => {
      socket.to(payload.roomId).emit(
        'folder:create',
        payload,
      )
    },
  )

  socket.on(
    'folder:delete',
    (payload) => {
      socket.to(payload.roomId).emit(
        'folder:delete',
        payload,
      )
    },
  )

  socket.on(
    'file:rename',
    (payload) => {
      socket.to(payload.roomId).emit(
        'file:rename',
        payload,
      )
    },
  )
  
  socket.on(
    'folder:rename',
    (payload) => {
      socket.to(payload.roomId).emit(
        'folder:rename',
        payload,
      )
    },
  )

  socket.on(
    'file:move',
    (payload) => {
      socket.to(payload.roomId).emit(
        'file:move',
        payload,
      )
    },
  )

  socket.on(
    'folder:move',
    (payload) => {
      socket.to(payload.roomId).emit(
        'folder:move',
        payload,
      )
    },
  )

  socket.on('cursor:move', (payload) => {
    socket.to(String(payload.roomId)).emit('cursor:move', {
      ...payload,
      userId: user.id,
    })
  })

  socket.on('chat:message', async (payload) => {
    try {
      const roomId = String(payload.roomId)
      const text = String(payload.text ?? '').trim()
  
      if (!text) return
  
      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: user.id,
          },
        },
      })
  
      if (!membership) {
        socket.emit('room:error', {
          error: 'room_membership_required',
        })
        return
      }
  
      const message = await prisma.message.create({
        data: {
          roomId,
          userId: user.id,
          body: text,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      })
  
      io.to(roomId).emit('chat:message', {
        roomId,
        id: message.id,
        userId: user.id,
        author: message.user?.name ?? user.name,
        avatarUrl: message.user?.avatarUrl ?? user.avatarUrl,
        text: message.body,
        createdAt: message.createdAt,
      })
    } catch (error) {
      console.error('Socket chat message failed:', error)
  
      socket.emit('room:error', {
        error: 'chat_message_failed',
      })
    }
  })

  socket.on('disconnect', () => {
    for (const [roomId, presence] of roomPresence.entries()) {
      if (!presence.has(socket.id)) continue
  
      presence.delete(socket.id)
  
      if (presence.size === 0) {
        roomPresence.delete(roomId)
      }
  
      io.to(roomId).emit('room:presence', {
        roomId,
        users: Array.from(presence.values()),
      })
  
      io.to(roomId).emit('room:leave', {
        roomId,
        userId: user.id,
      })
    }
  })
})

server.listen(port, '0.0.0.0', () => console.log(`CodeSync API listening on ${port}`))
