import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ROUTH_MU } from "@/lib/sim/cr3bp";
import {
  JACOBI_NOTE,
  LAYOUT_CAPTION,
  STABILITY_KICKER,
  STABILITY_LEDE,
  STABILITY_LESSONS,
  STABILITY_SECTIONS,
  STABILITY_TITLE,
  systemStability,
  type StabilityLessonId,
} from "@/lib/sim/stability";
import type { EngineApi, HudSnapshot } from "@/lib/sim/types";

type Props = {
  open: boolean;
  onClose: () => void;
  hud: HudSnapshot;
  engine: EngineApi | null;
};

export function StabilitySheet({ open, onClose, hud, engine }: Props) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const rows = systemStability();
  const play = (id: StabilityLessonId) => {
    engine?.playLesson(id);
    if (window.matchMedia("(max-width: 767px)").matches) onClose();
  };

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stability-title"
      className="pointer-events-auto absolute inset-3 z-30 flex flex-col overflow-hidden rounded-xl border border-border bg-surface/95 shadow-[0_16px_60px_rgba(0,0,0,0.45)] animate-sheet outline-none md:inset-auto md:top-36 md:right-5 md:bottom-52 md:w-96"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="font-mono text-xs tabular-nums tracking-wider text-muted">
            {hud.stable ? "L4 / L5 linearly stable" : "Trojans unbound"}
            <span className="text-muted"> · μ </span>
            <span className="text-fg/80">{formatMu(hud.mu)}</span>
          </p>
          <h2
            id="stability-title"
            className="mt-1 font-display text-2xl leading-none tracking-tight text-fg text-balance"
          >
            {STABILITY_TITLE}
          </h2>
          <p className="mt-1 font-display italic text-sm text-muted">{STABILITY_KICKER}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Close stability essay"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        <p className="text-sm leading-relaxed text-fg/90 text-pretty">{STABILITY_LEDE}</p>

        <RouthMeter mu={hud.mu} stable={hud.stable} />

        <figure className="mt-4 rounded-lg border border-border bg-elevated/60 px-3 py-3">
          <LayoutMap />
          <figcaption className="mt-2 text-xs leading-relaxed text-muted text-pretty">
            {LAYOUT_CAPTION}
          </figcaption>
        </figure>

        {STABILITY_SECTIONS.map((section) => (
          <section key={section.id} className="mt-5">
            <h3 className="font-display text-xl leading-tight text-fg text-balance">
              {section.heading}
            </h3>
            {section.paragraphs.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-fg/85 text-pretty">
                {p}
              </p>
            ))}
            {section.id === "triangular" ? (
              <p className="mt-3 rounded-lg border border-border bg-elevated/70 px-3 py-2 font-mono text-xs leading-relaxed text-fg/90">
                μ<sub>R</sub> = ½ (1 − √69 / 9) ≈ {ROUTH_MU.toFixed(5)}
              </p>
            ) : null}
          </section>
        ))}

        <section className="mt-5">
          <h3 className="font-display text-xl leading-tight text-fg">The four systems</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
            Drag μ across the tick on the dock, or jump a preset. The badge follows the Routh cut.
          </p>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "flex items-start justify-between gap-3 px-3 py-2.5",
                  hud.system === row.id ? "bg-elevated/80" : "",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm text-fg">{row.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted text-pretty">{row.note}</p>
                </div>
                <p className="shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                  {formatMu(row.mu)}
                  <span className="mt-0.5 block text-fg/80">
                    {row.stable ? "below" : "above"}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5">
          <h3 className="font-display text-xl leading-tight text-fg">Watch the argument</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
            Each run stages the lab. On a narrow screen the essay steps aside so the canvas can speak.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {STABILITY_LESSONS.map((lesson) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => play(lesson.id)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-elevated/50 px-3 py-3 text-left transition-[background-color,border-color] duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:border-border-strong hover:bg-elevated"
                >
                  <span className="mt-0.5 font-mono text-xs tabular-nums text-muted">
                    {lesson.label}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-fg">{lesson.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted text-pretty">
                      {lesson.body}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-5 mb-1 text-xs leading-relaxed text-muted text-pretty">{JACOBI_NOTE}</p>
      </div>
    </aside>
  );
}

function RouthMeter({ mu, stable }: { mu: number; stable: boolean }) {
  const t = Math.min(1, Math.max(0, Math.log10(mu / 1e-6) / Math.log10(0.5 / 1e-6)));
  const r = Math.log10(ROUTH_MU / 1e-6) / Math.log10(0.5 / 1e-6);
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2 text-xs uppercase tracking-wider text-muted">
        <span>Mass ratio vs Routh</span>
        <span className="font-mono normal-case tabular-nums text-fg/80">
          {stable ? "below μ_R" : "above μ_R"}
        </span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-elevated">
        <span
          className="absolute top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted"
          style={{ left: `${r * 100}%` }}
          title="Routh limit"
        />
        <span
          className="absolute top-1/2 z-20 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
          style={{ left: `${t * 100}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-xs tabular-nums text-muted">
        μ {formatMu(mu)} · μ_R {ROUTH_MU.toFixed(5)}
      </p>
    </div>
  );
}

function LayoutMap() {
  return (
    <div className="grid grid-cols-5 items-center gap-y-2 font-mono text-xs text-muted">
      <span />
      <span />
      <span className="text-center text-fg">L4</span>
      <span />
      <span />
      <span className="text-center">L3</span>
      <span className="text-center text-fg/80">M1</span>
      <span className="text-center text-fg">L1</span>
      <span className="text-center text-fg/80">M2</span>
      <span className="text-center">L2</span>
      <span />
      <span />
      <span className="text-center text-fg">L5</span>
      <span />
      <span />
    </div>
  );
}

function formatMu(mu: number) {
  if (mu >= 0.1) return mu.toFixed(2);
  if (mu >= 0.01) return mu.toFixed(3);
  return mu.toExponential(2).replace("e", "×10^");
}
