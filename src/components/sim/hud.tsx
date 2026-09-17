import {
  Crosshair,
  Locate,
  Pause,
  Play,
  Spline,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { MASS_PRESETS } from "@/lib/sim/presets";
import { SCENARIOS } from "@/lib/sim/scenarios";
import type { EngineApi, HudSnapshot, Kind, ScenarioId } from "@/lib/sim/types";

type Props = {
  hud: HudSnapshot;
  engine: EngineApi | null;
};

export function Hud({ hud, engine }: Props) {
  const scaleLabel = formatScale(hud.timeScale);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-3">
        <div className="pointer-events-none min-w-0">
          <p className="font-display text-2xl leading-none tracking-tight text-fg sm:text-3xl">
            Apoapsis
          </p>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Orbital gravity sandbox
          </p>
          {hud.hint ? (
            <p className="mt-2 max-w-[17rem] text-xs text-muted animate-hint sm:text-sm">
              Drag to fling a world. Pause to compose.
            </p>
          ) : null}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Stat label="Bodies" value={String(hud.count)} />
          <Stat label="Merges" value={String(hud.merges)} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 pt-4">
        <div className="pointer-events-auto flex max-w-full flex-wrap gap-1 sm:max-w-md">
          {SCENARIOS.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={hud.scenario === s.id ? "solid" : "ghost"}
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => engine?.loadScenario(s.id as ScenarioId)}
            >
              {s.label}
            </Button>
          ))}
        </div>

        <section
          className={cn(
            "pointer-events-auto mt-auto w-full max-w-3xl shrink-0 self-start rounded-[28px] border border-border",
            "bg-surface/80 p-3 shadow-[0_16px_60px_rgba(0,0,0,0.35)] sm:p-4",
          )}
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1">
              {MASS_PRESETS.map((p) => (
                <MassChip
                  key={p.id}
                  kind={p.id}
                  label={p.label}
                  selected={hud.preset === p.id}
                  onSelect={() => engine?.setPreset(p.id)}
                />
              ))}
            </div>

            <div className="mx-1 hidden h-8 w-px bg-border sm:block" />

            <div className="flex min-w-[11rem] flex-1 items-center gap-3 sm:min-w-[14rem]">
              <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                {scaleLabel}
              </span>
              <input
                type="range"
                aria-label="Time scale"
                min={0.25}
                max={8}
                step={0.25}
                value={hud.timeScale}
                onChange={(e) => engine?.setTimeScale(Number(e.target.value))}
                className="h-11 w-full cursor-pointer appearance-none bg-transparent accent-fg"
                suppressHydrationWarning
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Button
              size="icon"
              variant="outline"
              aria-label={hud.paused ? "Play" : "Pause"}
              onClick={() => engine?.setPaused(!hud.paused)}
            >
              {hud.paused ? (
                <Play className="size-4" />
              ) : (
                <Pause className="size-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant={hud.trails ? "solid" : "outline"}
              aria-label="Toggle trails"
              onClick={() => engine?.setTrails(!hud.trails)}
            >
              <Spline className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={hud.track ? "solid" : "outline"}
              aria-label="Track barycenter"
              onClick={() => engine?.setTrack(!hud.track)}
            >
              <Crosshair className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Fit view"
              onClick={() => engine?.fit()}
            >
              <Locate className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label={hud.mute ? "Unmute" : "Mute"}
              onClick={() => engine?.setMute(!hud.mute)}
            >
              {hud.mute ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
            <Button
              className="ml-auto"
              variant="outline"
              aria-label="Clear all bodies"
              onClick={() => engine?.clear()}
            >
              <Trash2 className="size-4" />
              Clear
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="font-mono text-sm tabular-nums text-fg">{value}</p>
    </div>
  );
}

function MassChip({
  kind,
  label,
  selected,
  onSelect,
}: {
  kind: Kind;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "grid size-11 place-items-center rounded-2xl border transition-[background-color,border-color,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
        "active:scale-[0.96]",
        selected
          ? "border-fg/45 bg-elevated"
          : "border-transparent hover:border-border hover:bg-elevated/60",
      )}
    >
      <span
        className={cn("block rounded-full", chipClass(kind), selected && "ring-2 ring-fg/40")}
      />
    </button>
  );
}

function chipClass(kind: Kind) {
  switch (kind) {
    case "dust":
      return "size-2 bg-mass-dust";
    case "moon":
      return "size-2.5 bg-mass-moon";
    case "world":
      return "size-3.5 bg-mass-world";
    case "giant":
      return "size-4 bg-mass-giant";
    case "star":
      return "size-5 bg-mass-star";
    case "well":
      return "size-3 bg-mass-well ring-1 ring-mass-giant/70";
  }
}

function formatScale(n: number) {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}×`;
  return `${String(rounded)}×`;
}
