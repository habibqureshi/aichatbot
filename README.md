# AI Chatbot Platform (LangGraph + OpenAI + RAG/ChromaDB)

A production-ready, full‑stack AI chatbot built with a Next.js frontend and a FastAPI backend. The assistant is orchestrated using LangGraph with OpenAI as the LLM provider, and it supports Retrieval‑Augmented Generation (RAG) for training on custom company data using ChromaDB.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Install & Run](#install--run)
- [RAG: Train With Your Documents](#rag-train-with-your-documents)
- [API Overview](#api-overview)
- [Project Scripts](#project-scripts)
- [Development Notes](#development-notes)
- [Security & Privacy](#security--privacy)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Features

- Conversational AI powered by **LangGraph** and **OpenAI**
- **RAG** for company‑specific knowledge using **ChromaDB**
- File upload and indexing (supports `.txt`, `.pdf`, `.csv`)
- Streaming responses to the UI via Server‑Sent Events (SSE)
- Type‑safe, modern **Next.js** frontend with React Server Components
- **FastAPI** backend with modular routers and tool integrations
- Secure session handling and Axios interceptors
- Container‑friendly and cloud‑ready architecture

---

## Architecture

- `chatbot-fe/` – Next.js (App Router) frontend
  - Auth, dashboard, chat UI, and a training page to upload files for RAG
- `chatbot-be/` – FastAPI backend
  - LangGraph chat flow, OpenAI integration, RAG routers, file ingestion and indexing
  - ChromaDB vector store data on disk (configurable)

Data flow overview:
1. The user sends a prompt from the web UI.
2. The backend’s LangGraph pipeline streams the AI response via SSE.
3. For RAG, uploaded documents are chunked and indexed into ChromaDB.
4. Subsequent chats use retrieval to ground answers in company data.

---

## Tech Stack

- **Frontend**: Next.js (React), TypeScript, Axios
- **Backend**: FastAPI, LangGraph, LangChain, OpenAI SDK
- **Vector DB**: ChromaDB
- **Language**: Python 3.11+, Node.js 18+
- **Tooling**: ESLint, Prettier, Ruff/Mypy (optional), Docker (optional)

---

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm/npm/yarn
- Python 3.11+
- OpenAI API key

### Environment Variables

Create frontend env file `chatbot-fe/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
```

Create backend env file `chatbot-be/.env`:
```bash
OPENAI_API_KEY=sk-...
# Optional: customize Chroma paths
CHROMA_PERSIST_DIR=./my_chroma_data
```

### Install & Run

Terminal 1 – Backend (FastAPI):
```bash
cd chatbot-be
python -m venv .venv && source .venv/bin/activate
pip install -U pip
pip install -e .
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

Terminal 2 – Frontend (Next.js):
```bash
cd chatbot-fe
npm install
npm run dev
```

Open the app at `http://localhost:3000`.

---

## RAG: Train With Your Documents

- Navigate to Dashboard → Train (`/dashboard/train`).
- Upload a `.txt`, `.pdf`, or `.csv` file.
- The backend validates and indexes the file into ChromaDB.
- Chat in `/dashboard/chat` to see the model ground answers on your data.

Backend upload endpoint (default):
- POST `/api/v1/rag/upload-file` (multipart/form-data with `file`)

Notes:
- Chunking/splitting, embedding, and storage are configurable in `chatbot-be/rag/indexing`.
- Large/temporary vector store data is ignored by Git (`my_chroma_data`, `chroma-data`).

---

## API Overview

- Chat (SSE stream): `GET /api/v1/chat?query=<text>&id=<threadId>`
  - Streams chunks as `text/event-stream` with JSON payloads
- RAG Upload: `POST /api/v1/rag/upload-file`
  - Body: `multipart/form-data` with `file`

See routers in `chatbot-be/router/` for details.

---

## Project Scripts

Frontend:
```bash
npm run dev       # start Next.js dev server
npm run build     # build for production
npm run start     # start production server
npm run lint      # lint frontend
```

Backend:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
# Optionally add ruff/mypy/pytest if configured
```

---

## Development Notes

- Axios instance reads `NEXT_PUBLIC_API_URL` for the backend base URL.
- Request/response interceptors handle auth and SSE.
- Keep an eye on CORS if running on different hosts/ports.

Recommended quality tooling (optional):
- Frontend: ESLint + Prettier (already configured)
- Backend: Ruff (lint), Mypy (types), Pytest (tests)

---

## Security & Privacy

- Never commit API keys. Use `.env` files and secret managers in production.
- Validate file types and sizes on upload (enabled for `.txt`, `.pdf`, `.csv`).
- Review CORS and authentication strategies before deployment.

---

## Deployment

- Frontend: Deploy to Vercel/Netlify or any Node hosting.
- Backend: Deploy with Uvicorn/Gunicorn behind Nginx/Traefik.
- Vector DB: Persist ChromaDB volumes to durable storage.
- Configure environment variables via your platform’s secret store.

Docker (example sketch):
```bash
# Build images
# docker build -t aichatbot-fe ./chatbot-fe
# docker build -t aichatbot-be ./chatbot-be
# Compose with a reverse proxy and shared volumes for ChromaDB
```

---

## Contributing

Contributions are welcome! Please:
- Open an issue for bugs and feature requests.
- Create small, focused PRs with clear descriptions.
- Follow existing code style and add tests where relevant.

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.

---

## Acknowledgments

- LangGraph and LangChain community
- OpenAI ecosystem
- ChromaDB maintainers