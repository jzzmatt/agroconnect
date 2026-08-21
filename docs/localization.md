# Internationalization (i18n) Architecture

## 1. Portuguese-First Design

Portuguese is the default language (`pt`) across all platform UI text, notifications, error messages, and domain entities.

The internationalization engine (`src/i18n/`) is built with type safety to prevent hardcoded strings in components while maintaining an extensible structure for English (`en`) and other African languages in subsequent phases.

---

## 2. Standardized Terminology

| Concept | Official Portuguese (`pt`) | English (`en`) |
|---|---|---|
| **Platform** | AGROCONNECT | AGROCONNECT |
| **Tagline** | Ecossistema Digital para Agricultura | The Digital Ecosystem for Agriculture |
| **Pillar 1** | AgriExpert | AgriExpert |
| **Pillar 2** | AgriAcademy | AgriAcademy |
| **Pillar 3** | AgriShopping | AgriShopping |
| **Capability** | AgriLocalização | AgriLocalização |
| **Dashboard** | Painel | Dashboard |
| **Profile** | Perfil | Profile |
| **Settings** | Definições | Settings |
| **Expert** | Especialista | Expert |
| **Agricultural Expert** | Especialista Agrícola | Agricultural Expert |
| **Veterinarian** | Veterinário | Veterinarian |
| **Agronomist** | Agrónomo | Agronomist |
| **Consultant** | Consultor Agrícola | Agricultural Consultant |
| **Instructor** | Instrutor | Instructor |
| **Student** | Aluno | Student |
| **Course** | Curso | Course |
| **Training** | Formação | Training |
| **Product** | Produto | Product |
| **Service** | Serviço | Service |
| **Seller** | Vendedor | Seller |
| **Province** | Província | Province |
| **Municipality** | Município | Municipality |
| **Commune** | Comuna | Commune |

---

## 3. Usage in Components

### In Client Components

```tsx
"use client";
import { useI18n } from "@/i18n/provider";

export function ExampleComponent() {
  const { dict, locale, setLocale } = useI18n();

  return (
    <div>
      <h1>{dict.pillars.agriExpert.name}</h1>
      <p>{dict.pillars.agriExpert.headline}</p>
    </div>
  );
}
```

### In Server Components / Utilities

```tsx
import { getDictionary } from "@/i18n";

export default function ServerPage() {
  const dict = getDictionary("pt");
  return <h1>{dict.common.brandName}</h1>;
}
```
