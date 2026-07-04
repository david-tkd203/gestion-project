import { useEffect, useState } from 'react';
import { getProyectos, getProyectoGantt, getCriticalPath } from '../api';
import { Calendar, AlertTriangle, Loader2, GitBranch } from '../icons';
import GanttChart from '../components/GanttChart';
import TaskDetailModal from '../components/TaskDetailModal';

export default function Gantt() {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<any>(null);
  const [cp, setCp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);

  useEffect(() => {
    getProyectos().then(p => {
      setProyectos(p);
      if (p.length > 0) setSelected(p[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([getProyectoGantt(selected), getCriticalPath(selected)])
      .then(([g, c]) => { setData(g); setCp(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selected]);

  if (proyectos.length === 0) {
    return (
      <div>
        <div className="page-header"><div><h2>Carta Gantt</h2><p>Timeline del proyecto con ruta critica</p></div></div>
        <div className="bento-cell" style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>No hay proyectos. Crea uno e importa el Excel.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>Carta Gantt</h2><p>Timeline de sprints y ruta critica del proyecto</p></div>
        <select value={selected} onChange={e => setSelected(e.target.value)} style={{ width: 260 }}>
          {proyectos.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {loading ? <div className="loading"><Loader2 className="spinner" /> Cargando Gantt...</div> : data ? (
        <>
          <GanttChart sprints={(data.sprints || []).map((s: any) => ({ ...s, progress: s.progress ?? 0 }))}
            onTaskClick={id => setModalTaskId(id)} />
          <div className="bento" style={{ gridTemplateAreas: `"sprints tareas critica duracion"`, marginBottom: 24 }}>
            <div className="metric-cell" style={{ gridArea: 'sprints' }}>
              <div className="stat-icon" style={{ color: 'var(--accent)' }}><Calendar /></div>
              <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 20 }}>{data.timeline?.sprint_count || 0}</div>
              <div className="stat-label">Sprints</div>
            </div>
            <div className="metric-cell" style={{ gridArea: 'tareas' }}>
              <div className="stat-icon" style={{ color: 'var(--cyan)' }}><GitBranch /></div>
              <div className="stat-value" style={{ color: 'var(--cyan)', fontSize: 20 }}>{data.timeline?.total_tasks || 0}</div>
              <div className="stat-label">Tareas</div>
            </div>
            <div className="metric-cell" style={{ gridArea: 'critica' }}>
              <div className="stat-icon" style={{ color: 'var(--red)' }}><AlertTriangle /></div>
              <div className="stat-value" style={{ color: 'var(--red)', fontSize: 20 }}>{cp?.critical_path?.length || 0}</div>
              <div className="stat-label">Ruta critica</div>
            </div>
            <div className="metric-cell" style={{ gridArea: 'duracion' }}>
              <div className="stat-icon" style={{ color: 'var(--amber)' }}><Calendar /></div>
              <div className="stat-value" style={{ color: 'var(--amber)', fontSize: 20 }}>{cp?.length_days || 0} dias</div>
              <div className="stat-label">Duracion total</div>
            </div>
          </div>

          {(data.sprints || []).map((sprint: any) => (
            <div key={sprint.id} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', borderRadius: '8px 8px 0 0',
                background: sprint.color + '20', borderLeft: `3px solid ${sprint.color}`,
                marginBottom: 1,
              }}>
                <strong style={{ fontSize: 13 }}>{sprint.codigo}</strong>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>{sprint.nombre}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text2)' }}>
                  {sprint.fecha_inicio} → {sprint.fecha_fin}
                </span>
              </div>

              <div style={{ background: 'var(--surface)', borderRadius: '0 0 8px 8px', padding: 6, border: '1px solid var(--border)' }}>
                {(sprint.tasks || []).length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>Sin tareas</div>
                ) : (
                  (sprint.tasks || []).map((task: any) => {
                    const isCrit = cp?.critical_path?.some((c: any) => c.codigo === task.codigo);
                    return (
                      <div key={task.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                        marginBottom: 1, borderRadius: 4,
                        background: isCrit ? 'rgba(239,68,68,.06)' : 'transparent',
                        borderLeft: isCrit ? '3px solid var(--red)' : '3px solid transparent',
                      }}>
                        <span className="badge" style={{ backgroundColor: task.area_color, minWidth: 76, textAlign: 'center' }}>{task.codigo}</span>
                        <span style={{ flex: 1, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.titulo}</span>
                        <div style={{ width: 100, height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, width: '100%',
                            background: task.status === 'done' ? 'var(--green)' : task.status === 'desarrollo' ? 'var(--accent)' : task.status === 'qa' ? 'var(--purple)' : task.status === 'revision_legal' ? 'var(--amber)' : 'var(--surface2)',
                            opacity: task.status === 'done' ? 1 : task.status === 'backlog' ? 0.25 : 0.55,
                          }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text2)', width: 36, textAlign: 'right' }}>{task.fecha_inicio_estimada?.slice(5) || '—'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}

          {cp?.critical_path?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="section-title" style={{ color: 'var(--red)' }}><AlertTriangle /> Ruta Critica ({cp.length_days} dias)</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <table>
                  <thead><tr><th>#</th><th>Codigo</th><th>Tarea</th><th>Sprint</th><th>Duracion</th></tr></thead>
                  <tbody>
                    {cp.critical_path.map((c: any, i: number) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><span className="badge" style={{ backgroundColor: c.area_color }}>{c.codigo}</span></td>
                        <td>{c.titulo}</td>
                        <td>{c.sprint}</td>
                        <td>{c.duration} dias</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: 'var(--text2)' }}>Selecciona un proyecto</p>
      )}
      {modalTaskId && <TaskDetailModal taskId={modalTaskId} onClose={() => setModalTaskId(null)} />}
    </div>
  );
}
