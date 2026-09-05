# GovInnovate

> **"From Government Problems to Proven Innovation"**  
> *A transparent, startup-friendly platform to discover, pilot, validate and scale innovative solutions for public-sector challenges.*

Built for the **Smart India Hackathon (SIH)**.

---

## 1. Project Overview

**GovInnovate** is an enterprise-grade public sector innovation procurement gateway. It addresses the systemic divide between government departments needing innovative solutions and DPIIT-recognized startups capable of building them.

### Core Philosophy: Complementing Public Procurement Law
Traditional government procurement laws (such as the General Financial Rules - GFR 2017) are designed to safeguard public funds and prevent favoritism. However, their reliance on rigid criteria—such as multi-year turnover and prior government contracts—frequently locks out cutting-edge startups.

GovInnovate **complements** rather than replaces statutory procurement laws. By providing a structured, funded sandbox where solutions are empirically tested and validated by accredited third parties (e.g., STQC, IITs), the platform produces the legal and audit-compliant evidence required under **GFR 2017 Rule 149** and **Rule 194** for direct single-source adoption and scale-up via the **Government e-Marketplace (GeM)**.

---

## 2. Architecture

GovInnovate connects the complete 7-stage innovation lifecycle:

```
Problem ──▶ Challenge ──▶ Startup ──▶ Evaluation ──▶ Pilot ──▶ Evidence ──▶ Scale
```

1. **Problem**: Government departments post unresolved civic or operational pain points.
2. **Challenge**: Problems are translated into outcome-oriented challenges with quantifiable metrics.
3. **Startup Discovery**: DPIIT startups apply with technical proposals under Startup India exemption rules.
4. **Expert Evaluation**: Independent panels score proposals on feasibility, impact, and commercial readiness.
5. **Controlled Pilot**: Shortlisted startups execute pilots in operational sandboxes with milestone tranches.
6. **Independent Evidence**: Accredited third-party auditors certify KPI achievement against baseline metrics.
7. **Scale-Up**: Validated innovations transition into direct GeM procurement and departmental sanctions.

---

## 3. Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Design Aesthetic**: Indian Public Sector / National Informatics high-contrast design
- **State & Data**: TanStack Query, React Hook Form, Zod

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **API Standard**: REST with versioning (`/api/v1`)
- **Validation**: Pydantic v2 & Pydantic Settings
- **ORM & Database Toolkit**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Architecture**: Clean layered architecture (API → Core → Models → Schemas → Services → Repositories)

### Database
- **Engine**: PostgreSQL 16
- **Identifiers**: UUIDv4 primary keys across all domain models
- **Auditing**: Immutable audit logging and UTC timestamps

### Infrastructure & Containerization
- **Containerization**: Docker & Docker Compose
- **Health Checks**: Native `pg_isready` for PostgreSQL and HTTP health checks for FastAPI

---

## 4. Folder Structure

```
govinnovate/
│
├── frontend/                     # Next.js Application
│   ├── app/                      # App router pages & layouts
│   │   ├── layout.tsx            # Global layout with official Gov header & footer
│   │   ├── page.tsx              # GovInnovate landing page
│   │   └── globals.css           # Tailwind design tokens
│   ├── components/
│   │   ├── ui/                   # Reusable accessible elements (Button, Card, Badge)
│   │   ├── layout/               # Navbar, Footer with live health monitor
│   │   └── landing/              # Hero, LifecycleFlow, PortalsSection, GovernanceSection
│   ├── lib/                      # Utilities (cn, formatting)
│   ├── types/                    # Shared TypeScript domain types
│   ├── Dockerfile                # Production Next.js container
│   └── package.json
│
├── backend/                      # FastAPI Backend
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   └── health.py # Health check endpoint
│   │   │       └── router.py     # Central v1 router
│   │   ├── core/
│   │   │   ├── config.py         # Structured configuration (pydantic-settings)
│   │   │   ├── database.py       # SQLAlchemy engine & session factory
│   │   │   └── security.py       # RBAC role matrix (6 stakeholder roles)
│   │   ├── models/               # SQLAlchemy ORM models (UUID primary keys)
│   │   │   ├── base.py           # UUID & timestamp base mixin
│   │   │   ├── user.py           # User entity & Role enum
│   │   │   ├── department.py     # Government ministry/department entity
│   │   │   ├── startup.py        # DPIIT-recognized startup profile
│   │   │   ├── challenge.py      # Problem statement & outcome definitions
│   │   │   ├── application.py    # Startup proposal submission
│   │   │   ├── evaluation.py     # Expert technical & commercial scoring
│   │   │   ├── pilot.py          # Sandbox pilot deployment
│   │   │   ├── milestone.py      # Pilot deliverables & tranche disbursements
│   │   │   ├── kpi.py            # Quantitative performance indicators
│   │   │   ├── validation.py     # Independent 3rd-party audit verification
│   │   │   ├── procurement.py    # Direct GeM procurement record
│   │   │   └── audit_log.py      # Immutable governance audit trail
│   │   ├── schemas/              # Pydantic validation schemas
│   │   │   └── health.py
│   │   ├── services/             # Domain logic layer stubs
│   │   ├── repositories/         # Database access layer stubs
│   │   └── main.py               # FastAPI application entrypoint
│   ├── tests/
│   │   └── test_health.py        # Automated test suite
│   ├── Dockerfile                # Backend container definition
│   └── requirements.txt          # Python dependencies
│
├── database/                     # Migration management
│   ├── migrations/               # Alembic version files
│   └── alembic.ini
│
├── docs/                         # Technical specifications
│   └── architecture.md
│
├── docker-compose.yml            # Multi-service development orchestration
├── .env.example                  # Environment configuration template
├── .gitignore                    # Monorepo ignore rules
└── README.md                     # This file
```

---

## 5. Local Setup

### Prerequisites
- **Node.js**: v18+ (tested on v20 and v24)
- **Python**: 3.10+ (tested on 3.11, 3.12, 3.14)
- **PostgreSQL**: 15+ (optional for local dev if using SQLite fallback, required in Docker)
- **Docker & Docker Compose**: (optional for containerized setup)

### Clone & Configure Environment
```bash
# Copy the environment template
cp .env.example .env
```

---

## 6. Environment Variables

Key variables defined in `.env.example`:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Application environment | `development` |
| `DATABASE_URL` | SQLAlchemy connection string | `postgresql://govinnovate:govinnovate_secure_pass@localhost:5432/govinnovate_db` |
| `JWT_SECRET` | Secret key for signing tokens | `change-this-to-a-secure-random-jwt-secret-min-32-chars` |
| `CORS_ORIGINS` | Permitted browser origins | `["http://localhost:3000","http://127.0.0.1:3000"]` |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend clients | `http://localhost:8000` |
| `POSTGRES_USER` | PostgreSQL superuser | `govinnovate` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `govinnovate_secure_pass` |
| `POSTGRES_DB` | PostgreSQL database name | `govinnovate_db` |

---

## 7. How to Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start at **`http://localhost:3000`**.

To verify production build:
```bash
npm run build
npm start
```

---

## 8. How to Start Backend

```bash
cd backend

# Create virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- Root: `http://localhost:8000/`
- Interactive OpenAPI Docs: `http://localhost:8000/api/v1/docs`
- Health check: `http://localhost:8000/api/health` or `http://localhost:8000/api/v1/health`

### Run Backend Tests
```bash
cd backend
pytest -v tests
```

---

## 9. How to Start Using Docker Compose

For a complete containerized stack (PostgreSQL + FastAPI + Next.js):

```bash
# Build and start all services in detached mode
docker compose up --build -d

# Check running services
docker compose ps

# View service logs
docker compose logs -f

# Stop all services
docker compose down
```

Services exposed:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432`

---

## 10. API Health-Check Example

### Health Check Endpoints
GovInnovate exposes health endpoints at both `/api/health` and `/api/v1/health`.

### cURL Request:
```bash
curl -X GET http://localhost:8000/api/v1/health -H "Accept: application/json"
```

### JSON Response:
```json
{
  "status": "ok",
  "service": "govinnovate-api"
}
```

### Root Discovery (`GET /`):
```json
{
  "service": "govinnovate-api",
  "status": "online",
  "version": "1.0.0",
  "docs_url": "/api/v1/docs",
  "health_url": "/api/v1/health"
}
```

---

## 11. Development Roadmap

Following the foundation stage, subsequent implementation phases are planned as follows:

| Phase | Milestone | Scope |
| :--- | :--- | :--- |
| **Phase 1 (Completed)** | **Project Foundation & Architecture** | Monorepo scaffolding, FastAPI backend, Next.js government UI, 12 SQLAlchemy ORM models with UUID PKs, Docker Compose, and health testing. |
| **Phase 2** | **Authentication & RBAC** | JWT authentication, role guards (Government, Startup, Evaluator, Validator, Procurement Officer, Admin), user onboarding, and DPIIT verification checks. |
| **Phase 3** | **Challenge & Proposal Engine** | Department problem drafting, outcome definition matrix, public challenge discovery, and startup proposal submission with TRL tracking. |
| **Phase 4** | **Evaluation & Pilot Sandboxes** | Expert committee evaluation rubrics, sandbox pilot agreements, milestone tranche management, and live telemetry ingestion. |
| **Phase 5** | **Independent Validation & GeM Scale-Up** | 3rd-party accredited audit reports, cryptographic certificate issuance, GeM Startup Runway integration, and automated GFR 2017 sanction orders. |

---

## License & Attribution

Designed and developed for the **Smart India Hackathon (SIH)**.  
Complies with Indian Public Sector Procurement and Open Standards.
