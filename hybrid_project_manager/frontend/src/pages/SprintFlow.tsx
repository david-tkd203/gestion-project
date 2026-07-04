import { useEffect, useState, useRef } from 'react';
import anime from 'animejs';
import { getSprints, getTareas } from '../api';
import { Calendar, Users, GitBranch, Shield, FileText, KanbanIcon, LayoutDashboard, Loader2, CheckCircle } from '../icons';
import TaskDetailModal from '../components/TaskDetailModal';

const AREA_CFG: Record<string, { label: string; color: string; icon: any }> = {
  DIR: { label: 'Direccion', color: '#3b82f6', icon: LayoutDashboard },
  ARQ: { label: 'Arquitectura', color: '#8b5cf6', icon: Shield },
  GEST: { label: 'G. Cultural', color: '#f59e0b', icon: Users },
  UXUI: { label: 'UX/UI', color: '#ec4899', icon: KanbanIcon },
  LIDE: { label: 'Liderazgo', color: '#10b981', icon: GitBranch },
  FULL: { label: 'Fullstack', color: '#06b6d4', icon: FileText },
  BACK: { label: 'Backend', color: '#ef4444', icon: Shield },
};
const AREA_ORDER = ['DIR', 'ARQ', 'GEST', 'UXUI', 'LIDE', 'FULL', 'BACK'];

export default function SprintFlow() {
  const [sprints, setSprints] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selSprint, setSelSprint] = useState<string | null>(null);
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const cronoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const projsResp = await fetch('/api/proyectos/', { headers: { Authorization: 'Bearer ' + localStorage.getItem('access_token') } });
      const projs = await projsResp.json();
      const firstProj = projs.results?.[0] || projs?.[0];
      const [s, t] = await Promise.all([
        firstProj ? getSprints(firstProj.id) : getSprints(),
        getTareas()
      ]);
      setSprints(s); setTareas(t);
      if (s.length > 0) setSelSprint(s[0].id);
      setTimeout(() => {
        anime({ targets: '.crono-bar', width: ['0%', (el: any) => el.dataset.pct + '%'], duration: 1200, easing: 'easeOutQuint', delay: anime.stagger(80) });
        anime({ targets: '.timeline-item', opacity: [0, 1], translateX: [-20, 0], delay: anime.stagger(100), easing: 'easeOutQuad' });
        anime({ targets: '.metric-cell', opacity: [0, 1], translateY: [15, 0], delay: anime.stagger(60), easing: 'easeOutQuad' });
      }, 100);
    })().catch(err => { console.error(err); }).finally(() => setLoading(false));
    return () => anime.remove(['.crono-bar', '.timeline-item', '.metric-cell']);
  }, []);

  useEffect(() => {
    if (!loading && cronoRef.current) {
      anime({ targets: '.crono-bar', width: ['0%', (el: any) => el.dataset.pct + '%'], duration: 1000, easing: 'easeOutQuint', delay: anime.stagger(60) });
    }
    return () => anime.remove('.crono-bar');
  }, [selSprint, loading]);

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando cronograma...</div>;

  if (sprints.length === 0) {
    return (
      <div>
        <div className="page-header"><div><h2>Cronograma</h2><p>Linea de tiempo visual del proyecto</p></div></div>
        <div className="bento-cell" style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <Calendar /> <div style={{ marginTop: 12 }}>No hay sprints. Importa un Excel de VINCULOsync.</div>
        </div>
      </div>
    );
  }

  const cur = sprints.find((s: any) => s.id === selSprint) || sprints[0];
  const curTasks = tareas.filter((t: any) => t.sprint === cur.id);
  const byArea: Record<string, any[]> = {};
  AREA_ORDER.forEach(c => { byArea[c] = []; });
  curTasks.forEach((t: any) => {
    const ac = t.codigo?.split('-')[1];
    if (ac && byArea[ac]) byArea[ac].push(t);
  });
  const totalCur = curTasks.length;
  const doneCur = curTasks.filter((t: any) => t.status === 'done').length;
  const pct = totalCur > 0 ? Math.round(doneCur / totalCur * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div><h2>Cronograma del Proyecto</h2><p>Visualizacion del flujo de trabajo por sprint y area de responsabilidad</p></div>
      </div>

      {/* Sprint selector como timeline horizontal */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {sprints.map((s: any, i: number) => (
          <button
            key={s.id}
            onClick={() => setSelSprint(s.id)}
            style={{
              flex: 1, padding: '14px 8px', border: 'none', borderRight: i < sprints.length - 1 ? '1px solid var(--border)' : 'none',
              background: selSprint === s.id ? s.color + '12' : 'var(--surface)',
              cursor: 'pointer', transition: 'all .2s', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: selSprint === s.id ? s.color : 'var(--text2)' }}>{s.codigo}</div>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{s.fecha_inicio?.slice(5)}</div>
            <div style={{ marginTop: 6, height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.progress || 0}%`, background: s.color, borderRadius: 2, transition: 'width .5s' }} />
            </div>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="bento" style={{ gridTemplateAreas: `"codigo completadas totales progreso"`, marginBottom: 24 }}>
        <div className="metric-cell" style={{ gridArea: 'codigo' }}>
          <div className="stat-icon" style={{ color: cur.color }}><Calendar /></div>
          <div className="stat-value" style={{ color: cur.color, fontSize: 18 }}>{cur.codigo}</div>
          <div className="stat-label">{cur.nombre}</div>
        </div>
        <div className="metric-cell" style={{ gridArea: 'completadas' }}>
          <div className="stat-icon" style={{ color: 'var(--green)' }}><CheckCircle /></div>
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 18 }}>{doneCur}/{totalCur}</div>
          <div className="stat-label">Tareas completadas</div>
        </div>
        <div className="metric-cell" style={{ gridArea: 'totales' }}>
          <div className="stat-icon" style={{ color: 'var(--accent)' }}><Users /></div>
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 18 }}>{curTasks.length}</div>
          <div className="stat-label">Tareas totales</div>
        </div>
        <div className="metric-cell" style={{ gridArea: 'progreso' }}>
          <div className="stat-icon" style={{ color: 'var(--amber)' }}><Calendar /></div>
          <div className="stat-value" style={{ color: 'var(--amber)', fontSize: 18 }}>{pct}%</div>
          <div className="stat-label">Progreso</div>
        </div>
      </div>

      {/* Timeline cronograma visual */}
      <div className="section-title"><Calendar /> Linea de tiempo del sprint</div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 24, overflow: 'hidden' }}>
        <div ref={cronoRef} className="flow-timeline">
          {curTasks.sort((a: any, b: any) => a.orden - b.orden).slice(0, 20).map((task: any, i: number) => {
            const ac = task.codigo?.split('-')[1];
            const cfg = AREA_CFG[ac] || { color: '#6b7280', label: ac, icon: LayoutDashboard };
            const Icon = cfg.icon;
            const isDone = task.status === 'done';
            const isBlocked = task.is_blocked;
            return (
              <div key={task.id} className="timeline-item" onClick={() => setModalTaskId(task.id)} style={{ cursor: 'pointer', animationDelay: `${i * 0.05}s` }}>
                <div className={`timeline-dot ${isDone ? 'done' : ''}`} />
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                  borderLeft: `3px solid ${cfg.color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="badge" style={{ backgroundColor: cfg.color }}>{task.codigo}</span>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{cfg.label}</span>
                    {isBlocked && <span style={{ fontSize: 11, color: 'var(--red)' }}>BLOQUEADO</span>}
                    {isDone && <span style={{ fontSize: 11, color: 'var(--green)' }}>COMPLETADO</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>
                      {task.status === 'done' ? 'Done' : task.status === 'desarrollo' ? 'En desarrollo' : task.status === 'revision_legal' ? 'Rev. Legal' : task.status === 'qa' ? 'QA' : 'Pendiente'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{task.titulo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                    <Users /> {task.responsable_nombre || 'Sin asignar'}
                  </div>
                  <div className="progress-bar" style={{ marginTop: 8, height: 4 }}>
                    <div className="progress-fill crono-bar" data-pct={isDone ? 100 : task.status === 'desarrollo' ? 50 : task.status === 'revision_legal' ? 70 : task.status === 'qa' ? 85 : 10}
                      style={{ background: cfg.color }} />
                  </div>
                </div>
              </div>
            );
          })}
          {curTasks.length > 20 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 13 }}>
              + {curTasks.length - 20} tareas mas — cambia de sprint para verlas
            </div>
          )}
        </div>
      </div>

      {/* Mapa de calor por area */}
      <div className="section-title"><Users /> Distribucion por area</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
        {AREA_ORDER.map(code => {
          const cfg = AREA_CFG[code];
          const tasks = byArea[code] || [];
          if (tasks.length === 0) return null;
          const Icon = cfg.icon;
          const ad = tasks.filter((t: any) => t.status === 'done').length;
          return (
            <div key={code} className="bento-cell" style={{ borderTop: `3px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{cfg.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>{ad}/{tasks.length} completadas</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 700, color: cfg.color }}>
                  {Math.round(ad / tasks.length * 100)}%
                </div>
              </div>
              <div className="progress-bar" style={{ height: 4, marginBottom: 10 }}>
                <div className="progress-fill" style={{ width: `${Math.round(ad / tasks.length * 100)}%`, background: cfg.color }} />
              </div>
              {tasks.slice(0, 4).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 11, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: cfg.color, fontWeight: 600, fontSize: 10, minWidth: 70 }}>{t.codigo}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</span>
                  <span style={{ color: 'var(--text2)', fontSize: 10 }}>{t.responsable_nombre?.split(' ')[0] || '—'}</span>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                    background: t.status === 'done' ? 'var(--green)' : t.status === 'desarrollo' ? 'var(--accent)' : 'var(--surface2)',
                  }} />
                </div>
              ))}
              {tasks.length > 4 && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>+{tasks.length - 4} mas</div>}
            </div>
          );
        })}
      </div>

      {modalTaskId && <TaskDetailModal taskId={modalTaskId} onClose={() => setModalTaskId(null)} />}

      {/* Tabla resumen de todos los sprints */}
      <div className="section-title"><Calendar /> Progreso global por sprint</div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
        <table>
          <thead><tr><th>Sprint</th><th>Progreso</th><th>DIR</th><th>ARQ</th><th>GEST</th><th>UXUI</th><th>LIDE</th><th>FULL</th><th>BACK</th><th>Total</th></tr></thead>
          <tbody>
            {sprints.map((s: any) => {
              const st = tareas.filter((t: any) => t.sprint === s.id);
              const ac = AREA_ORDER.map(c => st.filter((t: any) => t.codigo?.includes(`-${c}-`)).length);
              const tot = st.length;
              const dd = st.filter((t: any) => t.status === 'done').length;
              const sp = tot > 0 ? Math.round(dd / tot * 100) : 0;
              return (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelSprint(s.id)}>
                  <td><span className="badge" style={{ backgroundColor: s.color }}>{s.codigo}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="progress-bar" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ width: `${sp}%`, background: sp > 50 ? 'var(--green)' : sp > 20 ? 'var(--amber)' : 'var(--accent)' }} />
                      </div>
                      <span style={{ fontSize: 11 }}>{sp}%</span>
                    </div>
                  </td>
                  {ac.map((c, i) => (
                    <td key={i} style={{ textAlign: 'center', color: c > 0 ? AREA_ORDER[i] ? AREA_CFG[AREA_ORDER[i]]?.color : 'var(--text2)' : 'var(--text3)', fontWeight: c > 0 ? 600 : 400 }}>{c || '—'}</td>
                  ))}
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{tot}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
