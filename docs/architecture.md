# Architecture Documentation - CampusPulse

CampusPulse is built on a federated, database-less architecture. Unlike traditional dashboards that sync all external data sources into a central SQL/NoSQL database (which creates data latency, sync overhead, and compliance risks), CampusPulse queries data sources **live, at query time**.

## High-Level Architecture Diagram

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

## Architectural Components

### 1. Next.js Frontend
- Gathers user inputs and provides a responsive UI.
- Direct widgets request fast, specific data using standard HTTP proxy routes in the Orchestrator (which bypasses the LLM for speed and predictability).
- The Chat Assistant opens a Server-Sent Events (SSE) stream to the Orchestrator, allowing token-by-token text generation and real-time tool-call indicators to show exactly which MCP servers are being queried.

### 2. Orchestrator Service
- Aggregates the toolsets from all 5 MCP servers.
- Uses **GroqCloud**'s LPU-accelerated `llama-3.3-70b-versatile` model for high-speed function calling.
- Operates a robust tool-execution loop capable of processing:
  - **Parallel Calls**: E.g., *"What is for lunch today and is there a book-related event?"* launches `get_today_menu` and `get_upcoming_events` at the same time.
  - **Sequential Calls**: E.g., *"Find book recommendations on Python, check if they are available, and list the library hours."* queries search tools first, then evaluates availability or hours in subsequent turns.
- Formulates source citations, attributing each fact back to the responding server.

### 3. Federated MCP Servers
Each data domain lives in its own microservice:
- **Library (Node/TS)**: Manages book inventory and student reservations.
- **Cafeteria (Python/FastAPI)**: Manages menus, nutrition, and meal slots.
- **Events (Node/TS)**: Tracks upcoming events, clubs, venues, and registrations.
- **Academics (Python/FastAPI)**: Handles course info, student handbook regulations, and academic calendars.
- **Notices & Transport (Node/TS)**: Exposes daily shuttle times, directions, and campus notices.

## Key Advantages
1. **Real-time Integrity**: No batch synchronizations; the system queries live cafeteria menus, library availability, and event sheets.
2. **Polyglot Independence**: Developers can write MCP servers in the language best suited for the legacy data source (e.g., Python for data scraping/FastAPI, Node for enterprise API gateways).
3. **Decoupled Security**: Individual servers handle local data storage (such as raw books JSON or campus handbook files) and expose only standard schemas. The orchestrator never stores or possesses database credentials.
