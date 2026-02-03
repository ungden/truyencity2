"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StatsTileProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}

const StatsTile: React.FC<StatsTileProps> = ({ icon, value, label, onClick, className }) => {
  const interactive = !!onClick;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      className={cn(
        "text-center p-4 rounded-lg border bg-card",
        interactive
          ? "cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "",
        className
      )}
    >
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
};

export default StatsTile;