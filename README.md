 Vyapari — AI Accountant

========================



**Short description:**

Vyapari is an AI-powered accountant for small and medium merchants. It provides invoice creation, buyer and sales reporting, inventory checks, analytics, gst, automated embeddings for semantic search, and agent-driven workflows using a language-model based agent. The stack consists of a Python FastAPI backend, Supabase (Postgres + Storage) for persistence, and a modern Next.js + Tailwind frontend.



<img width="300" height="600" alt="image" src="https://github.com/user-attachments/assets/bfb781ad-8674-420e-a834-079540b84786" /> <img width="485" height="900" alt="image" src="https://github.com/user-attachments/assets/7db0b5f8-be18-4dfb-8b2a-caa03dc48821" />  <img width="287" height="595" alt="image" src="https://github.com/user-attachments/assets/f1738964-3bc5-4199-8045-5085f0e2a1f1" /> <img width="287" height="597" alt="image" src="https://github.com/user-attachments/assets/ede834d4-4f83-4e6d-84f6-3f3ef9354537" />

<img width="1919" height="858" alt="image" src="https://github.com/user-attachments/assets/c0de5d2a-13fb-43cc-b75e-a07f79c367f1" />

<img width="1452" height="820" alt="image" src="https://github.com/user-attachments/assets/923a43e8-91ff-40a1-bbcc-6833f6729919" />















**Contents**

- **backend/** — FastAPI services, tools, agent orchestration, PDF generation and embedding pipelines.

- **frontend/** — Next.js (App Router) UI, chat widget, invoice forms, and integrations with the backend.



**Highlights & Features**

- LLM-driven agent for invoice workflows (create, update), searches and reports

- Structured tools with Pydantic validation to avoid schema mismatches

- Supabase-backed persistent memory and storage for invoice PDFs

- Background tasks for embedding generation and asynchronous processing

- Next.js + Tailwind frontend with a chat UI and invoice forms



**Architecture Overview**

- Frontend (Next.js) communicates with the FastAPI backend via REST endpoints.

- Backend exposes higher-level tools (create_invoice, update_invoice, get_sales_summary...) used by an LLM agent.

- Supabase stores invoices, buyer/product data, and generated PDF files in `invoices` storage.

- An embedding service stores invoice text embeddings (Supabase or vector DB) to support semantic search.



Quickstart — Prerequisites

-------------------------

- Node.js (16+)

- pnpm or npm

- Python 3.10+ (recommended)

- PostgreSQL-compatible Supabase project (or Supabase account)

- Environment variables (see below)



Environment Variables

---------------------

Create a `.env` / `.env.local` for frontend and `.env` for backend with the following (example names):



- SUPABASE_URL — Your Supabase project URL

- SUPABASE_KEY — Your Supabase anon/public key (for frontend limited access)

- SUPABASE_SERVICE_ROLE_KEY — Service role key for backend server operations

- SUPABASE_STORAGE_BUCKET — (optional) storage bucket name, default: `invoices`

- GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... — Gemini/Google generative API keys (used by agent)

- OPENAI_API_KEY — (optional) if alternate LLMs are used

- SENTRY_DSN — (optional) for error reporting



Backend — Install & Run

-----------------------

1. Create & activate virtualenv



```powershell

cd backend

python -m venv .venv

.\.venv\Scripts\Activate.ps1   # PowerShell

# or use `source .venv/bin/activate` on mac/linux

```



2. Install requirements



```powershell

pip install -r requirements.txt

```



3. Set required env vars (see above).



4. Run the FastAPI server (development)



```powershell

uvicorn main:app --reload --host 0.0.0.0 --port 8000

```



Important backend notes

- The backend expects Supabase RLS policies to allow the backend service role to write/read conversation memory and invoices. Use `SUPABASE_SERVICE_ROLE_KEY` for server operations.

- Long-running tasks (embedding generation, email sending) are dispatched as background tasks to avoid blocking agent responses.

- Tools and agent orchestration are in `backend/app/api/agents/invoice_agent.py` and tool implementations are in `backend/app/tools/sql_query_tool.py`.

- If you see `ValidationError` or schema-mismatch errors from the LLM, the fix is to keep tool signatures simple (JSON/dict) and validate server-side. The project already follows this pattern.



Frontend — Install & Run

------------------------

1. Install dependencies



```bash

cd frontend

pnpm install   # or npm install

```



2. Create `.env.local` with frontend envs (SUPABASE_URL and SUPABASE_KEY at minimum)



3. Run dev server



```bash

pnpm dev    # or npm run dev

```



4. Open http://localhost:3000 in your browser.



Key Files & Locations

---------------------

- `backend/main.py` — FastAPI entrypoint

- `backend/app/api/voice_bot.py` — Voice/chat endpoint (agent invocation)

- `backend/app/api/agents/invoice_agent.py` — LLM agent setup and tool registration

- `backend/app/tools/sql_query_tool.py` — Core tools (create/update invoice, search, reports)

- `backend/app/core/supabase_memory.py` — Supabase-based conversation memory

- `backend/app/services/embedding.py` — Embedding generation & storage helper

- `backend/app/services/invoice_generator.py` — PDF generation utilities

- `frontend/app` — Next.js app routes and pages

- `frontend/components/chatbot.tsx` — Chat UI and sanitization/deduplication logic



Common Workflows

----------------

- Create invoice: Agent calls `agent_create_invoice` with a validated JSON payload; backend generates PDF, uploads to Supabase storage, stores DB record, and schedules embedding generation.

- Update invoice: Agent uses `agent_update_invoice` to load existing invoice, modify items or rates (preserving DB IDs), and re-generate/upload PDF.

- Sales summary: Call `agent_get_sales` with `time_period` such as `this month` or `last month`.

- Semantic search: `agent_search_knowledge` queries past invoices using embeddings.



Troubleshooting & Tips

----------------------

- Tool name mismatches: The agent requires `agent_`-prefixed tool names (e.g., `agent_search_knowledge`). If you see the model calling `search_knowledge`, adjust the system prompt or agent config.

- Unawaited coroutine warnings: Ensure background tasks are scheduled with `asyncio.create_task(...)` or `FastAPI BackgroundTasks` where appropriate.

- Supabase RLS errors (42501): Use the service role key for server-side writes or adjust RLS policies to allow inserts/updates from the backend role.

- Duplicate UI messages: In dev with React StrictMode, the chat widget can initialize twice. The frontend contains guards to avoid duplicate welcome messages; check `chatbot.tsx`.



Testing

-------

- Unit tests are not included by default. To add tests:

  - Use `pytest` in `backend/` for API and tool tests.

  - Mock Supabase responses using `pytest-mock` or local Supabase emulator.



Deployment

----------

- Backend: containerize the FastAPI app (Dockerfile not included) and deploy behind a process manager or serverless platform that can run Python web apps.

- Frontend: build with `pnpm build` and deploy to Vercel, Netlify, or static hosting.

- Ensure production envs provide secure keys (Supabase service role should remain server-only).



Security & Privacy

------------------

- Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend or client-side code.

- Sanitize user-provided content before generating PDFs.

- Rotate LLM API keys regularly and enforce rate-limiting for agent calls in production.



Contributing

------------

- Fork the repo and open a pull request with clear changeset and tests.

- Keep tool signatures simple; validate payloads server-side with Pydantic.

- Add unit tests for tools in `backend/tests` (create this folder when adding tests).



Appendix — Useful Commands

--------------------------

Backend (development):



```powershell

cd backend

python -m venv .venv

.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

uvicorn main:app --reload --port 8000

```



Frontend (development):



```bash

cd frontend

pnpm install

pnpm dev

```



Run a quick agent test (voice_bot endpoint):



```bash

# Example using curl (replace payload and user info appropriately)

curl -X POST http://localhost:8000/voice_bot -H "Content-Type: application/json" -d '{"input_value":"Create an invoice for buyer ABC with 1 chair at rate 500"}'

```



Contact & Maintainers

---------------------

- Repo owner / primary maintainer: (update with project-specific contact)
