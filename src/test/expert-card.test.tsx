import React from "react";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { ExpertCard } from "@/components/ui/ExpertCard";

describe("ExpertCard UI Presentation", () => {
  const sampleExpert = {
    id: "exp-1",
    name: "Dr. João Silva",
    title: "Médico Veterinário • Grandes Animais",
    specialty: "Sanidade Bovina, Reprodução e Nutrição Pecuária",
    provinceName: "Huambo",
    municipalityName: "Caála",
    rating: 4.9,
    consultationsCount: 42,
    avatarUrl: null,
    verified: true,
    hourlyRate: "25.000 Kz / hora",
    profileSlug: "dr-joao-silva",
  };

  it("renders expert details with structured hierarchy and badge", () => {
    render(<ExpertCard {...sampleExpert} />);

    expect(screen.getByText("Dr. João Silva")).toBeInTheDocument();
    expect(screen.getByText("Médico Veterinário • Grandes Animais")).toBeInTheDocument();
    expect(screen.getByText("Especialidade")).toBeInTheDocument();
    expect(screen.getByText("Sanidade Bovina, Reprodução e Nutrição Pecuária")).toBeInTheDocument();
    expect(screen.getByText("Caála, Huambo")).toBeInTheDocument();
    expect(screen.getByText("4.9")).toBeInTheDocument();
    expect(screen.getByText("(42)")).toBeInTheDocument();
    expect(screen.getByText("25.000 Kz / hora")).toBeInTheDocument();
    expect(screen.getByText("Consultar")).toBeInTheDocument();
  });

  it("links to the expert consultation page with profile slug or id", () => {
    render(<ExpertCard {...sampleExpert} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/agriexpert?expert=dr-joao-silva");
  });

  it("does not squeeze desktop cards into four columns", () => {
    const src = readFileSync(resolve(process.cwd(), "src/app/agriexpert/page.tsx"), "utf8");
    expect(src).toMatch("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6");
    expect(src).not.toMatch("xl:grid-cols-4");
  });
});
