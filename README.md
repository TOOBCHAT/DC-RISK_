# DC-RISK — AI-Powered Solana Memecoin Risk Analyzer

DC-RISK is a full-stack web application designed to analyze Solana memecoins for rug pulls, honeypots, and malicious tokenomics. It scrapes deterministic on-chain data (via RugCheck and DexScreener) and feeds it into an AI Risk Synthesizer (Gemini 3.6 Flash) to generate a comprehensive 0-100 risk score and detailed security report.

## 🚀 Key Features
* **AI Risk Synthesizer:** Fast, single-node LangGraph AI architecture that eliminates hallucinations by analyzing deterministic on-chain facts.
* **Solana Wallet Authentication:** Secure login using Phantom or Solflare wallets via cryptographic message signing (PyNaCl).
* **Email/Password Auth:** Seamless Supabase authentication with user session management.
* **Real-time Streaming (SSE):** Watch the AI analyze the token in real-time before the final report is rendered.
* **History Management:** Users can view, selectively delete, or completely clear their past token scans.
* **Account Deletion:** Full account wiping capabilities with Supabase cascade deletion.

## 🛠 Tech Stack

**Frontend (`/frontend`)**
* React 19 + TypeScript + Vite
* CSS Modules / Tailwind
* Solana Web3.js (`@solana/web3.js`, `bs58`)

**Backend (`/backend`)**
* Python 3.10 + FastAPI
* LangGraph & LangChain (Gemini 3.6 Flash)
* PyNaCl (Cryptographic signature verification)
* Server-Sent Events (SSE) for streaming

**Database & Auth**
* Supabase (PostgreSQL, Row Level Security, Auth)

## 📁 Project Structure

```text
DC-RISK_/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── agents/           # LangGraph AI nodes and tools
│   │   ├── auth/             # Wallet crypto verification middleware
│   │   ├── db/               # Supabase admin clients
│   │   ├── routes/           # REST API & SSE streaming routes
│   │   └── main.py           # FastAPI application entry
│   ├── requirements.txt      # Python dependencies (Gunicorn included)
│   └── .env                  # Backend secrets
├── frontend/                 # React Vite Frontend
│   ├── public/               # Static assets & Netlify _redirects
│   ├── src/                  # React components, hooks, and views
│   ├── package.json          # Node dependencies
│   └── .env                  # Frontend environment variables
└── supabase/                 # Database schemas and migrations
```

## 💻 Local Development

### 1. Start the Backend
Navigate to the backend directory, activate your virtual environment, and run the FastAPI server:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*The backend will run on `http://localhost:8000`.*

### 2. Start the Frontend
In a new terminal window, navigate to the frontend directory and start Vite:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`.*

## 🌐 Production Deployment

### Frontend (Netlify)
The frontend is optimized for deployment on Netlify as a Single Page Application (SPA).
* **Build Command:** `npm run build`
* **Publish Directory:** `frontend/dist`
* *Note: A `public/_redirects` file is included to handle React Router navigation.*

### Backend (Azure App Service)
The backend is deployed to Azure App Service (Linux, Python 3.10) using GitHub Actions.
* **Startup Command:** `gunicorn --bind=0.0.0.0 --timeout 600 -w 4 -k uvicorn.workers.UvicornWorker app.main:app`
* **Deployment:** Automated via the `.github/workflows` YAML file which isolates the `backend/` directory for the Oryx build engine.

## 📝 Recent Major Updates
* **Monorepo Migration:** Separated the monolithic codebase into strict `frontend/` and `backend/` directories to isolate dependencies and prevent deployment collisions.
* **AI Pipeline Optimization:** Replaced the multi-agent fan-out architecture with a single Gemini 3.6 Flash synthesizer node, drastically improving speed, eliminating rate-limit crashes, and ensuring deterministic JSON output.
* **Authentication Overhaul:** Completely removed Google OAuth in favor of strict Web3 Wallet and Email authentication. Fixed cryptographic signature prototype stripping for Solflare compatibility.
* **Data Privacy:** Implemented comprehensive cascading deletes in Supabase, allowing users to wipe individual scans, clear all history, or permanently delete their account and all associated data with one click.
* **Deployment Fixes:** Resolved strict TypeScript compilation errors (`tsc -b`) blocking Netlify builds and configured Gunicorn bindings to fix Azure Container health check timeouts.
