import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import anime from 'animejs';

interface Task {
  id: string;
  codigo: string;
  titulo: string;
  area: string;
  area_color?: string;
  status: string;
  fecha_inicio_estimada: string;
  fecha_fin_estimada: string;
  duracion_dias: number;
  orden: number;
  dependencias?: string[];
}

interface Sprint {
  id: string;
  codigo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  color: string;
  progress: number;
  tasks: Task[];
}

interface Props {
  sprints: Sprint[];
  onTaskClick?: (taskId: string) => void;
}

const LABEL_W = 180;
const HEADER_H = 36;
const BAR_H = 22;
const ROW_GAP = 8;
const TASK_ROW_H = BAR_H + ROW_GAP;
const MIN_DAY_W = 20;

function diffDays(a: string, b: string): number {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

// ponytail: inline colors, no runtime import from SprintFlow
const AREA_COLORS: Record<string, string> = {
  'Dirección de Proyecto': '#3b82f6',
  'Arquitectura': '#8b5cf6',
  'Desarrollo Fullstack': '#06b6d4',
  'Desarrollo Backend y Ciberseguridad': '#ef4444',
  'Diseño UX/UI': '#ec4899',
  'Gestión Cultural': '#f59e0b',
  'Liderazgo Técnico OSUC': '#10b981',
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280', desarrollo: '#0d9488', revision_legal: '#f59e0b', qa: '#a855f7', done: '#10b981',
};

/** Draw a chevron arrow inside SVG — avoids embedding React components in SVG text */
function ChevronSVG({ x, y, expanded: down }: { x: number; y: number; expanded: boolean }) {
  if (down) {
    return <polyline points={`${x},${y-4} ${x+6},${y+2} ${x+12},${y-4}`}
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  }
  return <polyline points={`${x},${y-6} ${x+6},${y} ${x},${y+6}`}
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
}

export default function GanttChart({ sprints, onTaskClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [containerW, setContainerW] = useState(1000);
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Expand first sprint by default on mount
  useEffect(() => {
    if (sprints.length > 0 && expanded.size === 0) {
      setExpanded(new Set([sprints[0].id]));
    }
  }, [sprints]);

  // ResizeObserver for responsive width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setContainerW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animate bars on mount
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bars = containerRef.current?.querySelectorAll('.gantt-bar-inner');
    if (bars?.length) {
      anime({ targets: bars, scaleX: [0, 1], duration: 600, easing: 'easeOutQuint', delay: anime.stagger(30) });
    }
    return () => anime.remove(bars);
  }, [sprints, expanded]);

  const timeline = useMemo(() => {
    let minDate = '9999-12-31', maxDate = '0001-01-01';
    for (const s of sprints) {
      for (const t of s.tasks) {
        if (t.fecha_inicio_estimada && t.fecha_inicio_estimada < minDate) minDate = t.fecha_inicio_estimada;
        if (t.fecha_fin_estimada && t.fecha_fin_estimada > maxDate) maxDate = t.fecha_fin_estimada;
      }
      if (s.fecha_inicio && s.fecha_inicio < minDate) minDate = s.fecha_inicio;
      if (s.fecha_fin && s.fecha_fin > maxDate) maxDate = s.fecha_fin;
    }
    if (minDate === '9999-12-31') return null;
    return { start: minDate, end: maxDate };
  }, [sprints]);

  const dayWidth = useMemo(() => {
    if (!timeline) return MIN_DAY_W;
    const totalDays = diffDays(timeline.end, timeline.start) + 1;
    return Math.max(MIN_DAY_W, (containerW - LABEL_W - 20) / totalDays);
  }, [timeline, containerW]);

  const todayX = useMemo(() => {
    if (!timeline) return 0;
    const offset = diffDays(new Date().toISOString().slice(0, 10), timeline.start);
    return LABEL_W + offset * dayWidth;
  }, [timeline, dayWidth]);

  const rows = useMemo(() => {
    const r: { type: 'header' | 'task'; sprint: Sprint; task?: Task; y: number }[] = [];
    let y = 10;
    for (const sprint of sprints) {
      r.push({ type: 'header', sprint, y });
      y += HEADER_H;
      if (expanded.has(sprint.id)) {
        for (const task of sprint.tasks) {
          r.push({ type: 'task', sprint, task, y });
          y += TASK_ROW_H;
        }
      }
    }
    return r;
  }, [sprints, expanded]);

  const getTaskPos = useCallback((task: Task) => {
    if (!timeline) return { x: LABEL_W, w: 10 };
    const startOffset = diffDays(task.fecha_inicio_estimada, timeline.start);
    const dur = task.duracion_dias || 1;
    return {
      x: LABEL_W + startOffset * dayWidth,
      w: Math.max(dur * dayWidth, 10),
    };
  }, [timeline, dayWidth]);

  if (!timeline || sprints.length === 0) {
    return (
      <div className="gantt-svg" ref={containerRef}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Sin datos para mostrar</div>
      </div>
    );
  }

  const totalDays = diffDays(timeline.end, timeline.start) + 1;
  const svgW = Math.max(containerW, LABEL_W + totalDays * dayWidth + 20);
  const totalHeight = rows.length > 0 ? rows[rows.length - 1].y + TASK_ROW_H : 100;

  return (
    <div className="gantt-svg" ref={containerRef} style={{ position: 'relative' }}>
      <svg width={svgW} height={totalHeight + 20} style={{ display: 'block' }}>
        {/* Day grid — thicker line every 7 days */}
        {Array.from({ length: totalDays + 1 }, (_, i) => {
          const x = LABEL_W + i * dayWidth;
          const isWeek = i % 7 === 0;
          return (
            <line key={i} x1={x} y1={0} x2={x} y2={totalHeight}
              stroke={isWeek ? 'var(--border)' : 'var(--border2)'}
              strokeWidth={isWeek ? 1 : 0.5} opacity={isWeek ? 0.5 : 0.2} />
          );
        })}

        {/* Today line */}
        <line x1={todayX} y1={0} x2={todayX} y2={totalHeight}
          stroke="var(--red)" strokeWidth={2} strokeDasharray="4 2" opacity={0.7} />

        {/* Rows */}
        {rows.map((row, i) => {
          if (row.type === 'header') {
            const ex = expanded.has(row.sprint.id);
            return (
              <g key={`h-${row.sprint.id}`} className="gantt-header" role="button" tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const next = new Set(expanded);
                  ex ? next.delete(row.sprint.id) : next.add(row.sprint.id);
                  setExpanded(next);
                }}>
                {/* Sprint background */}
                <rect x={LABEL_W} y={row.y}
                  width={Math.max(containerW - LABEL_W, totalDays * dayWidth)}
                  height={HEADER_H - 2}
                  fill={row.sprint.color + '15'} rx={4} />
                {/* Chevron */}
                <ChevronSVG x={8} y={row.y + HEADER_H / 2} expanded={ex} />
                {/* Sprint label */}
                <text x={26} y={row.y + HEADER_H / 2 + 1} fontSize={13} fontWeight={600}
                  fill="var(--text)" dominantBaseline="middle">
                  {row.sprint.codigo} — {row.sprint.nombre}
                </text>
                {/* Progress badge */}
                <text x={containerW - 12} y={row.y + HEADER_H / 2 + 1}
                  fontSize={11} fill="var(--text2)" textAnchor="end" dominantBaseline="middle">
                  {Math.round(row.sprint.progress || 0)}%
                </text>
              </g>
            );
          }
          if (row.task) {
            const pos = getTaskPos(row.task);
            const ac = row.task.area_color || AREA_COLORS[row.task.area] || 'var(--accent)';
            return (
              <g key={`t-${row.task.id}`} className="gantt-bar" role="button" tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => onTaskClick?.(row.task!.id)}
                onMouseEnter={() => { setHoveredTask(row.task!); setTooltipPos({ x: pos.x, y: row.y }); }}
                onMouseLeave={() => setHoveredTask(null)}>
                {/* Task label */}
                <text x={8} y={row.y + TASK_ROW_H / 2 + 1} fontSize={11}
                  fill="var(--text2)" dominantBaseline="middle">
                  {row.task.codigo}
                </text>
                {/* Bar wrapper for animation */}
                <g className="gantt-bar-inner" style={{ transformOrigin: `${pos.x}px ${row.y + 4}px` }}>
                  <rect x={pos.x} y={row.y + 4} width={Math.max(pos.w, 6)} height={BAR_H}
                    rx={4} fill={ac} opacity={0.85}
                    stroke={row.task.status === 'done' ? 'var(--green)' : 'none'}
                    strokeWidth={row.task.status === 'done' ? 2 : 0} />
                  {/* Status indicator */}
                  <circle cx={pos.x + 6} cy={row.y + BAR_H / 2 + 4} r={4}
                    fill={STATUS_COLORS[row.task.status] || 'var(--text3)'} />
                </g>
              </g>
            );
          }
          return null;
        })}

        {/* ponytail: dependency arrows skipped — add when bar positions are stable */}
      </svg>

      {/* Tooltip */}
      {hoveredTask && (
        <div style={{
          position: 'absolute', left: Math.min(tooltipPos.x, containerW - 260),
          top: Math.max(tooltipPos.y - 50, 4), background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-lg)',
          zIndex: 100, pointerEvents: 'none', maxWidth: 300,
        }}>
          <div style={{ fontWeight: 600 }}>{hoveredTask.codigo}</div>
          <div style={{ color: 'var(--text2)', marginTop: 2 }}>{hoveredTask.titulo}</div>
          <div style={{ color: 'var(--text2)', marginTop: 2 }}>
            {hoveredTask.area} · {hoveredTask.status?.replace(/_/g, ' ')}
          </div>
        </div>
      )}
    </div>
  );
}
