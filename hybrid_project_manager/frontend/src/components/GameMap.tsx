import { useEffect, useRef, useMemo } from 'react';
import anime from 'animejs';
import { CheckCircle, Lock, AlertTriangle, ChevronDown } from '../icons';

interface Sprint {
  id: string;
  codigo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  color: string;
  progress: number;
}

interface TareaItem {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
  is_blocked: boolean;
  sprint: string;
  area_color?: string;
}

interface Props {
  sprints: Sprint[];
  tareas: TareaItem[];
  onNodeClick: (sprintId: string) => void;
  onTaskClick?: (tareaId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  done: '#10b981',
  desarrollo: '#0d9488',
  revision_legal: '#f59e0b',
  qa: '#a855f7',
  backlog: '#2a2a2a',
};

const STATUS_LABELS: Record<string, string> = {
  done: '✓',
  desarrollo: '⚙',
  revision_legal: '⚖',
  qa: '🔍',
  backlog: '·',
};

function getSprintState(sprint: Sprint): 'done' | 'active' | 'future' | 'overdue' {
  const today = new Date();
  const start = new Date(sprint.fecha_inicio);
  const end = new Date(sprint.fecha_fin);
  if (sprint.progress >= 100) return 'done';
  if (end < today && sprint.progress < 100) return 'overdue';
  if (start <= today && end >= today) return 'active';
  return 'future';
}

const SPRINT_STATE_COLORS = {
  done: '#10b981',
  active: '#0d9488',
  future: '#2a2a2a',
  overdue: '#ef4444',
};

const SPRINT_STATE_LABELS: Record<string, string> = {
  done: 'COMPLETADO',
  active: 'EN CURSO',
  future: 'BLOQUEADO',
  overdue: 'ATRASADO',
};

export default function GameMap({ sprints, tareas, onNodeClick, onTaskClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group tareas by sprint
  const tareasBySprint = useMemo(() => {
    const map: Record<string, TareaItem[]> = {};
    for (const t of tareas) {
      if (!map[t.sprint]) map[t.sprint] = [];
      map[t.sprint].push(t);
    }
    return map;
  }, [tareas]);

  // Animation on mount
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const container = containerRef.current;
    if (!container) return;

    const tl = anime.timeline({ easing: 'easeOutQuint' });

    // Level cards stagger in
    tl.add({
      targets: '.gm-level',
      translateY: [60, 0],
      opacity: [0, 1],
      duration: 600,
      delay: anime.stagger(150),
      easing: 'easeOutCubic',
    });

    // Task cards stagger in after levels
    tl.add({
      targets: '.gm-task-card',
      scale: [0, 1],
      opacity: [0, 1],
      duration: 400,
      delay: anime.stagger(40),
      easing: 'easeOutBack',
    }, '-=300');

    // Connectors draw in
    tl.add({
      targets: '.gm-connector-path',
      strokeDashoffset: [anime.setDashoffset, 0],
      duration: 800,
      easing: 'easeInOutSine',
    }, '-=500');

    // Active sprint pulse
    anime({
      targets: '.gm-level.active .gm-level-glow',
      opacity: [0.3, 0.8],
      loop: true,
      direction: 'alternate',
      duration: 2000,
      easing: 'easeInOutSine',
    });

    return () => anime.remove(['.gm-level', '.gm-task-card', '.gm-connector-path', '.gm-level-glow']);
  }, [sprints, tareas]);

  if (sprints.length === 0) {
    return (
      <div className="gm-container">
        <div className="gm-empty">
          <span className="gm-empty-icon">🗺</span>
          <p>No hay sprints para mostrar en el mapa</p>
          <small>Importá un Excel o creá sprints manualmente</small>
        </div>
      </div>
    );
  }

  return (
    <div className="gm-container" ref={containerRef}>
      <div className="gm-tower">
        {/* Meta flag at top */}
        <div className="gm-meta-flag top">
          <span className="gm-meta-icon">🏁</span>
          <span className="gm-meta-text">INICIO</span>
        </div>

        {sprints.map((sprint, idx) => {
          const state = getSprintState(sprint);
          const stateColor = SPRINT_STATE_COLORS[state];
          const tasks = tareasBySprint[sprint.id] || [];
          const doneCount = tasks.filter(t => t.status === 'done').length;
          const isLocked = state === 'future';

          return (
            <div key={sprint.id} className="gm-level-wrapper">
              {/* Connector from previous level */}
              {idx > 0 && (
                <div className="gm-connector">
                  <svg viewBox="0 0 40 32" className="gm-connector-svg">
                    <path
                      className="gm-connector-path"
                      d="M20 0 L20 32"
                      fill="none"
                      stroke="var(--border2)"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                    <polygon
                      points="14,22 20,32 26,22"
                      fill={stateColor + '60'}
                      stroke={stateColor}
                      strokeWidth={1}
                    />
                  </svg>
                </div>
              )}

              {/* Level card */}
              <div
                className={`gm-level ${state}`}
                style={{ cursor: 'pointer' }}
                onClick={() => onNodeClick(sprint.id)}
              >
                {/* Glow effect */}
                <div className="gm-level-glow" style={{ background: stateColor }} />

                {/* Level header */}
                <div className="gm-level-header">
                  <div className="gm-level-left">
                    <span className="gm-level-number" style={{ borderColor: stateColor, color: stateColor }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="gm-level-info">
                      <div className="gm-level-title-row">
                        <span className="gm-level-code" style={{ color: sprint.color || stateColor }}>
                          {sprint.codigo}
                        </span>
                        {isLocked && <Lock />}
                        {state === 'overdue' && <AlertTriangle />}
                        {state === 'done' && <CheckCircle />}
                      </div>
                      <span className="gm-level-name">{sprint.nombre}</span>
                    </div>
                  </div>

                  <div className="gm-level-right">
                    <span className="gm-level-state" style={{ color: stateColor }}>
                      {SPRINT_STATE_LABELS[state] || ''}
                    </span>
                    <span className="gm-level-dates">
                      {sprint.fecha_inicio?.slice(5)} — {sprint.fecha_fin?.slice(5)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="gm-progress-wrap">
                  <div className="gm-progress-bar">
                    <div
                      className="gm-progress-fill"
                      style={{
                        width: `${sprint.progress}%`,
                        background: state === 'overdue'
                          ? 'linear-gradient(90deg, #ef4444, #f87171)'
                          : state === 'done'
                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                            : `linear-gradient(90deg, ${sprint.color || stateColor}, ${sprint.color || stateColor}cc)`,
                      }}
                    />
                  </div>
                  <span className="gm-progress-text">{Math.round(sprint.progress)}%</span>
                  <span className="gm-task-count">{doneCount}/{tasks.length} tareas</span>
                </div>

                {/* Task sub-levels */}
                {tasks.length > 0 && (
                  <div className="gm-tasks-row" onClick={e => e.stopPropagation()}>
                    {tasks.map(t => {
                      const tColor = STATUS_COLORS[t.status] || '#2a2a2a';
                      const tLabel = STATUS_LABELS[t.status] || '·';
                      return (
                        <div
                          key={t.id}
                          className={`gm-task-card ${t.status}`}
                          onClick={() => onTaskClick?.(t.id)}
                          title={`${t.codigo}: ${t.titulo}`}
                        >
                          <div className="gm-task-indicator" style={{ background: tColor }} />
                          <span className="gm-task-symbol">{tLabel}</span>
                          <span className="gm-task-code">{t.codigo}</span>
                          <span className="gm-task-title">{t.titulo.slice(0, 25)}{t.titulo.length > 25 ? '…' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Goal flag at bottom */}
        <div className="gm-meta-flag bottom">
          <span className="gm-meta-icon">🏆</span>
          <span className="gm-meta-text">OBJETIVO</span>
        </div>
      </div>
    </div>
  );
}
