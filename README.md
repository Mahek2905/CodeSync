# CodeSync

**Code together. Code anywhere. Build together.**

CodeSync is a real-time collaborative code editor inspired by VS Code. It provides a shared coding environment where multiple users can work on files, communicate, execute code, and collaborate through a single workspace.

## Features

- **Collaborative Coding:** Edit code in real time with other users in a shared room.
- **Monaco Code Editor:** A VS Code-inspired editing experience with syntax highlighting.
- **Room Management:** Create and work in collaborative coding rooms.
- **File Explorer:** Create, rename, move, and delete files and folders.
- **Workspace Search:** Search for text across files in your workspace.
- **Real-time Chat:** Communicate with other collaborators without leaving the room.
- **Code Execution:** Run supported programming languages and view execution results.
- **Auto Save:** Automatically save workspace changes.
- **GitHub Integration:** Connect your GitHub account, browse repositories, and commit workspace files.
- **Authentication:** Sign in using supported authentication methods.

## Tech Stack

| Area                    | Technologies                          |
| ----------------------- | ------------------------------------- |
| Frontend                | React, TypeScript, Tailwind CSS, Vite |
| Code Editor             | Monaco Editor                         |
| Backend                 | Node.js, Express                      |
| Database                | PostgreSQL, Prisma ORM                |
| Real-time Communication | Socket.IO                             |
| Code Execution          | Judge0, Docker                        |
| Authentication          | JWT, Passport.js, OAuth               |
| Version Control         | GitHub REST API                       |

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- pnpm
- Docker and Docker Compose (for the complete application)

### Option 1: Run the Frontend Preview

To explore the frontend without starting the backend services:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

_Note: The frontend preview may use seeded or demo data. Features requiring the backend will not be fully functional._

### Option 2: Run the Complete Application

**1. Clone the repository**

```bash
git clone <your-repository-url>
cd codesync
```

**2. Configure environment files**

```bash
cp .env.example .env
cp judge0.conf.example judge0.conf
```

Configure the required environment variables and change the default Judge0 passwords in `judge0.conf`.

**3. Start the application**

```bash
docker compose up --build
```

The application will start its frontend, backend, databases, real-time services, and code execution services.

**4. Open CodeSync**

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:4000](http://localhost:4000)
- Judge0 API: [http://localhost:2358](http://localhost:2358)

### Stopping the Application

```bash
docker compose down
```

To remove the containers and all associated database volumes:

```bash
docker compose down -v
```

**Warning:** This permanently deletes your locally stored database and Redis data.

## Upcoming Features

CodeSync is actively under development. The following features are planned and are not yet available:

| Feature                    | Description                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Upload Files & Folders** | Import existing files or entire project folders from local storage into a workspace, allowing users to continue editing their existing code. |
| **Download Workspace**     | Download the complete workspace, including its folder structure and files, as a single ZIP archive.                                          |
| **Integrated Terminal**    | Execute terminal commands directly inside the coding room.                                                                                   |
| **Word Wrap**              | Enable word wrapping in the code editor for better readability of long lines.                                                                |
| **Resizable Panels**       | Resize the Explorer sidebar, collaboration sidebar, and bottom output/terminal panel according to personal preference.                       |

## Security Note

CodeSync uses Judge0 and Docker to execute submitted code. Code execution involves running potentially untrusted programs. Keep development services restricted to localhost and do not expose the execution API publicly without appropriate authentication, isolation, and resource limits.

Never commit `.env`, `judge0.conf`, API tokens, or other sensitive credentials to Git.

## Project Status

CodeSync is an actively developing project. Core collaborative editing, workspace management, chat, code execution, and GitHub integration are implemented. Additional editor capabilities and workspace import/export features are planned.

Contributions, suggestions, and feedback are welcome!

---

**CodeSync — A shared space to write, run, and build code together.**
