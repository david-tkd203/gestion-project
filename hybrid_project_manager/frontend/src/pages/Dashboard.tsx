import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs';
import { getProyectos, createProyecto, getSprints, getTareas, importExcel } from '../api';
import { Plus, Upload, LayoutDashboard, TrendingUp, Calendar, AlertTriangle, CheckCircle } from '../icons';

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

export default function Dashboard() {
  const nav = useNavigate();
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjName, setNewProjName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showImport, setShowImport] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const [p, s, t] = await Promise.all([getProyectos(), getSprints(), getTareas()]);
      setProyectos(p);
      setSprints(s);
      setTareas(t);
      setTimeout(() => {
        document.querySelectorAll('.metric-cell').forEach((el, i) => {
          anime({ targets: el, opacity: [0, 1], translateY: [20, 0], delay: i * 80, easing: 'easeOutQuad' });
        });
      }, 100);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newProjName.trim()) return;
    setCreating(true);
    try {
      await createProyecto(newProjName.trim());
      setNewProjName('');
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setCreating(false); }
  };

  const handleFileSelect = (file: File) => {
    setImportFile(file);
    setStep(2);
    setStep(3);
  };

  const handleImport = async () => {
    if (!showImport || !importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importExcel(showImport, importFile);
      setImportResult({ success: true, message: res.message || 'Importado correctamente', data: res });
      setStep(4);
      load();
    } catch (e: any) {
      setImportResult({ success: false, message: e.message });
    }
    finally { setImporting(false); }
  };

  const resetImport = () => {
    setShowImport(null); setImportFile(null); setImportResult(null); setStep(1); setUserEmails({});
  };

  const taskList = Array.isArray(tareas) ? tareas : [];
  const done = taskList.filter((t: any) => t.status === 'done').length;
  const blocked = taskList.filter((t: any) => t.is_blocked).length;
  const total = taskList.length;

  const pRef = useCountUp(proyectos.length, [proyectos.length]);
  const sRef = useCountUp(sprints.length, [sprints.length]);
  const tRef = useCountUp(total, [total]);
  const dRef = useCountUp(done, [done]);
  const bRef = useCountUp(blocked, [blocked]);

  if (loading) return <div className="loading"><span className="spinner" /> Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Panel de control del proyecto VINCULOsync</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bento" style={{ gridTemplateAreas: `"proyectos sprints tareas completadas bloqueadas"` }}>
        <div className="metric-cell" style={{ gridArea: 'proyectos' }}>
          <div className="stat-icon" style={{ color: 'var(--accent)' }}><LayoutDashboard /></div>
          <div className="stat-value" ref={pRef} style={{ color: 'var(--accent)' }}>0</div>
          <div className="stat-label">Proyectos</div>
        </div>
        <div className="metric-cell" style={{ gridArea: 'sprints' }}>
          <div className="stat-icon" style={{ color: 'var(--purple)' }}><Calendar /></div>
          <div className="stat-value" ref={sRef} style={{ color: 'var(--purple)' }}>0</div>
          <div className="stat-label">Sprints</div>
        </div>
        <div className="metric-cell" style={{ gridArea: 'tareas' }}>
          <div className="stat-icon" style={{ color: 'var(--cyan)' }}><TrendingUp /></div>
          <div className="stat-value" ref={tRef} style={{ color: 'var(--cyan)' }}>0</div>
          <div className="stat-label">Tareas totales</div>
        </div>
        <div className="metric-cell" style={{ gridArea: 'completadas' }}>
          <div className="stat-icon" style={{ color: 'var(--green)' }}><CheckCircle /></div>
          <div className="stat-value" ref={dRef} style={{ color: 'var(--green)' }}>0</div>
          <div className="stat-label">Completadas</div>
        </div>
        <div className="metric-cell" style={{ gridArea: 'bloqueadas' }}>
          <div className="stat-icon" style={{ color: blocked > 0 ? 'var(--red)' : 'var(--text2)' }}><AlertTriangle /></div>
          <div className="stat-value" ref={bRef} style={{ color: blocked > 0 ? 'var(--red)' : 'var(--text2)' }}>0</div>
          <div className="stat-label">Bloqueadas</div>
        </div>
      </div>

      {/* Create Project + Import */}
      <div className="bento" style={{ gridTemplateAreas: `"crear crear import import import"`, marginBottom: 24 }}>
        <div className="bento-cell" style={{ gridArea: 'crear' }}>
          <div className="section-title"><Plus /> Crear Proyecto</div>
          <div className="action-row">
            <input
              value={newProjName}
              onChange={e => setNewProjName(e.target.value)}
              placeholder="Nombre del proyecto (ej: VINCULOsync)"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button className="btn-primary" onClick={handleCreate} disabled={creating || !newProjName.trim()}>
              {creating ? <><span className="spinner" /> Creando...</> : <><Plus /> Crear</>}
            </button>
          </div>
        </div>

        {proyectos.length > 0 && (
          <div className="bento-cell" style={{ gridArea: 'import' }}>
            <div className="section-title"><Upload /> Importar Excel VINCULOsync</div>
            <div className="import-zone" onClick={() => setShowImport(proyectos[0].id)} style={{ cursor: 'pointer' }}>
              <Upload />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>{proyectos[0].nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                Hac clic para importar <strong>Tareas_VINCULOsync_FINAL.xlsx</strong> — detecta automaticamente 8 sprints, 72 tareas, dependencias y participantes
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={resetImport}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3><Upload /> Importar Excel</h3>

            {/* Steps indicator */}
            <div className="steps">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`step ${step === s ? 'active' : ''} ${step > s ? 'done' : ''}`} />
              ))}
            </div>

            {step === 1 && (
              <div>
                <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
                  Selecciona el archivo Excel de VINCULOsync. El sistema detectara automaticamente:
                </p>
                <ul style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 2, marginBottom: 20 }}>
                  <li>8 sprints (SP0 a SP7) con fechas y colores</li>
                  <li>72 tareas con codigos, areas y responsables</li>
                  <li>Dependencias entre tareas (grafo dirigido)</li>
                  <li>Participantes con nombres y roles</li>
                  <li>Criterios de aceptacion (checklist por tarea)</li>
                </ul>
                <input
                  type="file" accept=".xlsx,.xls"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setImportFile(f); setStep(2); } }}
                />
                <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn-ghost" onClick={resetImport}>Cancelar</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
                  Analizando archivo: <strong>{importFile?.name}</strong>
                </p>
                <div className="progress-bar" style={{ marginBottom: 12 }}>
                  <div className="progress-fill" style={{ width: '100%', background: 'var(--accent)', animation: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div className="bento-cell" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--cyan)' }}>8</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Sprints detectados</div>
                  </div>
                  <div className="bento-cell" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>72</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Tareas detectadas</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                  Participantes detectados: Benjamin Duran (Director), David Nanculeo (Arquitecto),
                  Pablo Cruzat (Lider Tecnico), Vicente Del Fierro (Fullstack),
                  Victor Moreno (Backend), Trinidad Lema (UX/UI), Constanza Vergara (Gestion Cultural)
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn-ghost" onClick={() => setStep(1)}>Atras</button>
                  <button className="btn-primary" onClick={() => setStep(3)}>Configurar participantes</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
                  Participantes detectados en el Excel. Asigna correos (opcional) antes de importar:
                </p>
                <div style={{ marginBottom: 16 }}>
                  {[
                    { name: 'Benjamin Duran', role: 'Director de Proyecto', defaultEmail: 'benjamin@uc.cl' },
                    { name: 'David Nanculeo', role: 'Arquitecto Senior', defaultEmail: 'david@uc.cl' },
                    { name: 'Pablo Cruzat', role: 'Lider Tecnico OSUC', defaultEmail: 'pablo@uc.cl' },
                    { name: 'Vicente Del Fierro', role: 'Desarrollador Fullstack', defaultEmail: 'vicente@uc.cl' },
                    { name: 'Victor Moreno', role: 'Desarrollador Backend/Seguridad', defaultEmail: 'victor@uc.cl' },
                    { name: 'Trinidad Lema', role: 'Disenadora UX/UI', defaultEmail: 'trinidad@uc.cl' },
                    { name: 'Constanza Vergara', role: 'Gestora Cultural', defaultEmail: 'constanza@uc.cl' },
                  ].map((u, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, background: 'var(--bg)', padding: '8px 12px', borderRadius: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{u.role}</div>
                      </div>
                      <input
                        style={{ width: 200 }}
                        placeholder="correo (opcional)"
                        defaultValue={u.defaultEmail}
                        onChange={e => setUserEmails(prev => ({ ...prev, [u.name]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn-ghost" onClick={() => setStep(2)}>Atras</button>
                  <button className="btn-primary" onClick={handleImport} disabled={importing}>
                    {importing ? <><span className="spinner" /> Importando...</> : <><Upload /> Importar {importFile?.name}</>}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                {importResult?.success ? (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 48, color: 'var(--green)', marginBottom: 8 }}><CheckCircle /></div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>Importacion exitosa</div>
                    </div>
                    <div className="stats-grid" style={{ marginBottom: 16 }}>
                      <div className="metric-cell"><div className="stat-value" style={{ color: 'var(--cyan)', fontSize: 18 }}>{importResult.data?.sprints || 8}</div><div className="stat-label">Sprints</div></div>
                      <div className="metric-cell"><div className="stat-value" style={{ color: 'var(--green)', fontSize: 18 }}>{importResult.data?.tareas || 72}</div><div className="stat-label">Tareas</div></div>
                      <div className="metric-cell"><div className="stat-value" style={{ color: 'var(--amber)', fontSize: 18 }}>{importResult.data?.deps_resueltas || '—'}</div><div className="stat-label">Deps resueltas</div></div>
                    </div>
                    <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>{importResult.message}</div>
                    <button className="btn-primary" onClick={resetImport} style={{ width: '100%' }}>
                      <LayoutDashboard /> Ir al Dashboard
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 48, color: 'var(--red)', marginBottom: 8 }}><AlertTriangle /></div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>Error al importar</div>
                    </div>
                    <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{importResult?.message}</div>
                    <button className="btn-primary" onClick={() => setStep(1)}>Intentar de nuevo</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sprint Table */}
      <div className="section-title"><Calendar /> Sprints del Proyecto</div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
        <table>
          <thead><tr><th>Codigo</th><th>Nombre</th><th>Inicio</th><th>Fin</th><th>Tareas</th><th>Progreso</th></tr></thead>
          <tbody>
            {sprints.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text2)', padding: 24 }}>
                No hay sprints. Importa un Excel de VINCULOsync para comenzar.
              </td></tr>
            ) : (
              sprints.map((s: any) => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/sprint/${s.id}`)}>
                  <td><span className="badge" style={{ backgroundColor: s.color }}>{s.codigo}</span></td>
                  <td>{s.nombre}</td>
                  <td>{s.fecha_inicio}</td>
                  <td>{s.fecha_fin}</td>
                  <td>{s.task_count || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ flex: 1, maxWidth: 100 }}>
                        <div className="progress-fill" style={{
                          width: `${s.progress || 0}%`,
                          background: s.progress > 50 ? 'var(--green)' : s.progress > 20 ? 'var(--amber)' : 'var(--accent)',
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text2)' }}>{s.progress || 0}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
