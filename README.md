# AGROCONNECT — The Digital Ecosystem for Agriculture
*Ecossistema Digital para Agricultura (Angola)*

[![Next.js](https://img.shields.io/badge/Next.js-16.3.2-black.svg?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-41%20Passed-green.svg?logo=vitest)](https://vitest.dev/)
[![Themes](https://img.shields.io/badge/Themes-Light%20%7C%20Dark-emerald.svg)](https://agroconnect.ao)

---

## 🌾 Overview

**AGROCONNECT** is an Angola-first SaaS platform uniting agricultural experts, farmers, students, agribusinesses, instructors, and sellers into a single connected ecosystem.

### Three Primary Business Pillars:
1. **AgriExpert** (`/agriexpert`): Expert Marketplace connecting agronomists, veterinarians, and agricultural consultants.
2. **AgriAcademy** (`/agriacademy`): Academy & Training Marketplace for agricultural certifications, courses, and technical knowledge.
3. **AgriShopping** (`/agrishopping`): Agricultural Product Marketplace for seeds, fertilizers, machinery, and farming inputs.

### Core Transversal Platform Capability:
4. **AgriLocalização** (`/agrilocalizacao`): Shared geospatial discovery engine covering all 18 provinces of Angola, powering location search across all three pillars.

---

## 🚀 Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, Server & Client Components)
- **Language**: TypeScript (Strict Mode)
- **Design System**: Tailwind CSS v4 + shadcn/ui custom tokens derived from Figma
- **Authentication**: Clerk (Google & Email OAuth, server-side protection middleware)
- **Database**: Supabase PostgreSQL with PostGIS extension for spatial queries
- **Security**: Supabase Row Level Security (RLS) integrated with Clerk native JWT tokens
- **Internationalization**: Portuguese (`pt`) default i18n dictionary engine with English (`en`) support
- **Testing**: Vitest + React Testing Library (31 automated unit & integration tests)

---

## 📂 Project Structure

```
agroconnect/
├── docs/                      # Technical Documentation
│   ├── architecture.md        # System architecture & pillar model
│   ├── authentication.md      # Clerk + Supabase native auth
│   ├── database.md            # PostgreSQL schema, PostGIS & RLS
│   ├── localization.md        # Portuguese i18n & dictionary engine
│   ├── agrilocalizacao.md     # Angola geographic engine & formulas
│   └── development.md         # Local setup & developer workflow
├── src/
│   ├── app/                   # App Router routes (Marketing & Dashboard)
│   ├── components/            # Reusable UI library (shadcn/ui + domain)
│   ├── config/                # Tokens, Angola locations, navigation specs
│   ├── features/              # Feature-based auth & profile sync
│   ├── i18n/                  # Dictionaries & React context provider
│   ├── lib/                   # Supabase clients, Clerk helpers, Geo utils
│   └── types/                 # Database & Domain TypeScript definitions
└── supabase/
    ├── migrations/            # SQL migrations (PostGIS, tables, RLS)
    └── seed/angola/           # 18 Provinces & municipal seed data
```

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/jzzmatt/agroconnect.git
cd agroconnect
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Quality Assurance & Scripts

```bash
# Run automated tests (Vitest)
npm run test

# Run TypeScript compiler check
npm run typecheck

# Run ESLint check
npm run lint

# Build optimized production bundle
npm run build
```

---

## 📖 Detailed Documentation

For comprehensive technical architecture and implementation specifications, see the [`docs/`](./docs) directory:
- [Architecture Overview](./docs/architecture.md)
- [Authentication & Clerk-Supabase Native Integration](./docs/authentication.md)
- [Database Schema & PostGIS](./docs/database.md)
- [Internationalization (i18n)](./docs/localization.md)
- [Theme System (Light / Dark)](./docs/theme-system.md)
- [AgriLocalização Engine](./docs/agrilocalizacao.md)
- [Developer Guide](./docs/development.md)

---

## 🛡️ License & Trademarks

© 2026 AGROCONNECT. Todos os direitos reservados.
*Desenvolvido para impulsionar o agronegócio em Angola.*
