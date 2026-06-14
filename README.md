# CampusPulse — Unified Campus Intelligence Dashboard with AI Assistant

> **One-Line Pitch**: A database-free, live-federated campus intelligence hub connecting student services (library, cafeteria, events, academics, transport) via Model Context Protocol (MCP) servers and orchestrating queries through a lightning-fast Groq-powered AI assistant.

![Dashboard Demo Placeholder](https://via.placeholder.com/1200x600.png?text=CampusPulse+Dashboard+Mockup)

---

## 1. Problem Statement & Solution

**The Problem**: College campus information is notoriously fragmented. Library catalogs, daily mess menus, club event sheets, academic policy handbooks, and transit schedules all live on separate portals, PDFs, or boards. Syncing all of this into a monolithic database causes data staleness, system latency, and massive sync overhead.

**The Solution**: CampusPulse unifies these systems using a **federated Model Context Protocol (MCP)** architecture. Each campus service maintains its own data source and runs an independent HTTP/SSE MCP server. A centralized Express.js orchestrator uses Groq's high-speed inference to dynamically call the exact tools needed for a student's query, compiling a single source-attributed response on the fly.

---

## 2. High-Level Architecture

```
                         ┌─────────────────────────────┐
                         │     Next.js Frontend         │
                         │  Dashboard + AI Chat UI       │
                         └───────────────┬───────────────┘
                                          │ REST / SSE (streaming)
                         ┌───────────────▼───────────────┐
                         │      Orchestrator Service       │
                         │  - LLM w/ tool/function calling │
                         │  - MCP Client (multi-server)    │
                         │  - Query routing & synthesis    │
                         │  - Source attribution layer     │
                         └───┬───────┬───────┬───────┬────┘
                              │       │       │       │   (MCP over Streamable HTTP)
                  ┌───────────┘   ┌───┘   ┌───┘   ┌───┘────────┐
            ┌─────▼─────┐  ┌──────▼───┐ ┌─▼──────┐ ┌──▼──────────┐ ┌──────────────┐
            │  Library   │  │ Cafeteria │ │ Events │ │  Academics   │ │ Notices/Trans │
            │ MCP Server │  │MCP Server │ │MCP Srv │ │  MCP Server  │ │ MCP Server(s) │
            └────────────┘  └───────────┘ └────────┘ └──────────────┘ └──────────────┘
```

CampusPulse eliminates a centralized scraper database. When a student asks: *"Is Clean Code available and what's for dinner?"*, the orchestrator makes live parallel HTTP calls to the Library and Cafeteria MCP servers via SSE transport, receives the current states, and streams the compiled response to the user.

---

## 3. Key Features

- **Unified Home Dashboard**: Real-time snapshot widgets (Library Search, Cafeteria Menu, Academic Policies, Transit Shuttle Schedules, Upcoming Events).
- **Groq-Powered AI Assistant**: A chat system with parallel and sequential tool calling, powered by Groq's LPU-speed `llama-3.1-8b-instant` model.
- **Live Tool Call Visibility**: Collapsible panel chips displaying the exact JSON payloads sent/received from MCP servers in the chat UI.
- **Graceful Degradation**: Auto-detects if an MCP server goes down, notifying the user rather than crashing or hallucinating.
- **Dynamic Live Demo Event Sync**: Events dynamically update dates at server start relative to the current runtime date.
- **System Health Monitor**: Live dot indicators showing the connection state and latencies of all five MCP servers.
- **Personalized Experience**: NextAuth credentials login allows student accounts to access customized feeds (e.g. library loans, dietary preferences).

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, lucide-react |
| **Orchestrator** | Node.js, TypeScript, Express, `@modelcontextprotocol/sdk` (MCP Client) |
| **MCP Servers** | **Node.js/TS**: Library, Events, Notices/Transport<br>**Python/FastAPI**: Cafeteria, Academics |
| **LLM Provider** | GroqCloud (`llama-3.1-8b-instant`) via OpenAI SDK |
| **Transport** | MCP Server-Sent Events (SSE) over Streamable HTTP |
| **Auth** | NextAuth.js (Credentials-based demo accounts) |

---

## 5. Local Setup Instructions

### Prerequisites
- Node.js 18+ (verified on v24.16.0)
- Python 3.10+ (verified on 3.12.7)
- Docker & Docker Compose (optional for quick-start)

> [!WARNING]
> **OneDrive Synchronization Warning (Windows Users)**
> This workspace is under a OneDrive folder (`C:/Users/vansh/OneDrive/Desktop/audoaudo`). 
> Heavy folders like `node_modules`, `.next`, `dist`, and python virtual environments `.venv` **must be excluded** from OneDrive synchronization. OneDrive sync on these active folders causes compilation file-locks, infinite sync loops, and slow execution. 
> Ensure your system is not syncing these folders!

### Environment Variables
Configure the environment variables in a `.env` file inside `./orchestrator`:
```env
PORT=4000
GROQ_API_KEY=your_groq_api_key_here
# Local URL endpoints for MCP servers
LIBRARY_SERVER_URL=http://localhost:5001
CAFETERIA_SERVER_URL=http://localhost:5002
EVENTS_SERVER_URL=http://localhost:5003
ACADEMICS_SERVER_URL=http://localhost:5004
NOTICES_TRANSPORT_SERVER_URL=http://localhost:5005
```

Create a `.env` file in `./frontend`:
```env
PORT=3000
NEXT_PUBLIC_ORCHESTRATOR_URL=http://localhost:4000
NEXTAUTH_SECRET=generate-a-long-random-string-here
NEXTAUTH_URL=http://localhost:3000
```

> **How to get a Groq API Key**: Log in at [console.groq.com](https://console.groq.com/), navigate to **API Keys**, and click **Create API Key**. Groq offers a generous free tier.

---

### Option A: Quick Start with Docker Compose
From the root of the project, run:
```bash
docker compose up --build
```
This builds and runs all 7 services. The frontend will be available at `http://localhost:3000`.

---

### Option B: Manual Per-Service Local Run

#### 1. Setup Node.js MCP Servers & Orchestrator
```bash
# Install root dependencies
npm install

# Install dependencies for Node.js MCP servers & orchestrator
npm run install:all
```

#### 2. Setup Python MCP Servers
Set up virtual environments for cafeteria and academics:
```bash
# Cafeteria
cd mcp-servers/cafeteria-server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ../..

# Academics
cd mcp-servers/academics-server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

#### 3. Run all services concurrently
```bash
npm run dev
```

---

## 6. Deployed Links
- **Production Dashboard**: *[Placeholder for Vercel/Railway Deployment]*
- **Demo Walkthrough Video**: *[Placeholder for video]*

---

## 7. Demo Student Accounts

You can sign in to test personalization features using the credentials below:
* **Student A**
  - **Student ID**: `STU12345`
  - **Password**: `student123`
  - *Personalization*: Vegetarian dietary filter, Favorite club: CS Club. Shows borrowed books like "Clean Code".
* **Student B**
  - **Student ID**: `STU67890`
  - **Password**: `student123`
  - *Personalization*: Gluten-free dietary filter, Favorite club: Robotics Club.

---

## 8. Exposed MCP Servers & Tools
See [api-contracts.md](file:///C:/Users/vansh/OneDrive/Desktop/audoaudo/docs/api-contracts.md) for full descriptions of all tools exposed by our 5 servers.

---

## 9. Known Limitations & Future Improvements
- **Mock Data**: Currently, servers load mock JSON records. These can be easily replaced with real REST/GraphQL connectors to library ILS or cafeteria vendor APIs without touching frontend or orchestrator code.
- **Memory/Session**: Chat memory is stored in frontend session state; real deployments would integrate a database like Redis to persist chat sessions.
- **MCP Client Transport**: The codebase uses `SSEServerTransport` and `SSEClientTransport`. Future iterations will explore the new "Streamable HTTP" specifications when they stabilize in the core SDKs.
