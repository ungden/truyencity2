"use client";

import React from "react";
import { Settings, Minus, Plus, Type, AlignJustify, Monitor, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useReading } from "@/contexts/reading-context";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { READING } from "@/lib/config";

type ButtonProps = React.ComponentProps<typeof Button>;

const themePresets: Array<{
  id: "light" | "dark" | "sepia" | "black";
  label: string;
  bg: string;
  fg: string;
}> = [
  { id: "light", label: "Light", bg: "#ffffff", fg: "#111111" },
  { id: "dark", label: "Dark", bg: "#0b1220", fg: "#e6e8ef" },
  { id: "sepia", label: "Sepia", bg: "#f8ecd9", fg: "#3b2f2a" },
  { id: "black", label: "True Black", bg: "#000000", fg: "#ffffff" },
];

export const ReadingSettings: React.FC<{ buttonProps?: ButtonProps }> = ({
  buttonProps,
}) => {
  const { settings, updateSettings } = useReading();
  const isMobile = useIsMobile();

  const updateNumber = (key: keyof typeof settings, next: number) => {
    updateSettings({ [key]: next } as any);
  };

  const changeFont = (delta: number) => {
    const next = Math.min(READING.MAX_FONT_SIZE, Math.max(READING.MIN_FONT_SIZE, settings.fontSize + delta));
    updateSettings({ fontSize: next });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" {...buttonProps}>
          <Settings size={20} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 space-y-5" align="end" side="top">
        <p className="text-xs text-muted-foreground">
          Cài đặt này áp dụng cho giao diện đọc (mọi truyện), không ảnh hưởng theme của ứng dụng.
        </p>

        <div className="flex items-center gap-2">
          <Type size={16} className="text-muted-foreground" />
          <p className="text-sm font-medium">Cài đặt đọc</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Màu nền</Label>
          <div className="flex items-center gap-2">
            {themePresets.map((t) => (
              <button
                key={t.id}
                aria-label={t.label}
                className={cn(
                  "h-8 w-8 rounded-full border",
                  "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  settings.theme === t.id ? "ring-2 ring-primary" : ""
                )}
                style={{ backgroundColor: t.bg }}
                onClick={() => updateSettings({ theme: t.id })}
                title={t.label}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Cỡ chữ</Label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeFont(-2)}
                disabled={settings.fontSize <= READING.MIN_FONT_SIZE}
              >
                <Minus size={14} />
              </Button>
              <span className="text-sm w-8 text-center">
                {settings.fontSize}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeFont(2)}
                disabled={settings.fontSize >= READING.MAX_FONT_SIZE}
              >
                <Plus size={14} />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Khoảng cách dòng
          </Label>
          <Slider
            value={[settings.lineHeight]}
            min={READING.MIN_LINE_HEIGHT}
            max={READING.MAX_LINE_HEIGHT}
            step={0.05}
            onValueChange={(v) => updateNumber("lineHeight", v[0])}
          />
          <div className="text-xs text-muted-foreground text-right">
            {settings.lineHeight.toFixed(2)}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Khoảng cách chữ
          </Label>
          <Slider
            value={[settings.letterSpacing]}
            min={-0.02}
            max={0.1}
            step={0.005}
            onValueChange={(v) => updateNumber("letterSpacing", v[0])}
          />
          <div className="text-xs text-muted-foreground text-right">
            {settings.letterSpacing.toFixed(3)} em
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Độ rộng cột (độ dài dòng)
          </Label>
          <Slider
            value={[settings.columnWidth]}
            min={READING.MIN_COLUMN_WIDTH}
            max={READING.MAX_COLUMN_WIDTH}
            step={2}
            onValueChange={(v) => updateNumber("columnWidth", v[0])}
          />
          <div className="text-xs text-muted-foreground text-right">
            {settings.columnWidth} ch
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Độ sáng</Label>
          <Slider
            value={[settings.brightness]}
            min={READING.MIN_BRIGHTNESS}
            max={READING.MAX_BRIGHTNESS}
            step={5}
            onValueChange={(v) => updateNumber("brightness", v[0])}
          />
          <div className="text-xs text-muted-foreground text-right">
            {settings.brightness}%
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <Label className="text-xs text-muted-foreground">Font chữ</Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(v) => updateSettings({ fontFamily: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system-ui">Hệ thống</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="sans-serif">Sans Serif</SelectItem>
                <SelectItem value="georgia">Georgia</SelectItem>
                <SelectItem value="monospace">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex flex-col items-start justify-center gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <AlignJustify size={12} /> Căn đều
            </Label>
            <Switch
              checked={settings.justify}
              onCheckedChange={(v) => updateSettings({ justify: !!v })}
            />
          </div>
        </div>

        {!isMobile && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Monitor size={12} /> Tùy chọn cho Desktop
            </Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">Rộng trên desktop</span>
              <Switch
                checked={settings.wideDesktop}
                onCheckedChange={(v) => updateSettings({ wideDesktop: !!v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <Columns size={14} /> 2 cột (desktop)
              </span>
              <Switch
                checked={settings.twoColumnsDesktop}
                onCheckedChange={(v) => updateSettings({ twoColumnsDesktop: !!v })}
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ReadingSettings;