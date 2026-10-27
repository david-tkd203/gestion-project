import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Loader2 } from '../icons';
import { createSprint, updateSprint } from '../api';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedSprint: any) => void;
  sprint?: any | null; // if provided, edit mode
  projectId: string;
  nextOrden?: number;
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899',
  '#10b981', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6', '#f97316'
];

export default function SprintModal({
  isOpen,
  onClose,
  onSaved,
  sprint,
  projectId,
  nextOrden = 8,
}: SprintModalProps) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [meetLink, setMeetLink] = useState('');
  const [orden, setOrden] = useState(nextOrden);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sprint) {
      setCodigo(sprint.codigo || '');
      setNombre(sprint.nombre || '');
      setDescripcion(sprint.descripcion || '');
      setFechaInicio(sprint.fecha_inicio || '');
      setFechaFin(sprint.fecha_fin || '');
      setColor(sprint.color || '#3b82f6');
      setMeetLink(sprint.meet_link || '');
      setOrden(sprint.orden ?? nextOrden);
    } else {
      setCodigo(`SP${nextOrden}`);
      setNombre(`Sprint ${nextOrden}`);
      setDescripcion('');
      setFechaInicio('');
      setFechaFin('');
      setColor(PRESET_COLORS[nextOrden % PRESET_COLORS.length]);
      setMeetLink('');
      setOrden(nextOrden);
    }
    setError('');
  }, [sprint, isOpen, nextOrden]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) {
      setError('Código y Nombre del sprint son obligatorios');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError('Las fechas de inicio y fin son obligatorias');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      proyecto: projectId,
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      color,
      meet_link: meetLink.trim(),
      orden: Number(orden) || 0,
    };

    try {
      let saved;
      if (sprint?.id) {
        saved = await updateSprint(sprint.id, payload);
      } else {
        saved = await createSprint(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el sprint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 540 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{sprint ? 'Editar Sprint' : 'Nuevo Sprint'}</h3>
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
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Código *</label>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="ej: SP8"
                required
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Nombre *</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="ej: Sprint 8"
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fecha Inicio *</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fecha Fin *</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Color Identificador</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: c,
                    cursor: 'pointer',
                    boxShadow: color === c ? '0 0 0 3px var(--bg), 0 0 0 5px ' + c : 'none',
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{ width: 34, height: 28, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Enlace de Reunión (Google Meet / Zoom)</label>
            <input
              type="url"
              value={meetLink}
              onChange={e => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Descripción / Objetivos del Sprint</label>
            <textarea
              rows={2}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Objetivos estratégicos del sprint..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 className="spinner" /> Guardando...</> : <><CheckCircle /> {sprint ? 'Guardar Cambios' : 'Crear Sprint'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
