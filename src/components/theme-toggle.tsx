"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const themes = [
    { value: "light", Icon: Sun, label: "Sáng" },
    { value: "dark", Icon: Moon, label: "Tối" },
    { value: "system", Icon: Monitor, label: "Hệ thống" }
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {themes.map(({ value, Icon, label }) => {
        const active = theme === value || (!theme && value === "system");
        return (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 rounded-md transition-colors",
              active
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            onClick={() => setTheme(value)}
            title={label}
          >
            <Icon size={14} />
            <span className="ml-1.5 text-xs font-medium">{label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;