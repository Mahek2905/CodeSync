
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  Code2,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  LockKeyhole,
  Radio,
  Sparkles,
  Terminal,
  Zap,
  FolderOpen,
} from 'lucide-react'

import Brand from '../components/common/Brand'
import Avatar from '../components/common/Avatar'
import FeatureCard from '../components/common/FeatureCard'
import CodePreview from '../components/landing/CodePreview'

import { collaborators } from '../data'

type LandingPageProps = {
  onEnter: () => void
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <main className="landing-page">
      <header className="landing-header page-frame">
        <Brand />

        <nav className="landing-nav">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#security">Security</a>
        </nav>

        <div className="landing-actions">
          <Link className="text-button" to="/login">
            Log in
          </Link>

          <button
            className="button button--small button--primary"
            onClick={onEnter}
          >
            Open workspace <ArrowRight size={15} />
          </button>
        </div>
      </header>

      <section className="hero page-frame" id="product">
        <div className="hero__copy">
          <div className="eyebrow eyebrow--pill">
            <span className="live-dot" />
            Built for teams in motion
          </div>

          <h1>
            Ship the fix
            <br />
            <span>from the same room.</span>
          </h1>

          <p className="hero__lede">
            CodeSync is the shared coding room where your team can edit, run,
            review, and commit without leaving the workspace.
          </p>

          <div className="hero__actions">
            <button
              className="button button--primary button--large"
              onClick={onEnter}
            >
              Launch a room <ArrowRight size={17} />
            </button>

            {/* <Link
              className="button button--quiet button--large"
              to="/login"
            >
              Explore the demo
              <span className="button__shortcut">⌘ K</span>
            </Link> */}
          </div>

          <div className="hero__proof">
            <span className="proof-avatars">
              <Avatar user={collaborators[1]} size="sm" />
              <Avatar user={collaborators[2]} size="sm" />
              <Avatar user={collaborators[3]} size="sm" />
            </span>

            <span>
              <strong>4,280</strong> builders already in the loop
            </span>

            <span className="proof-divider" />

            <span className="proof-lock">
              <LockKeyhole size={13} /> private by default
            </span>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero-orbit hero-orbit--one" />
          <div className="hero-orbit hero-orbit--two" />

          <div className="hero-window">
            <div className="hero-window__top">
              <span className="window-dots">
                <i />
                <i />
                <i />
              </span>

              <span className="window-path">
                <span className="iris-square" />
                orbital-console <span>/</span> CommandCenter.tsx
              </span>

              <span className="window-live">
                <span className="live-dot" /> LIVE
              </span>
            </div>

            <div className="hero-window__body">
              <div className="hero-explorer">
                <span className="mini-label">EXPLORER</span>

                <span className="hero-tree-line">
                  <ChevronDown size={11} />
                  <FolderOpen size={13} /> src
                </span>

                <span className="hero-tree-line hero-tree-line--active">
                  <FileCode2 size={12} /> CommandCenter.tsx
                </span>

                <span className="hero-tree-line">
                  <FileCode2 size={12} /> api.ts
                </span>

                <span className="hero-tree-line">
                  <FileCode2 size={12} /> types.ts
                </span>
              </div>

              <div className="hero-code">
                <div className="hero-code__tab">
                  CommandCenter.tsx <span>×</span>
                </div>

                <CodePreview />

                <div className="hero-cursor-tag">
                  Maya <span />
                </div>

                <span className="hero-line-cursor" />
              </div>

              <div className="hero-collab">
                <span className="mini-label">LIVE ROOM</span>

                <div className="hero-collab__avatars">
                  <Avatar user={collaborators[0]} size="md" />
                  <Avatar user={collaborators[1]} size="md" />
                  <Avatar user={collaborators[2]} size="md" />
                </div>

                <span className="hero-presence">
                  <span className="live-dot" /> 3 collaborators online
                </span>

                <div className="hero-chat-bubble">
                  <span
                    className="avatar avatar--xs"
                    style={{ background: '#5eead4' }}
                  >
                    MC
                  </span>

                  <p>
                    <strong>Maya</strong>
                    <br />
                    Looks good — running it now.
                  </p>
                </div>

                <div className="hero-chat-bubble hero-chat-bubble--you">
                  <span
                    className="avatar avatar--xs"
                    style={{ background: '#8b7cff' }}
                  >
                    AM
                  </span>

                  <p>
                    <strong>You</strong>
                    <br />
                    Commit when green?
                  </p>
                </div>
              </div>
            </div>

            <div className="hero-window__bottom">
              <span>
                <Terminal size={12} /> Terminal
              </span>

              <span className="hero-bottom-success">
                <CircleCheck size={12} /> Process exited with code 0
              </span>

              <span className="hero-bottom-time">0.42s</span>
            </div>
          </div>
        </div>
      </section>

      <section className="signal-strip page-frame">
        <div>
          <span className="signal-kicker">
            ONE SHARED SOURCE OF TRUTH
          </span>
          <strong>From first keystroke to first commit</strong>
        </div>

        <div className="signal-items">
          <span><Code2 size={15} /> Edit together</span>
          <span><Zap size={15} /> Run instantly</span>
          <span><GitCommitHorizontal size={15} /> Ship confidently</span>
        </div>
      </section>

      <section className="landing-section page-frame" id="workflow">
        <div className="section-heading">
          <span className="eyebrow">The room is the product</span>

          <h2>
            Everything your team needs
            <br />
            <span>in the flow of the work.</span>
          </h2>
        </div>

        <div className="feature-grid">
          <FeatureCard
            icon={Code2}
            number="01"
            title="A real editor, not a textarea."
            copy="Monaco-powered editing, workspace files, language-aware tooling, and a quiet autosave state that never steals focus."
            tone="iris"
          />

          <FeatureCard
            icon={Radio}
            number="02"
            title="The room stays live."
            copy="Cursors, active users, chat, and file changes travel together over Socket.IO so decisions stay close to the code."
            tone="mint"
          />

          <FeatureCard
            icon={GitBranch}
            number="03"
            title="Commit without context switching."
            copy="Select the repository, review the workspace tree, write a message, and move from green build to GitHub in one pass."
            tone="amber"
          />
        </div>
      </section>

      <section className="quote-band" id="security">
        <div className="page-frame quote-band__inner">
          <div className="quote-mark">“</div>

          <blockquote>
            Less tab hopping. More
            <br />
            <span>shipping together.</span>
          </blockquote>

          <div className="quote-meta">
            <span className="quote-line" />
            <span>CODE SYNC / 2026</span>
          </div>
        </div>
      </section>

      <footer className="landing-footer page-frame">
        <Brand compact />
        <span>Private rooms for public progress.</span>

        <span className="footer-right">
          Built for focused teams <Sparkles size={14} />
        </span>
      </footer>
    </main>
  )
}
