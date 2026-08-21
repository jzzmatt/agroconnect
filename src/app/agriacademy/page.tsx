"use client";

import React, { useState } from "react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, CourseCard, SearchBar, EmptyState } from "@/components/ui";
import { LocationSelector } from "@/components/location";
import { useI18n } from "@/i18n/provider";
import { MOCK_COURSES } from "@/config/mock-data";
import { GraduationCap } from "lucide-react";

export default function AgriAcademyPage() {
  const { dict } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");

  const filteredCourses = MOCK_COURSES.filter((crs) => {
    const matchesSearch =
      crs.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crs.instructorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (crs.category && crs.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesProvince = selectedProvince
      ? crs.provinceName?.toLowerCase() === selectedProvince.toLowerCase()
      : true;

    return matchesSearch && matchesProvince;
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <SectionHeader
          badgeText="AgriAcademy • Academia"
          title={dict.pillars.agriAcademy.name}
          subtitle={dict.pillars.agriAcademy.headline}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Pesquisar por curso, instrutor ou tema agrícola..."
            />
          </div>
          <div className="lg:col-span-2">
            <LocationSelector
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              showRadius={false}
              className="p-3"
            />
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} {...course} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum curso encontrado"
            description="Não existem cursos ou formações com os filtros atuais."
            actionLabel="Limpar Filtros"
            onAction={() => {
              setSearchQuery("");
              setSelectedProvince("");
            }}
          />
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
