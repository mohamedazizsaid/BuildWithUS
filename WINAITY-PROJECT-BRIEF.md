# Winaity Template Builder — Complete Project Brief

> **Purpose of this document:** a single, self-contained reference describing the entire
> Winaity Template Builder platform — its vision, features, architecture, tech stack, and
> the AI capabilities that differentiate it. Hand this to an assistant (or a reader) to
> generate a presentation, a pitch deck, documentation, or an overview.

---

## 1. Elevator Pitch

**Winaity Template Builder** is a **multi-tenant SaaS platform** that lets companies design,
manage, and generate professional communication templates — **emails, invoices (factures),
contracts (contrats), SMS, and RCS rich messages** — through a visual drag-and-drop editor
supercharged by an **agentic AI assistant**.

Think **"Canva meets an AI copilot" for business communications**: a marketing team can build
a polished, on-brand email in minutes by dragging blocks, writing a prompt, or even uploading
a marketing poster and letting the AI rebuild it as an editable template.

The platform is **live in production**, built on a modern microservices architecture, and
includes a full **subscription/billing system** (Stripe), **team collaboration**, **role-based
access**, and a **public API / integration layer** so external tools (CRMs, etc.) can embed the
builder for their own users.

---

## 2. The Problem It Solves

- Businesses need consistent, branded, professional templates across many channels (email,
  invoices, contracts, SMS, RCS) but building them is slow and requires design/technical skill.
- Existing tools are either too generic (no multi-channel, no tenancy) or too technical
  (raw HTML/MJML editing).
- Marketing teams want to **describe** what they want, or **reuse an existing design** (a poster,
  a campaign), and get an editable, on-brand result instantly.

**Winaity's answer:** a visual builder + an AI assistant that generates and edits real editable
blocks (not throwaway HTML), all scoped safely per company (tenant).

---

## 3. Core Features

### 3.1 Multi-Channel Template Builder
Five template types, each with a dedicated editor:

| Type | Channel | Editor capabilities |
|------|---------|---------------------|
| **Email** (type 1) | Email (MJML) | Full drag-and-drop block editor, live preview, Monaco code view, AI assistant, export to HTML/PDF |
| **Facture** (type 2) | Invoice | Structured invoice builder, variable mapping, PDF generation |
| **Contrat** (type 3) | Contract | Rich text (Tiptap) with pagination, PDF generation |
| **SMS** (type 4) | SMS | Simple text builder with variable substitution |
| **RCS** (type 5) | RCS / RBM rich messaging | Form + live phone preview: text, rich cards, carousels, suggestion chips (reply / open URL / dial) |

- Templates are stored per company (tenant) and support `{{variables}}` for personalization.
- Favorites, duplication, popular-template listing, and a **predefined template gallery**.

### 3.2 Visual Email Editor (the flagship)
- **Drag-and-drop** block canvas built with dnd-kit.
- **11 block types:** heading, text, image, video, button, divider, table, signature, social,
  menu, icon-list.
- Rows with up to 4 columns, per-column widths, section-level styling.
- **Live MJML preview** and a **Monaco code editor** for power users.
- Export to responsive **HTML** and **PDF**.
- Block model is the same JSON the AI produces — visual edits and AI edits are fully interchangeable.

### 3.3 AI Assistant (the differentiator)
A conversational assistant embedded in the editor that **generates and edits templates using
real building blocks**, not raw text. Three ways to use it:

1. **Generate from a prompt** — "Create a Black Friday email for our NBA store" → a complete,
   on-brand email (hero, offer card, product grid, footer) in ~10 seconds.
2. **Edit conversationally** — "make it dark themed", "change the first image", "move the PS5
   section before the offer", "add a pricing box" — the AI targets the right blocks and applies
   the change truthfully.
3. **Selection-scoped editing** — select a block/section in the canvas, then type a prompt; the
   edit applies to exactly that element.

**Image-to-Template ("poster → editable email"):** upload a marketing poster/affiche; the AI
reads it with **vision** (extracts verbatim text, prices, offers, brand colors, mood, layout),
then **rebuilds it natively** as an editable, on-brand email (it does not paste the image — it
reconstructs the campaign). A self-checking "art-director critic" pass then elevates and verifies
the result.

Design intelligence lives in code: an automatic **color-palette deriver** with a **contrast
guard** (guarantees readable text on every background), **5 design systems**
(editorial / bold / minimal / luxe / corporate) chosen to match the subject, and premium block
treatments (hero-over-image, rounded cards, brand color bars, pricing boxes).

### 3.4 Multi-Tenancy & Collaboration
- Every company is a **tenant**; all data (templates, users, usage) is isolated by `tenant_id`.
- **Team management:** invite users, accept invites, list members.
- **Role-based access:** admin, editor, **marketing** (can curate the company's predefined
  template gallery), and machine-to-machine (M2M) API clients.

### 3.5 Subscriptions & Billing (Stripe)
- **Plans:** Free, Pro (25€/mo), Pro Organisation (55€/mo), plus an internal unlimited plan.
- **Embedded Stripe Checkout** (payment stays on Winaity's page), monthly vs. annual billing
  (monthly = flexible, billed each month; annual = one yearly lump charge at a lower rate,
  240€/600€ HT, 12-month commitment, renews on the anniversary), **French VAT (TVA 20%)**
  correctly applied.
- **Plan enforcement:** free tier limited to email + 1 template + 1 AI interaction (lifetime,
  monotonic); Pro unlocks all channels and unlimited AI; Pro Org adds team invites + API access.
- Subscription management: upgrade, change plan in place, cancel (respecting annual commitment),
  reactivate — with a polished **upgrade modal** and toast notifications.
- **Super-admin** panel to assign plans (including the internal plan) to tenants.

### 3.6 Integrations & Embedding
- **API keys / integrations:** a logged-in company admin can generate client credentials from
  the in-dashboard Settings → Intégrations panel.
- **Embed / redirect flow:** external tools (e.g. a CRM) can send their users into the Winaity
  builder (Stripe-Checkout-style delegated auth, no second login), let them build a template,
  and redirect back — all scoped to the tenant/organization.
- **Model Context Protocol (MCP) endpoint** (`/builder/mcp`): the 32 builder tools are exposed
  over a real MCP server, so the AI model discovers the tools dynamically instead of having them
  recited in a prompt — a strong, modern "agentic" story.

### 3.7 Marketing Website
A full public marketing site (home, features, pricing, about, contact, demo, design-system pages)
rebranded to Winaity, with the pricing page wired to the real plans.

---

## 4. Technical Architecture

### 4.1 High-Level Shape
```
                    ┌────────────────────────┐
   Browser  ───────▶│   Next.js Frontend     │  (React 19, App Router)
                    │   + AI routes           │
                    └───────────┬────────────┘
                                │ REST (JWT cookie)
                    ┌───────────▼────────────┐
                    │      API Gateway        │  (NestJS, REST → gRPC proxy)
                    └─────┬──────────────┬────┘
                     gRPC │              │ gRPC
              ┌───────────▼───┐   ┌──────▼──────────┐
              │  Auth Service │   │ Template Service│  (NestJS, CQRS, TypeORM)
              │  (port 50055) │   │  (port 50054)   │
              └───────┬───────┘   └────────┬────────┘
                      │                    │
                 auth_db              templates_db      (PostgreSQL)
                                           │
                                        MinIO           (media / object storage)
```

Supporting AI/media services:
- **AI Template Service** (Python) — auxiliary AI helpers: palette suggestion, variable mapping,
  invoice-field mapping.
- **Image Pipeline** (Python) — stock image search / resolution.
- **In-house LLM server** — self-hosted **vLLM** (OpenAI-compatible) running **gemma4-26b**
  (default) and **qwen35-35b-a3b** (fallback), both 64K context, private and never exposed to
  the client.

### 4.2 Microservices
- **API Gateway** — NestJS; the only public REST surface; translates REST → gRPC; handles JWT
  cookie auth, CORS, billing (Stripe), plan enforcement, integrations, and a global exception
  filter for clean error messages.
- **Auth Service** — NestJS + gRPC + TypeORM; register, login, validate token, invite/accept,
  profile, members, tenant plan & usage, super-admin plan assignment. **Built by the user.**
- **Template Service** — NestJS + gRPC + TypeORM; full CRUD + render + duplicate + favorites +
  popular templates; **CQRS pattern** (commands, queries, events).
- Cross-cutting **shared-kernel** package for common gRPC/domain code.

### 4.3 Data & Infrastructure
- **PostgreSQL** — two databases: `auth_db` and `templates_db`.
- **MinIO** — S3-compatible media/object storage.
- **JWT** payload: `{ userId, tenantId, email, role }` — `tenant_id` is the core isolation key.
- **Docker Compose** — postgres, auth-service, template-service, api-gateway, consul, nats,
  minio (plus AI + image services in production).
- **Convex** — planned for real-time (live cursors / draft sync).

### 4.4 Frontend Stack
- **Next.js 16** (App Router) + **React 19** — bleeding edge.
- **Tailwind CSS 4** + **Framer Motion** (animations).
- **dnd-kit** (drag-and-drop), **Monaco** (code editor), **Tiptap** (contract rich text),
  **MJML** (email rendering), **pdf-lib / pdfjs** (PDF), **jszip / xlsx** (export).
- **Vercel AI SDK v6** (`ai`) + `@ai-sdk/openai-compatible` for the agentic tool-calling loop.
- **MCP SDK** (`@modelcontextprotocol/sdk`) for the tool-discovery endpoint.
- **Stripe** (`@stripe/stripe-js`, `@stripe/react-stripe-js`) — embedded checkout.

### 4.5 AI Engine (how the assistant actually works)
- The AI **calls block-tools** (one tool per block type + `setTheme`, `startSection`,
  `startCard`, `startHero`, `addColorBar`, layout/move/edit tools — **32 tools total**) that
  return the same `BlockData` JSON the manual editor produces. MJML is only generated at export.
- **Primary fresh-generation path = a deterministic "planner":** one schema-constrained LLM call
  produces a `DesignSpec` (design system + colors + sections), which code executes into blocks.
  Fast, reliable, no duplication, single footer.
- **Edit mode & agentic fallbacks** run through the **MCP** tool layer (model-driven).
- **Intent router** classifies each turn (clear / rewrite / image / edit / theme change) so the
  right deterministic or model path fires — with **truthful confirmations** (the assistant only
  claims success when the template actually changed).
- Robustness: contrast guards, output sanitizers (strip model "thinking" leakage), zero-block
  retries, token caps, and a design-critic pass.

---

## 5. Production & DevOps

- **Live in production** on the company server (`finanssor-data-center-v1`), deployed under
  `/srv/projects/winaity-template-builder`.
- Public access via **Cloudflare Tunnel** (outbound-only, no inbound firewall ports, HTTPS handled
  by Cloudflare) across 5 hostnames:
  - `builder-template.winaity.com` (frontend)
  - `api-template-builder.winaity.com` (API gateway)
  - `minio-template-builder.winaity.com` (MinIO)
  - `ai-template-builder.winaity.com` (AI service)
  - `image-template-builder.winaity.com` (image pipeline)
- Separate **development** and **production** Docker Compose stacks.
- Secrets kept out of git (`.gitignore` + `.env.example` templates); strong production secrets.
- Repo hosted on **GitLab**; CI currently lint-only (deploy is manual `git pull && docker compose
  up -d --build`).

---

## 6. Project Timeline / Milestones

| Date (2026) | Milestone |
|-------------|-----------|
| Early | Core microservices (auth, template, gateway), Docker Compose, frontend, auth pages, dashboard, template editor — full end-to-end flow working |
| Jun 3–4 | Deployment prep + **live in production** via Cloudflare Tunnel |
| Jun 5 | `marketing` role + tenant-owned predefined template gallery |
| Jun 17 | API-key generation moved into the logged-in dashboard (Settings → Intégrations) |
| Jun 19 | **RCS builder** added as template type 5 |
| Jun 23–25 | **AI assistant re-engineered** to agentic tool/block generation (Vercel AI SDK + vLLM); premium design systems, critic pass, structural editing |
| Jun 29 | **Image-to-template** (poster → editable email via vision) |
| Jul 2–8 | AI editing reliability (intent router, deterministic edits, truthful confirmations); **subscriptions & billing** (Stripe, plans, enforcement, super-admin) |
| Jul 9 | New **marketing website** |
| Jul 15 | Embedded Stripe checkout + French VAT; real **MCP endpoint** exposing the builder tools |

---

## 7. What Makes It Stand Out (talking points for a presentation)

1. **Multi-channel** — one platform for email, invoice, contract, SMS, and RCS templates.
2. **Agentic AI that produces real editable blocks** — not throwaway HTML; visual and AI edits
   are interchangeable.
3. **Image-to-template via vision** — turn any marketing poster into an on-brand, editable email.
4. **Design intelligence in code** — palette derivation, contrast guarantees, 5 subject-matched
   design systems, premium block treatments.
5. **Real MCP integration** — modern, standards-based tool discovery; a strong "agentic
   architecture" story.
6. **Production-grade SaaS** — multi-tenant isolation, RBAC, Stripe subscriptions with correct
   VAT, plan enforcement, super-admin, embed/integration flow, Cloudflare-tunneled deployment.
7. **Modern microservices** — NestJS + gRPC + CQRS + TypeORM + PostgreSQL + MinIO, Dockerized.
8. **Self-hosted LLM** — private vLLM (gemma4-26b / qwen), no third-party API dependency for
   generation; data stays in-house.

---

## 8. Glossary

- **Tenant** — a company account; the isolation boundary for all data.
- **MJML** — a markup language that compiles to responsive email HTML.
- **Block / BlockData** — the atomic editable unit (heading, image, button…); the AI's tool
  contract and the editor's data model, one and the same.
- **DesignSpec** — a structured description of an email (design system + colors + sections) that
  the planner produces and code executes.
- **MCP (Model Context Protocol)** — a standard for exposing tools to an AI model so it discovers
  them dynamically.
- **vLLM** — a high-throughput inference server for open LLMs (self-hosted here).
- **RCS / RBM** — Rich Communication Services / RCS Business Messaging (rich, app-like SMS).
- **CQRS** — Command Query Responsibility Segregation, the pattern the services follow.

---

### Suggested presentation flow
1. Problem → 2. What Winaity is (elevator pitch) → 3. Live demo highlights (visual builder,
AI prompt generation, poster→email) → 4. Feature tour (multi-channel, AI, collaboration,
billing, integrations) → 5. Architecture & tech stack → 6. AI engine deep-dive → 7. Production
deployment → 8. What makes it stand out / roadmap.
