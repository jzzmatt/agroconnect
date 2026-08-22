"use client";

import React from "react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default function NotificationsDashboardPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <NotificationCenter />
    </div>
  );
}
