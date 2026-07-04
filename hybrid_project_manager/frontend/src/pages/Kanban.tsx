import { useEffect, useState } from 'react';
import anime from 'animejs';
import { getSprints, getTareas, updateTareaStatus } from '../api';
import { KanbanIcon, Lock, AlertTriangle, Loader2, Users, FileText } from '../icons';

const STATUSES = [
  { key: 'backlog', label: 'Backlog', color: '#6b7280' },
  { key: 'desarrollo', label: 'Desarrollo', color: '#0d9488' },
  { key: 'revision_legal', label: 'Rev. Legal', color: '#f59e0b' },
  { key: 'qa', label: 'QA', color: '#a855f7' },
  { key: 'done', label: 'Done', color: '#10b981' },
];

export default function Kanban() {
  const [sprints, setSprints] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const projsResp = await fetch('/api/proyectos/', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('access_token') }
      });
      const projs = await projsResp.json();
      const firstProj = projs.results?.[0] || projs?.[0];
      const [s, t] = await Promise.all([
        firstProj ? getSprints(firstProj.id) : getSprints(),
        getTareas(),
      ]);
      setSprints(s);
      setTareas(t);
      if (!selectedSprint && s.length > 0) setSelectedSprint(s[0].id);
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading) {
      anime({ targets: '.bento-cell', opacity: [0, 1], translateY: [10, 0], delay: anime.stagger(40), easing: 'easeOutQuad' });
    }
    return () => anime.remove('.bento-cell');
  }, [loading, selectedSprint, tareas.length]);

  const moveTask = async (id: string, toStatus: string) => {
    setTareas(prev => prev.map((t: any) => t.id === id ? { ...t, status: toStatus } : t));
    try { await updateTareaStatus(id, toStatus); }
    catch (e: any) {
      const msg = e.message || 'Error al cambiar estado';
      setError(msg);
      load();
    }
  };

  const sprintTasks = selectedSprint ? tareas.filter((t: any) => t.sprint === selectedSprint) : tareas;

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando tablero...</div>;

  if (error) {
    return (
      <div>
        <div className="page-header"><div><h2>Kanban</h2><p>Tablero de tareas</p></div></div>
        <div className="bento-cell" style={{ textAlign: 'center', padding: 40, color: 'var(--red)' }}>
          <AlertTriangle /> <div style={{ marginTop: 8 }}>{error}</div>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={load}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (tareas.length === 0) {
    return (
      <div>
        <div className="page-header"><div><h2>Kanban</h2><p>Tablero de tareas del proyecto</p></div></div>
        <div className="bento-cell" style={{ textAlign: 'center', padding: 50 }}>
          <KanbanIcon /> <div style={{ marginTop: 12, color: 'var(--text2)' }}>No hay tareas. Importa un Excel de VINCULOsync desde el Dashboard.</div>
        </div>
      </div>
    );
  }

  const grouped = STATUSES.map(s => ({
    ...s, tasks: sprintTasks.filter((t: any) => t.status === s.key),
  }));

  return (
    <div>
      <div className="page-header">
        <div><h2>Kanban</h2><p>{tareas.length} tareas totales · {sprintTasks.length} en sprint actual</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={selectedSprint}
            onChange={e => setSelectedSprint(e.target.value)}
            style={{ width: 200 }}
          >
            <option value="">Todos los sprints</option>
            {sprints.map((s: any) => (
              <option key={s.id} value={s.id}>{s.codigo} — {s.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="kanban-board">
        {grouped.map(col => (
          <div key={col.key} className="kanban-col">
            <div className="kanban-col-header" style={{ borderTop: `3px solid ${col.color}` }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: col.color, display: 'inline-block' }} />
              {col.label}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text2)' }}>{col.tasks.length}</span>
            </div>
            <div className="kanban-col-body">
              {col.tasks.map((task: any) => (
                <div key={task.id} className={`bento-cell${task.is_blocked ? ' blocked' : ''}`}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span className="badge" style={{ backgroundColor: task.area_color }}>{task.codigo}</span>
                    {task.is_blocked && <Lock />}
                    <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                      {task.sprint_codigo}
                    </span>
                  </div>
                  <div className="card-title" style={{ fontWeight: 500 }}>{task.titulo}</div>
                  <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Users /> {task.responsable_nombre || 'Sin asignar'}
                  </div>
                  {task.is_blocked && (
                    <div className="card-blocked"><AlertTriangle /> {task.blocked_reason}</div>
                  )}
                  <div className="move-btns" style={{ display: 'flex', gap: 3, marginTop: 8, flexWrap: 'wrap' }}>
                    {STATUSES.filter(s => s.key !== task.status).map(s => (
                      <button
                        key={s.key}
                        onClick={() => moveTask(task.id, s.key)}
                        style={{
                          background: s.color + '15', color: s.color, fontSize: 9,
                          padding: '2px 7px', borderRadius: 4, border: `1px solid ${s.color}30`,
                        }}
                      >
                        → {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {col.tasks.length === 0 && <div className="empty-col">Sin tareas</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
