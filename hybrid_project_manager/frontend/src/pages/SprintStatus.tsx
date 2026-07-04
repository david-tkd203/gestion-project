import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import anime from 'animejs';
import { getSprints, getSprintStatus } from '../api';
import { TrendingUp, AlertTriangle, Lock, CheckCircle, Loader2 } from '../icons';

function useCountUp(target: number, deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ref.current.textContent = String(target);
      return;
    }
    const obj = { v: 0 };
    const a = anime({
      targets: obj,
      v: target,
      round: 1,
      duration: 1200,
      easing: 'easeOutExpo',
      update: () => { if (ref.current) ref.current.textContent = String(obj.v); }
    });
    return () => anime.remove(obj);
  }, deps);
  return ref;
}

const SC: Record<string, string> = {
  backlog: '#6b7280', desarrollo: '#0d9488', revision_legal: '#f59e0b',
  qa: '#a855f7', done: '#10b981',
};

export default function SprintStatus() {
  const { id } = useParams();
  const [sprints, setSprints] = useState<any[]>([]);
  const [selected, setSelected] = useState(id || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadSprints = useCallback(async () => {
    try {
      const projsResp = await fetch('/api/proyectos/', { headers: { Authorization: 'Bearer ' + localStorage.getItem('access_token') } });
      const projs = await projsResp.json();
      const firstProj = projs.results?.[0] || projs?.[0];
      const s = firstProj ? await getSprints(firstProj.id) : await getSprints();
      setSprints(s);
      if (!id && s.length > 0) setSelected(s[0].id);
      else if (id) setSelected(id);
    } catch (e) { console.error(e); }
  }, [id]);

  useEffect(() => { loadSprints(); }, [loadSprints]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getSprintStatus(selected)
      .then(d => {
        setData(d);
        setTimeout(() => {
          anime({ targets: '.metric-cell,.flow-item,.blocked-card', opacity: [0, 1], translateY: [10, 0], delay: anime.stagger(50), easing: 'easeOutQuad' });
        }, 50);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selected]);

  const progressRef = useCountUp(data?.summary?.progress_pct || 0, [data?.summary?.progress_pct]);
  const timeRef = useCountUp(data?.summary?.time_progress_pct || 0, [data?.summary?.time_progress_pct]);
  const doneRef = useCountUp(data?.summary?.done_tasks || 0, [data?.summary?.done_tasks]);
  const blockedRef = useCountUp(data?.summary?.blocked_count || 0, [data?.summary?.blocked_count]);
  const acceptRef = useCountUp(data?.summary?.acceptance_progress_pct || 0, [data?.summary?.acceptance_progress_pct]);

  if (sprints.length === 0) {
    return (
      <div>
        <div className="page-header"><div><h2>Sprint Status</h2><p>Monitoreo de progreso del sprint</p></div></div>
        <div className="bento-cell" style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
          No hay sprints. Importa un Excel de VINCULOsync desde el Dashboard.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header"><div><h2>Sprint Status</h2><p>Monitoreo de progreso y metricas</p></div></div>

      <div className="tabs">
        {sprints.map((s: any) => (
          <button key={s.id} className={`tab ${selected === s.id ? 'active' : ''}`} onClick={() => setSelected(s.id)}>
            {s.codigo}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><Loader2 className="spinner" /> Cargando...</div> : data ? (
        <>
          <div className="bento-cell" style={{ borderLeft: `4px solid ${data.sprint?.color || '#0d9488'}`, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{data.sprint?.codigo} — {data.sprint?.nombre}</h3>
                <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
                  {data.sprint?.fecha_inicio} → {data.sprint?.fecha_fin}
                  {data.summary?.days_remaining > 0 ? ` (${data.summary.days_remaining} dias restantes)` : ' (Finalizado)'}
                </p>
              </div>
              {data.sprint?.meet_link && (
                <a href={data.sprint.meet_link} target="_blank" rel="noreferrer" className="btn-ghost" style={{ borderRadius: 20 }}>
                  Reunion
                </a>
              )}
            </div>
          </div>

          <div className="bento" style={{ gridTemplateAreas: `"progress time tareas bloqueadas criterios"`, marginBottom: 24 }}>
            <div className="metric-cell" style={{ gridArea: 'progress' }}>
              <div className="stat-value" ref={progressRef} style={{ color: 'var(--green)' }}>0</div>
              <div className="stat-label">Progreso</div>
            </div>
            <div className="metric-cell" style={{ gridArea: 'time' }}>
              <div className="stat-value" ref={timeRef} style={{ color: 'var(--accent)' }}>0</div>
              <div className="stat-label">Tiempo</div>
            </div>
            <div className="metric-cell" style={{ gridArea: 'tareas' }}>
              <div className="stat-value" ref={doneRef} style={{ color: 'var(--purple)' }}>0</div>
              <div className="stat-label">Tareas</div>
            </div>
            <div className="metric-cell" style={{ gridArea: 'bloqueadas' }}>
              <div className="stat-value" ref={blockedRef} style={{ color: (data?.summary?.blocked_count || 0) > 0 ? 'var(--red)' : 'var(--text3)' }}>0</div>
              <div className="stat-label">Bloqueadas</div>
            </div>
            <div className="metric-cell" style={{ gridArea: 'criterios' }}>
              <div className="stat-value" ref={acceptRef} style={{ color: 'var(--amber)' }}>0</div>
              <div className="stat-label">Criterios OK</div>
            </div>
          </div>

          <div className="section-title"><CheckCircle /> Criterios de Aceptacion</div>
          <div className="progress-bar" style={{ marginBottom: 24 }}>
            <div className="progress-fill" style={{ width: `${data.summary?.acceptance_progress_pct || 0}%`, background: 'var(--green)' }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text2)', marginTop: -16, display: 'block', marginBottom: 24 }}>
            {data.summary?.acceptance_criteria_done || 0} / {data.summary?.acceptance_criteria_total || 0} items completados
          </span>

          <div className="section-title"><TrendingUp /> Flujo por Etapas</div>
          <div className="flow-list" style={{ marginBottom: 24 }}>
            {(data.flow_progress || []).map((fp: any) => (
              <div key={fp.status} className="flow-item">
                <span style={{ width: 10, height: 10, borderRadius: 5, background: SC[fp.status] || '#666', display: 'inline-block' }} />
                <span className="flow-label">{fp.label}</span>
                <span className="flow-count">{fp.count}</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(fp.cumulative_pct, 100)}%`, background: SC[fp.status] || '#666' }} />
                </div>
                <span className="flow-pct">{fp.cumulative_pct}%</span>
              </div>
            ))}
          </div>

          {(data.blocked_tasks || []).length > 0 && (
            <div className="blocked-section">
              <div className="section-title" style={{ color: 'var(--red)' }}><AlertTriangle /> {data.blocked_tasks.length} Bloqueada(s)</div>
              {data.blocked_tasks.map((task: any) => (
                <div key={task.id} className="blocked-card">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span className="badge" style={{ backgroundColor: task.area_color }}>{task.codigo}</span>
                    <Lock />
                  </div>
                  <div style={{ fontSize: 13 }}>{task.titulo}</div>
                  <div className="bc-reason" style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{task.blocked_reason}</div>
                </div>
              ))}
            </div>
          )}

          {data.by_status && Object.entries(data.by_status).map(([label, group]: any) => (
            <div key={group.status} style={{ marginBottom: 20 }}>
              <div className="section-title" style={{ fontSize: 14 }}>{group.label} ({group.count})</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <table>
                  <thead><tr><th>Codigo</th><th>Titulo</th><th>Responsable</th><th>CA</th></tr></thead>
                  <tbody>
                    {group.tasks.map((task: any) => {
                      const ac = data.acceptance?.[task.codigo];
                      const acPct = ac ? Math.round((ac.done / (ac.total || 1)) * 100) : 0;
                      return (
                        <tr key={task.id}>
                          <td><span className="badge" style={{ backgroundColor: task.area_color }}>{task.codigo}</span></td>
                          <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.titulo}{task.is_blocked ? ' 🔒' : ''}
                          </td>
                          <td style={{ color: 'var(--text2)' }}>{task.responsable_nombre || '—'}</td>
                          <td>
                            {ac ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div className="progress-bar" style={{ flex: 1 }}>
                                  <div className="progress-fill" style={{ width: `${acPct}%`, background: 'var(--green)' }} />
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text2)' }}>{ac.done}/{ac.total}</span>
                              </div>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
