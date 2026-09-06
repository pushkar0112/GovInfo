# GovInnovate - Architecture Documentation

## 1. Executive Summary

**GovInnovate** is a startup-friendly government innovation procurement platform designed for the Smart India Hackathon (SIH). It establishes a transparent, legally sound bridge between public sector problems and startup innovation.

Rather than attempting to bypass or replace statutory public procurement laws, GovInnovate complements **General Financial Rules (GFR) 2017** and **Government e-Marketplace (GeM)** provisions by generating empirical, third-party audited validation proofs that enable direct procurement pathways (Rule 149 / Rule 194).

---

## 2. The 7-Stage Innovation Procurement Lifecycle

```
[ 1. Problem ]
       │
       ▼
[ 2. Challenge ] (Outcome Definition)
       │
       ▼
[ 3. Startup ] (DPIIT Discovery & Exemption Sandbox)
       │
       ▼
[ 4. Evaluation ] (Dual Technical & Commercial Scoring)
       │
       ▼
[ 5. Pilot ] (Milestone-Based Controlled Operational Sandbox)
       │
       ▼
[ 6. Evidence ] (Independent 3rd-Party Verification: STQC / IITs)
       │
       ▼
[ 7. Scale ] (Direct GeM Transition & Ministry Sanctions)
```

| Stage | Activity | Governance & Legal Mechanism |
| :--- | :--- | :--- |
| **1. Problem** | Department logs an operational friction or citizen delivery bottleneck. | Baseline assessment without specifying proprietary technologies. |
| **2. Challenge** | Translating problems into outcome-driven performance metrics. | Replaces restrictive vendor qualification with open outcome targets. |
| **3. Startup** | DPIIT-recognized startups discover challenges and submit proposals. | Startup India exemption from prior turnover and past experience criteria. |
| **4. Evaluation** | Multidisciplinary expert committees score proposals on transparent rubrics. | Committee consensus and immutable audit logs. |
| **5. Pilot** | Funded trials in a live government sandbox with milestone tranches. | Time-bound deployment agreement de-risking public funds. |
| **6. Evidence** | Accredited independent testing agency verifies quantitative KPI targets. | Empirical laboratory and field trial audit certificate. |
| **7. Scale** | Department executes procurement sanction order via GeM. | Complies with GFR 2017 Rule 149 through verified proof of concept. |

---

## 3. Monorepo Structure

```
govinnovate/
│
├── frontend/                     # Next.js 16 (Turbopack, TypeScript, Tailwind CSS)
│   ├── app/                      # App Router (layout, page, styles)
│   ├── components/               # UI components, layout, and landing sections
│   │   ├── layout/               # Navbar, Footer
│   │   ├── landing/              # Hero, LifecycleFlow, PortalsSection, etc.
│   │   └── ui/                   # Reusable accessible components (Button, Card, Badge)
│   ├── lib/                      # Utilities & API client
│   ├── types/                    # Shared TypeScript domain types
│   ├── Dockerfile                # Multi-stage production container
│   └── package.json
│
├── backend/                      # FastAPI (Python 3.11+, SQLAlchemy, Pydantic)
│   ├── app/
│   │   ├── api/                  # Versioned API routes (/api/v1)
│   │   │   └── v1/
│   │   │       ├── endpoints/    # Health and domain endpoints
│   │   │       └── router.py     # Central v1 router
│   │   ├── core/                 # Config, Database engine, RBAC security definitions
│   │   ├── models/               # 12 SQLAlchemy ORM models with UUID primary keys
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Domain logic layer stubs
│   │   ├── repositories/         # Database access layer stubs
│   │   └── main.py               # Application factory & CORS configuration
│   ├── tests/                    # Pytest test suite
│   ├── Dockerfile                # Production Python container
│   └── requirements.txt
│
├── database/                     # Migrations & Database Scripts
│   ├── migrations/               # Alembic migration scripts
│   └── alembic.ini
│
├── docs/                         # Architecture documentation
│   └── architecture.md
│
├── docker-compose.yml            # Multi-service development orchestration
├── .env.example                  # Environment template
├── .gitignore                    # Comprehensive monorepo ignore rules
└── README.md                     # Setup, architecture, and developer roadmap
```

---

## 4. Role-Based Access Control (RBAC) Matrix

| Stakeholder Role | Description | Primary Capabilities |
| :--- | :--- | :--- |
| `GOVERNMENT` | Ministry / Municipal Nodal Officers | Create challenges, approve pilot milestones, sanction procurement. |
| `STARTUP` | DPIIT-Recognized Innovators | Apply to open challenges, submit deliverables, receive milestone tranches. |
| `EXPERT_EVALUATOR` | Domain Experts & Technical Academics | Score applications against technical feasibility and commercial viability. |
| `INDEPENDENT_VALIDATOR` | Accredited Labs (STQC, IITs) | Audit pilot data, verify KPIs, issue outcome certificates. |
| `PROCUREMENT_OFFICER` | GeM & Ministry Finance Sanctioners | Execute sanction orders and verify GFR 2017 legal compliance. |
| `ADMIN` | Platform Administrators | User verification, security auditing, system telemetry oversight. |

---

## 5. Database Schema Architecture (Core Entities)

All models use UUID primary keys and standard timezone-aware UTC `created_at` and `updated_at` timestamps.

1. **`users`**: Central authentication & RBAC identity store.
2. **`departments`**: Government ministries, state departments, and municipal corporations.
3. **`startups`**: Startup profiles with DPIIT registration number, sector, and stage.
4. **`challenges`**: Problem statements, outcome definitions, and budget estimates.
5. **`applications`**: Startup challenge submissions with proposed technical approaches.
6. **`evaluations`**: Multidisciplinary evaluation scores and committee feedback.
7. **`pilots`**: Controlled sandbox deployments, durations, and approved budgets.
8. **`milestones`**: Time-bound tranche deliverables within a pilot.
9. **`kpis`**: Quantitative metrics (baseline, target, achieved, verified).
10. **`validations`**: Third-party certification reports and cryptographic certificate hashes.
11. **`procurement_records`**: GeM catalogue references, sanction orders, and contract values.
12. **`audit_logs`**: Tamper-proof trail of state transitions and administrative actions.
