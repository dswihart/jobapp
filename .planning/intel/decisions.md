# Decisions

No ADRs were classified in this ingest. All 20 inputs were DOC-type. This file is preserved empty for downstream consumers (gsd-roadmapper) so they can register that no locked architectural decisions exist yet — implicit technology and product choices live in `context.md` and must be formalized into ADRs through `/gsd-decide` before they can be treated as locked.

## Implicit (not yet ADR-locked) choices observed across DOCs

The following technology choices are referenced consistently across the doc set but are NOT formally locked. Downstream phases should treat them as working assumptions subject to formal decision.

- Framework: Next.js 15 (App Router) + React 19 — source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `README.md`, `DEPLOYMENT_SUMMARY.md`
- Language: TypeScript — source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `README.md`
- ORM: Prisma 6.16.3 — source: `docs/JOB_TRACKER_DOCUMENTATION.md`
- Database: PostgreSQL 17.6 — source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `DEPLOYMENT.md`
- Auth: NextAuth.js 5.0 beta with Credentials provider, JWT sessions, bcryptjs — source: `docs/JOB_TRACKER_DOCUMENTATION.md`
- AI provider: Anthropic Claude (model: Claude 3.5 Sonnet) via `@anthropic-ai/sdk` — source: `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
- Reverse proxy: Nginx with Let's Encrypt managed by Certbot — source: `docs/JOB_TRACKER_DOCUMENTATION.md`
- Process manager: systemd (`job-tracker.service`) — source: `SORTING_FEATURE.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
- Deployment target (current): `jobapp.aigrowise.com` (DigitalOcean Droplet, 8GB RAM, Debian, Helsinki `hel1`) — source: `docs/JOB_TRACKER_DOCUMENTATION.md`
- Job source architecture (current state): database-backed via `user_job_sources` table; hardcoded TypeScript `src/lib/sources/index.ts` returns empty — source: `docs/DEVELOPMENT-SESSION-SUMMARY.md`
- Charts library: Recharts — source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `README.md`
- Styling: Tailwind CSS 4 — source: `docs/JOB_TRACKER_DOCUMENTATION.md`

See `SYNTHESIS.md` for which of these have internal contradictions flagged in `INGEST-CONFLICTS.md`.
