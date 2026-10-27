import { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle, AlertTriangle, Loader2 } from '../icons';
import { createTarea, updateTarea, getAreas } from '../api';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedTask: any) => void;
  task?: any | null; // if provided, editing mode
  sprints: any[];
  defaultSprintId?: string;
  projectId?: string;
}

const TIPOS = [
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'fullstack', label: 'Fullstack' },
  { value: 'devops', label: 'DevOps / Arquitectura' },
  { value: 'gestion', label: 'Gestión Cultural' },
  { value: 'diseno', label: 'Diseño UX/UI' },
  { value: 'otros', label: 'Otros' },
];

const COMPLEJIDADES = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'extrema', label: 'Extrema' },
];

const STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'revision_legal', label: 'Revisión Legal' },
  { value: 'qa', label: 'QA' },
  { value: 'done', label: 'Done' },
];

export default function TaskModal({
  isOpen,
  onClose,
  onSaved,
  task,
  sprints,
  defaultSprintId,
  projectId,
}: TaskModalProps) {
  const [areas, setAreas] = useState<any[]>([]);
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [areaCodigo, setAreaCodigo] = useState('');
  const [status, setStatus] = useState('backlog');
  const [responsable, setResponsable] = useState('');
  const [tipo, setTipo] = useState('fullstack');
  const [complejidad, setComplejidad] = useState('media');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [especificaciones, setEspecificaciones] = useState('');
  const [criterios, setCriterios] = useState<{ text: string; done: boolean }[]>([]);
  const [newCriterioText, setNewCriterioText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAreas().then(setAreas).catch(console.error);
  }, []);

  useEffect(() => {
    if (task) {
      setCodigo(task.codigo || '');
      setTitulo(task.titulo || '');
      setSprintId(task.sprint || defaultSprintId || (sprints[0]?.id ?? ''));
      setAreaCodigo(task.area?.codigo || task.area || '');
      setStatus(task.status || 'backlog');
      setResponsable(task.responsable_nombre || '');
      setTipo(task.tipo_tarea || 'fullstack');
      setComplejidad(task.complejidad || 'media');
      setFechaInicio(task.fecha_inicio_estimada || '');
      setFechaFin(task.fecha_fin_estimada || '');
      setEspecificaciones(task.especificaciones_tecnicas || '');
      setCriterios(task.criterios_aceptacion ? [...task.criterios_aceptacion] : []);
    } else {
      setCodigo('');
      setTitulo('');
      setSprintId(defaultSprintId || (sprints[0]?.id ?? ''));
      setAreaCodigo(areas[0]?.codigo || 'FULL');
      setStatus('backlog');
      setResponsable('');
      setTipo('fullstack');
      setComplejidad('media');
      setFechaInicio('');
      setFechaFin('');
      setEspecificaciones('');
      setCriterios([]);
    }
    setError('');
  }, [task, isOpen, defaultSprintId, sprints, areas]);

  if (!isOpen) return null;

  const handleAddCriterio = () => {
    if (!newCriterioText.trim()) return;
    setCriterios([...criterios, { text: newCriterioText.trim(), done: false }]);
    setNewCriterioText('');
  };

  const handleRemoveCriterio = (idx: number) => {
    setCriterios(criterios.filter((_, i) => i !== idx));
  };

  const handleToggleCriterio = (idx: number) => {
    setCriterios(
      criterios.map((c, i) => (i === idx ? { ...c, done: !c.done } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setError('El título de la tarea es requerido');
      return;
    }
    if (!sprintId) {
      setError('Debes seleccionar un Sprint');
      return;
    }

    setSaving(true);
    setError('');

    // Auto-generate code if empty
    let finalCodigo = codigo.trim();
    if (!finalCodigo) {
      const sp = sprints.find(s => s.id === sprintId);
      const spCode = sp ? sp.codigo : 'SP';
      const rand = Math.floor(100 + Math.random() * 900);
      finalCodigo = `${spCode}-${areaCodigo || 'TASK'}-${rand}`;
    }

    const payload: any = {
      codigo: finalCodigo,
      titulo: titulo.trim(),
      sprint: sprintId,
      area: areaCodigo || (areas[0]?.codigo ?? 'FULL'),
      status,
      responsable_nombre: responsable.trim(),
      tipo_tarea: tipo,
      complejidad,
      fecha_inicio_estimada: fechaInicio || null,
      fecha_fin_estimada: fechaFin || null,
      especificaciones_tecnicas: especificaciones.trim(),
      criterios_aceptacion: criterios,
    };

    if (projectId) {
      payload.proyecto = projectId;
    } else {
      const sp = sprints.find(s => s.id === sprintId);
      if (sp?.proyecto) payload.proyecto = sp.proyecto;
    }

    try {
      let saved;
      if (task?.id) {
        saved = await updateTarea(task.id, payload);
      } else {
        saved = await createTarea(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{task ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 4 }}>
            <X />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--red)', padding: '8px 12px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
            <AlertTriangle /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Código</label>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="ej: SP6-FULL-001"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Título *</label>
              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Descripción concisa de la tarea..."
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Sprint *</label>
              <select value={sprintId} onChange={e => setSprintId(e.target.value)} style={{ width: '100%' }}>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.codigo} — {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Área</label>
              <select value={areaCodigo} onChange={e => setAreaCodigo(e.target.value)} style={{ width: '100%' }}>
                {areas.map(a => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.codigo} — {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%' }}>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Responsable</label>
              <input
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                placeholder="Nombre responsable"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: '100%' }}>
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Complejidad</label>
              <select value={complejidad} onChange={e => setComplejidad(e.target.value)} style={{ width: '100%' }}>
                {COMPLEJIDADES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
              Criterios de Aceptación ({criterios.filter(c => c.done).length}/{criterios.length} completados)
            </label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                value={newCriterioText}
                onChange={e => setNewCriterioText(e.target.value)}
                placeholder="Nuevo criterio de aceptación..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCriterio();
                  }
                }}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-ghost" onClick={handleAddCriterio}>
                <Plus /> Agregar
              </button>
            </div>
            {criterios.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {criterios.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--bg)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={c.done}
                      onChange={() => handleToggleCriterio(i)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--text3)' : 'inherit' }}>
                      {c.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterio(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Especificaciones Técnicas</label>
            <textarea
              rows={2}
              value={especificaciones}
              onChange={e => setEspecificaciones(e.target.value)}
              placeholder="Detalles de arquitectura, endpoints o librerías..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 className="spinner" /> Guardando...</> : <><CheckCircle /> {task ? 'Guardar Cambios' : 'Crear Tarea'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
