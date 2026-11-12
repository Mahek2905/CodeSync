import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import {
  Strategy as GithubStrategy,
  type Profile as GithubProfile,
} from 'passport-github2'

const jwtSecret = process.env.JWT_SECRET ?? 'replace-me-in-production'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function issueToken(userId: string) {
  return jwt.sign(
    { sub: userId },
    jwtSecret,
    { expiresIn: '30d' },
  )
}

export function verifyToken(token: string) {
  return jwt.verify(token, jwtSecret) as { sub: string }
}

/* =========================
   GOOGLE OAUTH
========================= */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.SERVER_ORIGIN ?? 'http://localhost:4000'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      done(null, {
        profile: {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos,
        },
        accessToken,
        refreshToken,
      } as unknown as Express.User)
    },
  ),
)

/* =========================
   GITHUB OAUTH
========================= */

passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      callbackURL: `${process.env.SERVER_ORIGIN ?? 'http://localhost:4000'}/api/auth/github/callback`,
    },
    (
      accessToken: string,
      refreshToken: string,
      profile: GithubProfile,
      done,
    ) => {
      done(null, {
        profile: {
          id: profile.id,
          displayName: profile.displayName,
          username: profile.username,
          emails: profile.emails,
          photos: profile.photos,
        },
        accessToken,
        refreshToken,
      } as unknown as Express.User)
    },
  ),
)

export default passport