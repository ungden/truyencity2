import { AdBanner } from "./AdBanner";

type Placement = "sidebar" | "between-content" | "chapter";

interface AdPlacementProps {
  placement: Placement;
  slot: string;
  className?: string;
}

const PLACEMENT_CONFIG: Record<Placement, { format: "auto" | "rectangle" | "horizontal"; className: string }> = {
  sidebar: {
    format: "rectangle",
    className: "my-4 flex justify-center",
  },
  "between-content": {
    format: "horizontal",
    className: "my-6 px-4",
  },
  chapter: {
    format: "auto",
    className: "my-8 px-4 lg:px-0 max-w-3xl mx-auto",
  },
};

export function AdPlacement({ placement, slot, className }: AdPlacementProps) {
  const config = PLACEMENT_CONFIG[placement];

  return (
    <AdBanner
      slot={slot}
      format={config.format}
      className={`${config.className}${className ? ` ${className}` : ""}`}
    />
  );
}
