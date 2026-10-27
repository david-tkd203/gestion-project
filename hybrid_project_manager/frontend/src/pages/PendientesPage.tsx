import { useState, useEffect } from 'react';
import anime from 'animejs';
import { getPendientes, createPendiente, updatePendiente, deletePendiente } from '../api';
import {
  Calendar, Users, Building, MessageSquare, CheckCircle, AlertTriangle,
  Loader2, Plus, Edit3, Trash2, Clock, X, CheckSquare
} from '../icons';

const TIPOS = [
  { value: 'reunion', label: 'Reunión', color: '#8b5cf6' },
  { value: 'institucion', label: 'Gestión con Institución', color: '#3b82f6' },
  { value: 'persona', label: 'Persona / Stakeholder', color: '#f59e0b' },
  { value: 'compromiso', label: 'Compromiso / Acuerdo', color: '#10b981' },
  { value: 'proyecto', label: 'Hito de Proyecto', color: '#ec4899' },
];

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: '#f59e0b' },
  { value: 'en_gestion', label: 'En Gestión', color: '#3b82f6' },
  { value: 'completado', label: 'Completado', color: '#10b981' },
];

const PRIORIDADES = [
  { value: 'alta', label: 'Alta', color: '#ef4444' },
  { value: 'media', label: 'Media', color: '#f59e0b' },
  { value: 'baja', label: 'Baja', color: '#6b7280' },
];

export default function PendientesPage() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('reunion');
  const [institucion, setInstitucion] = useState('');
  const [personaContacto, setPersonaContacto] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [lugarOLink, setLugarOLink] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [estado, setEstado] = useState('pendiente');
  const [responsableNombre, setResponsableNombre] = useState('');
  const [temasTratados, setTemasTratados] = useState('');
  const [acuerdos, setAcuerdos] = useState<{ text: string; done: boolean; responsable?: string }[]>([]);
  const [newAcuerdoText, setNewAcuerdoText] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPendientes();
      setPendientes(data || []);
      setTimeout(() => {
        anime({ targets: '.pendiente-card', opacity: [0, 1], translateY: [12, 0], delay: anime.stagger(30), easing: 'easeOutQuad' });
      }, 50);
    } catch (err: any) {
      setError(err.message || 'Error al cargar reuniones y pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitulo('');
    setTipo('reunion');
    setInstitucion('');
    setPersonaContacto('');
    setFecha(new Date().toISOString().split('T')[0]);
    setHora('');
    setLugarOLink('');
    setPrioridad('media');
    setEstado('pendiente');
    setResponsableNombre('');
    setTemasTratados('');
    setAcuerdos([]);
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setTitulo(item.titulo || '');
    setTipo(item.tipo || 'reunion');
    setInstitucion(item.institucion || '');
    setPersonaContacto(item.persona_contacto || '');
    setFecha(item.fecha || '');
    setHora(item.hora || '');
    setLugarOLink(item.lugar_o_link || '');
    setPrioridad(item.prioridad || 'media');
    setEstado(item.estado || 'pendiente');
    setResponsableNombre(item.responsable_nombre || '');
    setTemasTratados(item.temas_tratados || '');
    setAcuerdos(item.acuerdos ? [...item.acuerdos] : []);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleAddAcuerdo = () => {
    if (!newAcuerdoText.trim()) return;
    setAcuerdos([...acuerdos, { text: newAcuerdoText.trim(), done: false }]);
    setNewAcuerdoText('');
  };

  const handleRemoveAcuerdo = (idx: number) => {
    setAcuerdos(acuerdos.filter((_, i) => i !== idx));
  };

  const handleToggleAcuerdoInCard = async (item: any, acuerdoIdx: number) => {
    const updatedAcuerdos = item.acuerdos.map((ac: any, i: number) =>
      i === acuerdoIdx ? { ...ac, done: !ac.done } : ac
    );
    // Optimistic
    setPendientes(prev =>
      prev.map(p => (p.id === item.id ? { ...p, acuerdos: updatedAcuerdos } : p))
    );
    try {
      await updatePendiente(item.id, { acuerdos: updatedAcuerdos });
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  const handleQuickStatusChange = async (item: any, newEstado: string) => {
    setPendientes(prev =>
      prev.map(p => (p.id === item.id ? { ...p, estado: newEstado } : p))
    );
    try {
      await updatePendiente(item.id, { estado: newEstado });
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este registro de pendiente/reunión?')) return;
    setPendientes(prev => prev.filter(p => p.id !== id));
    try {
      await deletePendiente(id);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
      loadData();
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setModalError('El título es requerido');
      return;
    }

    setSaving(true);
    setModalError('');

    const payload = {
      titulo: titulo.trim(),
      tipo,
      institucion: institucion.trim(),
      persona_contacto: personaContacto.trim(),
      fecha: fecha || null,
      hora: hora || null,
      lugar_o_link: lugarOLink.trim(),
      prioridad,
      estado,
      responsable_nombre: responsableNombre.trim(),
      temas_tratados: temasTratados.trim(),
      acuerdos,
    };

    try {
      if (editingItem?.id) {
        const updated = await updatePendiente(editingItem.id, payload);
        setPendientes(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createPendiente(payload);
        setPendientes(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Filtered list
  const filtered = pendientes.filter(p => {
    if (filterTipo && p.tipo !== filterTipo) return false;
    if (filterEstado && p.estado !== filterEstado) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTit = p.titulo?.toLowerCase().includes(q);
      const matchInst = p.institucion?.toLowerCase().includes(q);
      const matchPer = p.persona_contacto?.toLowerCase().includes(q);
      const matchTem = p.temas_tratados?.toLowerCase().includes(q);
      if (!matchTit && !matchInst && !matchPer && !matchTem) return false;
    }
    return true;
  });

  // Metrics
  const totalCount = pendientes.length;
  const reunionesInstitucionCount = pendientes.filter(p => p.tipo === 'institucion' || p.tipo === 'reunion').length;
  const activosCount = pendientes.filter(p => p.estado !== 'completado').length;
  const totalAcuerdos = pendientes.reduce((acc, p) => acc + (p.acuerdos?.length || 0), 0);
  const doneAcuerdos = pendientes.reduce(
    (acc, p) => acc + (p.acuerdos?.filter((a: any) => a.done).length || 0),
    0
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reuniones y Pendientes</h2>
          <p>Control de minutas, citas institucionales, personas de contacto y acuerdos de seguimiento</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus /> Nueva Reunión / Pendiente
        </button>
      </div>

      {/* Metrics Bento */}
      <div className="bento" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="metric-cell">
          <div className="stat-icon" style={{ color: 'var(--accent)' }}><Calendar /></div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{totalCount}</div>
          <div className="stat-label">Total Registrados</div>
        </div>
        <div className="metric-cell">
          <div className="stat-icon" style={{ color: 'var(--cyan)' }}><Building /></div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{reunionesInstitucionCount}</div>
          <div className="stat-label">Instituciones / Reuniones</div>
        </div>
        <div className="metric-cell">
          <div className="stat-icon" style={{ color: 'var(--amber)' }}><Clock /></div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{activosCount}</div>
          <div className="stat-label">Pendientes Activos</div>
        </div>
        <div className="metric-cell">
          <div className="stat-icon" style={{ color: 'var(--green)' }}><CheckSquare /></div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {totalAcuerdos > 0 ? `${doneAcuerdos}/${totalAcuerdos}` : '0'}
          </div>
          <div className="stat-label">Acuerdos Cumplidos</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por institución, persona, tema..."
          style={{ width: 260 }}
        />

        <div className="tabs" style={{ margin: 0 }}>
          <button className={`tab ${filterTipo === '' ? 'active' : ''}`} onClick={() => setFilterTipo('')}>
            Todos
          </button>
          {TIPOS.map(t => (
            <button
              key={t.value}
              className={`tab ${filterTipo === t.value ? 'active' : ''}`}
              onClick={() => setFilterTipo(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          style={{ width: 150, marginLeft: 'auto' }}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(es => (
            <option key={es.value} value={es.value}>{es.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading"><Loader2 className="spinner" /> Cargando pendientes y reuniones...</div>
      ) : error ? (
        <div className="bento-cell" style={{ textAlign: 'center', padding: 40, color: 'var(--red)' }}>
          <AlertTriangle /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-cell" style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <MessageSquare />
          <div style={{ marginTop: 12, fontSize: 15, fontWeight: 500 }}>No hay pendientes ni reuniones que coincidan</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Haz clic en <strong>"+ Nueva Reunión / Pendiente"</strong> para agendar una cita o registrar un acuerdo institucional.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filtered.map(item => {
            const tipoObj = TIPOS.find(t => t.value === item.tipo) || TIPOS[0];
            const estadoObj = ESTADOS.find(e => e.value === item.estado) || ESTADOS[0];
            const prioObj = PRIORIDADES.find(p => p.value === item.prioridad) || PRIORIDADES[1];
            const totalAc = item.acuerdos?.length || 0;
            const doneAc = item.acuerdos?.filter((a: any) => a.done).length || 0;

            return (
              <div
                key={item.id}
                className="bento-cell pendiente-card"
                style={{
                  borderLeft: `4px solid ${tipoObj.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  position: 'relative',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    className="badge"
                    style={{ backgroundColor: tipoObj.color, color: '#fff', fontSize: 10, fontWeight: 600 }}
                  >
                    {tipoObj.label}
                  </span>

                  <span
                    className="badge"
                    style={{
                      background: prioObj.color + '20',
                      color: prioObj.color,
                      border: `1px solid ${prioObj.color}40`,
                      fontSize: 10,
                    }}
                  >
                    Prioridad {prioObj.label}
                  </span>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      title="Editar"
                      style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4 }}
                    >
                      <Edit3 />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title="Eliminar"
                      style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  {item.titulo}
                </h4>

                {/* Institution & Contact person */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text2)' }}>
                  {item.institucion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building /> <strong>{item.institucion}</strong>
                    </div>
                  )}
                  {item.persona_contacto && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users /> {item.persona_contacto}
                    </div>
                  )}
                  {(item.fecha || item.hora) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock /> {item.fecha} {item.hora && `(${item.hora})`}
                    </div>
                  )}
                  {item.lugar_o_link && (
                    <div style={{ marginTop: 2 }}>
                      {item.lugar_o_link.startsWith('http') ? (
                        <a
                          href={item.lugar_o_link}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                        >
                          Enlace de reunión
                        </a>
                      ) : (
                        <span>Lugar: {item.lugar_o_link}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Minuta / Notes */}
                {item.temas_tratados && (
                  <div
                    style={{
                      background: 'var(--bg)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      color: 'var(--text)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {item.temas_tratados}
                  </div>
                )}

                {/* Acuerdos checklist */}
                {totalAc > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
                      Acuerdos / Próximos pasos ({doneAc}/{totalAc}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {item.acuerdos.map((ac: any, i: number) => (
                        <label
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={ac.done}
                            onChange={() => handleToggleAcuerdoInCard(item, i)}
                          />
                          <span
                            style={{
                              textDecoration: ac.done ? 'line-through' : 'none',
                              color: ac.done ? 'var(--text3)' : 'inherit',
                            }}
                          >
                            {ac.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer status switcher */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: estadoObj.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: estadoObj.color }}>
                      {estadoObj.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    {ESTADOS.filter(e => e.value !== item.estado).map(e => (
                      <button
                        key={e.value}
                        type="button"
                        onClick={() => handleQuickStatusChange(item, e.value)}
                        style={{
                          background: 'none',
                          border: `1px solid ${e.color}30`,
                          color: e.color,
                          borderRadius: 4,
                          fontSize: 9,
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        Pasar a {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>
                {editingItem ? 'Editar Reunión / Pendiente' : 'Nueva Reunión o Pendiente'}
              </h3>
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)} style={{ padding: 4 }}>
                <X />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--red)', padding: '8px 12px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertTriangle /> {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitModal}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Título *</label>
                <input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="ej: Reunión con DAE para validación de protocolo"
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: '100%' }}>
                    {TIPOS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Prioridad</label>
                  <select value={prioridad} onChange={e => setPrioridad(e.target.value)} style={{ width: '100%' }}>
                    {PRIORIDADES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Institución / Entidad</label>
                  <input
                    value={institucion}
                    onChange={e => setInstitucion(e.target.value)}
                    placeholder="ej: DAE, VRID, Min. Culturas"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Persona de Contacto</label>
                  <input
                    value={personaContacto}
                    onChange={e => setPersonaContacto(e.target.value)}
                    placeholder="ej: Lic. María Silva (Directora)"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Hora</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={e => setHora(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Lugar o Enlace de Reunión (Meet / Zoom / Sala)</label>
                <input
                  value={lugarOLink}
                  onChange={e => setLugarOLink(e.target.value)}
                  placeholder="https://meet.google.com/... o Sala 302"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Estado</label>
                  <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%' }}>
                    {ESTADOS.map(es => (
                      <option key={es.value} value={es.value}>{es.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Responsable de Seguimiento</label>
                  <input
                    value={responsableNombre}
                    onChange={e => setResponsableNombre(e.target.value)}
                    placeholder="ej: Benjamín Durán"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Minuta / Temas Tratados</label>
                <textarea
                  rows={3}
                  value={temasTratados}
                  onChange={e => setTemasTratados(e.target.value)}
                  placeholder="Resumen de la reunión, puntos clave discutidos y contexto..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Acuerdos / Checkpoints */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Acuerdos y Próximos Pasos ({acuerdos.filter(a => a.done).length}/{acuerdos.length})
                </label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    value={newAcuerdoText}
                    onChange={e => setNewAcuerdoText(e.target.value)}
                    placeholder="Nuevo compromiso / acuerdo..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAcuerdo();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn-ghost" onClick={handleAddAcuerdo}>
                    <Plus /> Agregar
                  </button>
                </div>

                {acuerdos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                    {acuerdos.map((ac, idx) => (
                      <div
                        key={idx}
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
                          checked={ac.done}
                          onChange={() =>
                            setAcuerdos(
                              acuerdos.map((a, i) => (i === idx ? { ...a, done: !a.done } : a))
                            )
                          }
                        />
                        <span style={{ flex: 1, textDecoration: ac.done ? 'line-through' : 'none', color: ac.done ? 'var(--text3)' : 'inherit' }}>
                          {ac.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAcuerdo(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <><Loader2 className="spinner" /> Guardando...</> : <><CheckCircle /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
