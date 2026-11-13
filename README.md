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
- **Code Execution:** Execute supported programming languages using the Judge0 CE API and view execution results.
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
| Code Execution          | Judge0 CE Public API                  |
| Authentication          | JWT, Passport.js, OAuth               |
| Version Control         | GitHub REST API                       |

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- pnpm
- Docker and Docker Compose (for running the application services locally)

An internet connection is required for code execution through the public Judge0 CE API.

### Option 1: Run the Frontend Preview

To explore the frontend without starting the backend services:

```bash
pnpm install
pnpm dev
```

Open the local URL displayed by Vite in your browser.

_Note: The frontend preview may use seeded or demo data. Features requiring the backend will not be fully functional._

### Option 2: Run the Complete Application

**1. Clone the repository**

```bash
git clone <your-repository-url>
cd codesync
```

**2. Install dependencies**

```bash
pnpm install
```

**3. Configure environment variables**

Create your local environment files using the provided example files:

```bash
cp .env.example .env
```

Configure the required environment variables for the frontend and backend, including database credentials, JWT configuration, OAuth credentials, and other application settings.

Never commit environment files or sensitive credentials to Git.

**4. Start the application**

```bash
docker compose up --build
```

Docker Compose starts the CodeSync application services and their required local infrastructure, such as PostgreSQL and Redis.

Code execution is handled by the external Judge0 CE public API and does not require a local Judge0 server, worker, database, or Redis instance.

**5. Open CodeSync**

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Judge0 CE API: https://ce.judge0.com

The actual local frontend and backend ports depend on your Docker Compose configuration.

## Stopping the Application

To stop the application containers:

```bash
docker compose down
```

To remove containers and associated database volumes:

```bash
docker compose down -v
```

**Warning:** This permanently deletes locally stored database and Redis data. Use this command only when you intentionally want to reset your local application data.

## Code Execution

CodeSync uses the publicly hosted Judge0 CE API for compiling and executing submitted programs.

The backend communicates with Judge0 through asynchronous submissions and retrieves execution results using submission tokens.

- No locally hosted Judge0 infrastructure is required.
- No local Judge0 Docker image or execution worker is required.
- The Judge0 endpoint is configured through the backend's `JUDGE0_URL` environment variable.
- Execution availability depends on the public service.

**Public API limitations:** The shared public Judge0 CE instance is intended primarily for testing and small-scale use. It does not provide a guaranteed uptime SLA or guaranteed execution quota. Availability, response times, and request restrictions may vary.

For larger-scale production deployments, consider a managed Judge0 subscription or a dedicated self-hosted execution environment.

## Upcoming Features

CodeSync is actively under development. The following features are planned and are not yet available:

| Feature                    | Description                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Upload Files & Folders** | Import existing files or entire project folders from local storage into a workspace.                                   |
| **Download Workspace**     | Download the complete workspace, including its folder structure and files, as a single ZIP archive.                    |
| **Integrated Terminal**    | Execute terminal commands directly inside the coding room.                                                             |
| **Word Wrap**              | Enable word wrapping in the code editor for better readability of long lines.                                          |
| **Resizable Panels**       | Resize the Explorer sidebar, collaboration sidebar, and bottom output/terminal panel according to personal preference. |

## Security Note

CodeSync executes user-submitted programs through the Judge0 CE sandbox.

- Submitted source code and input are sent to the external Judge0 service for execution. Do not submit secrets, credentials, or sensitive private code.
- Keep API credentials and authentication tokens on the backend.
- Never expose private environment variables in frontend code.
- Keep database credentials and OAuth secrets out of version control.
- Apply appropriate authentication, input validation, execution limits, and request throttling.
- Do not expose local development services publicly without appropriate security controls.

Never commit `.env` files, API tokens, passwords, or other sensitive credentials to Git.

## Project Status

CodeSync is an actively developing project. Core collaborative editing, workspace management, chat, code execution, authentication, and GitHub integration are implemented. Additional editor capabilities and workspace import/export features are planned.

Contributions, suggestions, and feedback are welcome!

---

**CodeSync — A shared space to write, run, and build code together.**
