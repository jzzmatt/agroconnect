# AGROCONNECT — Architecture Overview

## 1. Product Vision & Pillars

**AGROCONNECT** is the digital ecosystem for agriculture in Angola (*Ecossistema Digital para Agricultura*), structured around three primary business pillars and one transversal geographic capability.

```
                    ┌─────────────────────────────────────────┐
                    │               AGROCONNECT               │
                    │   The Digital Ecosystem for Agriculture │
                    └────────────────────┬────────────────────┘
                                         │
       ┌───────────────────┬─────────────┴─────┬───────────────────┐
       │                   │                   │                   │
┌──────┴──────┐     ┌──────┴──────┐     ┌──────┴──────┐     ┌──────┴──────┐
│  AgriExpert │     │ AgriAcademy │     │AgriShopping │     │AgriLocaliza-│
│   (People & │     │ (Knowledge  │     │  (Products  │     │     ção     │
│  Expertise) │     │ & Training) │     │ & Commerce) │     │ (Geographic │
│             │     │             │     │             │     │ Discovery)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Business Pillars

1. **AgriExpert** (`/agriexpert`):
   - Marketplace for agricultural experts, agronomists, veterinarians, and soil & pest consultants.
   - Enables direct scheduling of technical consultations, farm visits, and advisory services.

2. **AgriAcademy** (`/agriacademy`):
   - Training and educational marketplace tailored to the Angolan agro-climatic context.
   - Courses, video masterclasses, technical lessons, and professional certificates.

3. **AgriShopping** (`/agrishopping`):
   - Agricultural product marketplace connecting verified sellers, agribusinesses, and farmers.
   - Products include seeds, fertilizers, irrigation systems, machinery, tools, and veterinary supplies.

4. **AgriLocalização** (`/agrilocalizacao`):
   - **Not a separate silo/marketplace**, but a **core platform capability** shared across all entities (experts, courses, products, farms, companies).
   - Allows users to search and discover by province, municipality, commune, GPS coordinates, or proximity radius ("Perto de mim").

---

## 2. Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui custom design system
- **Identity & Auth**: Clerk (Google & Email auth, server-side auth protection)
- **Database**: Supabase PostgreSQL with PostGIS extension for spatial queries
- **Security**: Supabase Row Level Security (RLS) evaluated with Clerk JWT claims
- **Geospatial**: Custom Haversine engine + Provider-Agnostic Map Canvas
- **Testing**: Vitest + React Testing Library (31 automated unit & integration tests)

---

## 3. Directory Structure

```
agroconnect/
├── docs/                      # Technical Documentation
│   ├── architecture.md
│   ├── authentication.md
│   ├── database.md
│   ├── localization.md
│   ├── agrilocalizacao.md
│   └── development.md
├── src/
│   ├── app/                   # Next.js App Router Routes
│   │   ├── (dashboard)/       # Protected Dashboard Layout & Views
│   │   │   ├── dashboard/
│   │   │   ├── profile/
│   │   │   │   └── edit/
│   │   │   ├── settings/
│   │   │   └── layout.tsx
│   │   ├── agriacademy/       # Knowledge & Training Pillar
│   │   ├── agriexpert/        # Expert Marketplace Pillar
│   │   ├── agrilocalizacao/   # Geospatial Discovery Hub
│   │   ├── agrishopping/      # Agricultural Products Pillar
│   │   ├── about/             # About Page
│   │   ├── pricing/           # Pricing Tiers
│   │   ├── globals.css        # Tailwind & Brand Theme Variables
│   │   ├── layout.tsx         # Root Layout (Clerk + i18n Providers)
│   │   └── page.tsx           # Primary Marketing Landing Page
│   ├── components/
│   │   ├── ui/                # Base UI Library (Button, Card, Badge, etc.)
│   │   ├── navigation/        # Navbar & MobileBottomNav
│   │   ├── layout/            # Footer & Layout wrappers
│   │   ├── dashboard/         # Dashboard Sidebar & Header
│   │   └── location/          # LocationMap, LocationSelector, LocationBadge
│   ├── config/
│   │   ├── tokens.ts          # Centralized Design Tokens (Figma aligned)
│   │   ├── locations.ts       # Angola 18 Provinces & Municipalities
│   │   ├── navigation.ts      # Role-Adaptive Navigation Spec
│   │   └── mock-data.ts       # Domain Data for Phase 1
│   ├── features/
│   │   └── auth/              # Clerk Auth Components & Sync
│   ├── i18n/
│   │   ├── config.ts          # Locales config (pt default)
│   │   ├── provider.tsx       # React Context Provider (useI18n)
│   │   └── dictionaries/      # Portuguese & English Dictionaries
│   ├── lib/
│   │   ├── clerk/             # Server Auth Helpers
│   │   ├── supabase/          # Client & Server Supabase Factories
│   │   ├── location/          # Geospatial & Distance Utilities
│   │   └── utils.ts           # Class merging (cn)
│   └── types/
│       ├── database.ts        # Supabase Schema Types
│       └── domain.ts          # Domain Models & Interfaces
├── supabase/
│   ├── migrations/            # SQL Migrations (PostGIS, Tables, RLS)
│   └── seed/angola/           # Reference Seed Data (18 Provinces & Hubs)
└── README.md
```
