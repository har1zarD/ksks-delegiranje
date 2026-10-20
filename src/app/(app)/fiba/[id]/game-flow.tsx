import type { FibaAction } from "@/lib/fiba";
import { periodShort } from "@/lib/format";

/**
 * Tok rezultata (razlika kroz utakmicu): iznad nule vodi domaćin, ispod gost.
 * Stepenasta linija po svakom pogođenom košu, uspravne linije na kraju četvrtina.
 */
export function GameFlow({ actions, home, away, periodMinutes }: {
  actions: FibaAction[];
  home: string;
  away: string;
  periodMinutes: { regular: number; overtime: number };
}) {
  const scores = actions.filter((a) => a.scoring && a.success);
  if (scores.length < 2) return null;
  const lastPeriod = Math.max(4, ...actions.map((a) => a.period));
  const regular = periodMinutes.regular * 60;
  const overtime = periodMinutes.overtime * 60;
  const total = 4 * regular + Math.max(0, lastPeriod - 4) * overtime;
  const ends = Array.from({ length: lastPeriod }, (_, i) => (i < 4 ? (i + 1) * regular : 4 * regular + (i - 3) * overtime));

  const points: [number, number][] = [[0, 0]];
  for (const a of scores) points.push([a.elapsed, a.home - a.away]);
  const end = Math.max(...actions.map((a) => a.elapsed));
  points.push([end, points[points.length - 1][1]]);

  const maxLead = Math.max(5, ...points.map(([, d]) => Math.abs(d)));
  const W = 1000;
  const H = 240;
  const x = (t: number) => (t / total) * W;
  const y = (d: number) => H / 2 - (d / maxLead) * (H / 2 - 12);

  // Stepenasto: razlika ostaje do sljedećeg koša
  let line = `M ${x(0)} ${y(0)}`;
  for (let i = 1; i < points.length; i++) line += ` H ${x(points[i][0]).toFixed(1)} V ${y(points[i][1]).toFixed(1)}`;
  const area = `${line} V ${y(0)} Z`;

  const homeMax = Math.max(0, ...points.map(([, d]) => d));
  const awayMax = Math.max(0, ...points.map(([, d]) => -d));

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
      <figcaption className="flex flex-wrap justify-between gap-2 border-b border-line px-4 py-2.5 text-[13px] sm:px-5">
        <span><span className="font-semibold">{home}</span> <span className="text-fg-muted">najveće vodstvo {homeMax}</span></span>
        <span><span className="font-semibold">{away}</span> <span className="text-fg-muted">najveće vodstvo {awayMax}</span></span>
      </figcaption>
      <div className="px-2 py-3 sm:px-4">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-48 w-full sm:h-60" role="img" aria-label={`Tok rezultata: najveće vodstvo ${home} ${homeMax}, ${away} ${awayMax}`}>
          <defs>
            <clipPath id="flow-top"><rect x="0" y="0" width={W} height={y(0)} /></clipPath>
            <clipPath id="flow-bottom"><rect x="0" y={y(0)} width={W} height={H - y(0)} /></clipPath>
          </defs>
          {ends.slice(0, -1).map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1="0" y2={H} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="stroke-line-strong" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={area} clipPath="url(#flow-top)" className="fill-fg/15" />
          <path d={area} clipPath="url(#flow-bottom)" className="fill-fg-faint/20" />
          <path d={line} fill="none" className="stroke-fg" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex text-[11px] font-semibold text-fg-faint">
          {ends.map((t, i) => (
            <span key={t} className="text-center" style={{ width: `${((t - (ends[i - 1] ?? 0)) / total) * 100}%` }}>{periodShort(i + 1)}</span>
          ))}
        </div>
      </div>
    </figure>
  );
}
