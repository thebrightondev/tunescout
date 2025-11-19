# Tunescout Platform Architecture

## 1. Overview

Tunescout delivers personalized music discovery through three cooperating projects:

| Project | Role | Key Tech |
| --- | --- | --- |
| **TuneScout** | User-facing Next.js 15 application handling Spotify OAuth, dashboards, and playback controls. | Next.js App Router, shadcn/ui, NextAuth.js |
| **TuneHub** | Central API and data layer that persists Spotify data, orchestrates ingestion jobs, and aggregates listening history. | Java 21, Spring Boot, PostgreSQL, JPA |
| **MusicEngine (ML Service)** | Dedicated service that trains and serves recommendation models from aggregated history. | Python 3.11, FastAPI, pandas/scikit-learn/implicit |

All components exchange authenticated requests over HTTPS. PostgreSQL is the single source of truth for normalized Spotify data and derived aggregates that drive the ML pipeline.

## 2. Data Flow

1. **Authentication** – Users sign in through TuneScout (NextAuth + Spotify). The app obtains OAuth tokens and issues a JWT for TuneHub.
2. **Ingestion** – TuneHub uses stored refresh tokens to call Spotify APIs on a schedule, persisting tracks, artists, listening events, and audio features in PostgreSQL.
3. **Aggregation & Features** – Batch jobs in TuneHub calculate user top items, follow lists, and feature vectors; results are stored in `user_preferences`, `user_top_items`, etc.
4. **Model Training** – The MusicEngine project periodically pulls data from PostgreSQL (read-only) to build hybrid recommenders (collaborative filtering + content signals). Models and metadata are versioned in object storage.
5. **Serving Recommendations** – MusicEngine exposes a `/recommend` endpoint. TuneHub calls it, enriches track IDs with metadata, and returns curated lists to TuneScout.
6. **Feedback Loop** – User interactions (play, skip, like) are posted back to TuneHub, logged in `recommendation_feedback`, and included in the next training cycle.
7. **Concert Discovery** – TuneHub combines followed artists and inferred location (country/city) with third-party concert APIs to expose nearby events.

## 3. Repository Layout

Each project lives in its own repository with a shared contract:

```text
/tunescout (this repo)
  └─ TuneScout (Next.js frontend)
/tunehub (separate git repo)
  └─ Spring Boot service + Flyway migrations
/music-engine (separate git repo)
  ├─ data loaders + feature pipeline
  ├─ training scripts + notebooks
  └─ FastAPI serving app
/aws-cdk
  └─ Infrastructure-as-code for AWS deployment
```

> Tip: you can keep all three directories under a single VS Code multi-root workspace. The frontend repo ignores `tunehub/` and `music-engine/`, so nested checkouts work without polluting git history. Alternatively, clone each repository side-by-side in `~/Github/` and configure Editor Workspaces/Dev Containers accordingly.

The CDK project references the other repositories as build artifacts (container images or static bundles).

## 4. Local Development (Podman-first)

- **Containers** – Use Podman (with `podman compose`) instead of Docker to stay vendor neutral. Provide compose definitions for PostgreSQL, TuneHub, and the MusicEngine API. Example services:
  - `postgres`: official PostgreSQL image with mounted volume for persistence.
  - `tunehub-api`: built from the TuneHub repository (`podman build`) and run with environment variables for DB connection.
  - `music-engine`: Python-based container exposing FastAPI on an internal network.
- **TuneScout** – Runs directly via `pnpm dev`, pointing to `https://tunescout.local.com:3000` and targeting backend endpoints exposed on Podman’s host interface.
- **Certificates** – mkcert-generated certs stored in `.certs/` enable HTTPS for local domains; Podman containers trust the mkcert root CA to communicate securely.
- **Tooling** – Provide helper scripts (e.g., `scripts/dev-up.sh`) that launch Podman services, apply Flyway migrations, and seed sample data.

## 5. TuneHub Design

- **API Layers** – Controllers (`/users`, `/recommendations`, `/concerts`), Service layer (business logic), Repository layer (JPA/Hibernate), Scheduler layer (Spotify ingestion, aggregation batches).
- **Schema Highlights** – Tables for `users`, `tracks`, `artists`, `albums`, `listening_events`, `track_audio_features`, `user_top_items`, `user_preferences`, `recommendation_feedback`.
- **Spotify Integration** – WebClient with token refresh, retry/backoff; scheduled via `@Scheduled`. Secrets stored in AWS Secrets Manager in production.
- **Recommendation Bridge** – Calls the MusicEngine service via REST (WebClient), includes fallback heuristics if MusicEngine is unavailable.
- **Concert Integration** – Configurable adapters for Songkick/Ticketmaster with caching in PostgreSQL or Redis.

## 6. MusicEngine Service Design

- **Data Access** – Python layer connects to Postgres using read-only credentials; extracts interaction matrices and feature tables.
- **Pipeline** – Feature engineering (recent plays, top tracks, audio features), collaborative filtering (implicit ALS), content similarity (cosine on feature vectors), hybrid scoring.
- **Model Ops** – Training triggered by CLI (`python -m src.training.train`), artifacts stored in S3-compatible storage with metadata (MLflow). Serving app loads latest model into memory.
- **Endpoints** – `/recommend` (user_id, limit), `/feedback` (optional), `/health`. Responses include track IDs + scores; TuneHub joins with metadata.

## 7. AWS Deployment (CDK + Podman images)

### Infrastructure Goals

- **Low cost MVP**: minimize always-on resources, use managed services with free/low tiers.
- **Separation of concerns**: each component deploys independently but within a shared VPC.
- **Podman-built images**: build OCI images with Podman and push to Amazon ECR.

### Proposed AWS Architecture

| Component | Service | Notes |
| --- | --- | --- |
| VPC | AWS CDK VPC construct | 2 public subnets (simplified) + optional private subnets for database. |
| Frontend | AWS S3 + CloudFront (for static export) *or* AWS App Runner / ECS Fargate if SSR required. | Cheapest path is static export + CloudFront. |
| TuneHub | AWS ECS Fargate (1 task, spot-capable) behind Application Load Balancer. | Auto scales from 1–2 tasks; uses minimal CPU/memory. |
| MusicEngine Service | AWS ECS Fargate (separate task) or AWS Lambda (container image). | Fargate service with scheduled scaling if always on is needed. |
| Database | Amazon RDS PostgreSQL `db.t4g.micro` (no Multi-AZ) | Enable storage auto-scaling, nightly snapshots. |
| Secrets | AWS Secrets Manager | Spotify credentials, DB passwords. |
| Networking | AWS Security Groups | Restrict DB access to ECS tasks and (optionally) a bastion host. |
| Observability | CloudWatch Logs + AWS X-Ray (optional) | Log groups per service, metrics/alarm on error rates. |

### CDK Project Structure (`aws-cdk/`)

```text
aws-cdk/
├─ bin/
│  └─ tunescout.ts            # Entry point
├─ lib/
│  ├─ network-stack.ts        # VPC, subnets, security groups
│  ├─ database-stack.ts       # RDS instance + parameter group
│  ├─ ecr-stack.ts            # Repositories for Podman images
│  ├─ app-stack.ts            # CloudFront/S3 for TuneScout or App Runner service
│  ├─ backend-stack.ts        # ECS cluster, task definitions, ALB, services
│  ├─ music-engine-stack.ts   # ECS service or Lambda for MusicEngine
│  └─ pipeline-stack.ts       # Optional CI/CD pipeline (CodePipeline / GitHub Actions integration)
└─ package.json               # CDK dependencies (TypeScript)
```

- **Deployment flow**
  1. Build OCI images with Podman: `podman build -t <repo>:tag .`
  2. Push to ECR (`podman push`).
  3. CDK deploy updates ECS task definitions with new image tags.
  4. For Next.js static assets, run `pnpm build && pnpm export`, upload to S3 bucket provisioned by CDK. If SSR is required, deploy TuneScout as an ECS/App Runner service instead.

- **Cost optimizations**
  - Use AWS Fargate Spot for non-critical services (TuneHub, MusicEngine) with a small primary task on standard Fargate.
  - Keep RDS instance small (`db.t4g.micro`) and enable auto-stop (RDS instance pause) if supported.
  - Share VPC and ALB between backend and the MusicEngine service.
  - Use CloudFront + S3 (static) to avoid always-on compute for the frontend.

### CI/CD considerations

- GitHub Actions workflows in each repo to:
  1. Run tests/lint.
  2. Build Podman images and push to ECR (using `aws-actions/configure-aws-credentials`).
  3. Trigger `cdk deploy` (manual approval recommended for production).

## 8. Open Questions & Next Steps

1. Confirm Spotify token storage model (backend-managed vs. frontend-proxied).
2. Decide on MusicEngine service availability pattern (always-on Fargate vs. Lambda inference).
3. Implement Podman compose files for local orchestration.
4. Scaffold TuneHub + MusicEngine repositories with initial code and Dockerfiles (Podman-compatible).
5. Initialize the CDK project (TypeScript) and codify the infrastructure stacks above.

This document will evolve as the MVP is implemented and we gather usage metrics.
