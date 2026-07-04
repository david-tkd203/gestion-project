import { useEffect, useState, useRef } from 'react';
import anime from 'animejs';
import { getTareaDetail, unblockTarea, updateCriterios } from '../api';
import { X, Lock, AlertTriangle, Users, FileText } from '../icons';
import { useMe } from '../App';

interface TaskDetailModalProps {
  taskId: string | null;
  onClose: () => void;
}

export default function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const me = useMe();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    getTareaDetail(taskId)
      .then(setTask)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    if (!taskId || loading) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = modalRef.current?.querySelector('.modal');
    const overlay = modalRef.current;
    if (el) anime({ targets: el, opacity: [0, 1], scale: [0.95, 1], duration: 300, easing: 'easeOutQuad' });
    if (overlay) anime({ targets: overlay, opacity: [0, 1], duration: 150 });
    return () => { anime.remove(el); anime.remove(overlay); };
  }, [taskId, loading]);

  if (!taskId) return null;

  const isOwner = me?.is_admin || task?.responsable === me?.id;
  const statusColors: Record<string, string> = {
    backlog: 'var(--text3)', desarrollo: 'var(--accent)', revision_legal: 'var(--amber)', qa: 'var(--purple)', done: 'var(--green)',
  };

  const handleToggleCriterion = async (index: number, done: boolean) => {
    if (!task || !isOwner) return;
    setSaving(true);
    const updated = task.criterios_aceptacion.map((c: any, i: number) =>
      i === index ? { ...c, done } : c
    );
    try {
      await updateCriterios(task.id, updated);
      setTask({ ...task, criterios_aceptacion: updated });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleUnblock = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await unblockTarea(task.id);
      setTask({ ...task, is_blocked: false, blocked_reason: '' });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const doneCriteria = task?.criterios_aceptacion?.filter((c: any) => c.done).length || 0;
  const totalCriteria = task?.criterios_aceptacion?.length || 0;

  return (
    <div className="modal-overlay" ref={modalRef} onClick={onClose} style={{ opacity: 0 }}>
      <div className="modal task-modal" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4 }}>
          <X />
        </button>

        {loading ? (
          <div className="loading">Cargando tarea...</div>
        ) : task ? (
          <>
            {/* Header */}
            <div className="task-modal-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="badge" style={{ backgroundColor: task.area_color || 'var(--accent)' }}>{task.codigo}</span>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>{task.area_nombre || ''}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{task.titulo}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors[task.status] || 'var(--text3)', display: 'inline-block' }} />
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{task.status?.replace('_', ' ')}</span>
                {task.sprint_codigo && (
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>· {task.sprint_codigo}</span>
                )}
              </div>
            </div>

            {/* Responsible */}
            <div className="task-modal-section">
              <h4>Responsable</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Users /> {task.responsable_nombre || 'Sin asignar'}
              </div>
            </div>

            {/* Specs */}
            {task.especificaciones_tecnicas && (
              <div className="task-modal-section">
                <h4><FileText /> Especificaciones Técnicas</h4>
                <pre>{task.especificaciones_tecnicas}</pre>
              </div>
            )}

            {/* Acceptance Criteria */}
            {task.criterios_aceptacion?.length > 0 && (
              <div className="task-modal-section">
                <h4>Criterios de Aceptación ({doneCriteria}/{totalCriteria})</h4>
                <div className="progress-bar" style={{ marginBottom: 8, height: 4 }}>
                  <div className="progress-fill" style={{ width: `${totalCriteria > 0 ? (doneCriteria / totalCriteria) * 100 : 0}%`, background: 'var(--accent)' }} />
                </div>
                {task.criterios_aceptacion.map((c: any, i: number) => (
                  <label key={i} className={`task-modal-criterion ${c.done ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={c.done}
                      disabled={!isOwner || saving}
                      onChange={() => handleToggleCriterion(i, !c.done)}
                    />
                    {c.text}
                  </label>
                ))}
              </div>
            )}

            {/* Dependencies */}
            {(task.dependencias?.length > 0 || task.blocked_by?.length > 0) && (
              <div className="task-modal-section">
                <h4>Dependencias</h4>
                {task.dependencias?.length > 0 && (
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text2)' }}>Bloqueado por: </span>
                    {task.dependencias.map((d: any) => (
                      <span key={d.id} className="badge" style={{ backgroundColor: 'var(--accent)', margin: '0 2px' }}>{d.codigo}</span>
                    ))}
                  </div>
                )}
                {task.blocked_by?.length > 0 && (
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>Bloquea a: </span>
                    {task.blocked_by.map((b: any) => (
                      <span key={b.id} className="badge" style={{ backgroundColor: 'var(--amber)', margin: '0 2px' }}>{b.codigo}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Blocked Banner */}
            {task.is_blocked && (
              <div className="blocked-banner">
                <div style={{ flexShrink: 0, width: 18, height: 18, color: 'var(--red)' }}><AlertTriangle /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Tarea Bloqueada</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{task.blocked_reason}</div>
                </div>
                {me?.is_admin && (
                  <button className="btn-primary" onClick={handleUnblock} disabled={saving}
                    style={{ background: 'var(--green)', borderColor: 'var(--green)', fontSize: 12, padding: '6px 12px' }}>
                    Desbloquear
                  </button>
                )}
              </div>
            )}

            {/* Admin notice for non-admin */}
            {!me?.is_admin && (
              <div className="admin-notice">
                <span style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 6, display: 'inline-block' }}><Lock /></span>
                Solo el Director o el Arquitecto pueden modificar esta tarea
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Tarea no encontrada</div>
        )}
      </div>
    </div>
  );
}
