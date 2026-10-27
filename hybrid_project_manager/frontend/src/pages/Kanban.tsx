import { useEffect, useState } from 'react';
import anime from 'animejs';
import { getProyectos, getSprints, getTareas, updateTareaStatus, deleteTarea } from '../api';
import { KanbanIcon, Lock, AlertTriangle, Loader2, Users, Plus, Edit3, Trash2, Calendar } from '../icons';
import TaskModal from '../components/TaskModal';
import SprintModal from '../components/SprintModal';
import TaskDetailModal from '../components/TaskDetailModal';

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
  const [projectId, setProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drag and drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const projList = await getProyectos();
      const list = Array.isArray(projList) ? projList : [];
      const firstProj = list.find((p: any) => p.nombre?.toLowerCase().includes('vinculo')) || list[0];
      if (firstProj) setProjectId(firstProj.id);

      const [s, t] = await Promise.all([
        firstProj ? getSprints(firstProj.id) : getSprints(),
        firstProj ? getTareas(`?proyecto=${firstProj.id}`) : getTareas(),
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
      anime({ targets: '.bento-cell', opacity: [0, 1], translateY: [10, 0], delay: anime.stagger(25), easing: 'easeOutQuad' });
    }
    return () => anime.remove('.bento-cell');
  }, [loading, selectedSprint, tareas.length]);

  const moveTask = async (id: string, toStatus: string) => {
    // Optimistic update
    setTareas(prev => prev.map((t: any) => t.id === id ? { ...t, status: toStatus } : t));
    try {
      await updateTareaStatus(id, toStatus);
    } catch (e: any) {
      const msg = e.message || 'Error al cambiar estado';
      setError(msg);
      load();
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) setDragOverCol(colKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, toStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);
    if (!taskId) return;

    const task = tareas.find(t => t.id === taskId);
    if (task && task.status !== toStatus) {
      await moveTask(taskId, toStatus);
    }
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverCol(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarea?')) return;
    try {
      await deleteTarea(taskId);
      setTareas(prev => prev.filter(t => t.id !== taskId));
      if (detailTaskId === taskId) setDetailTaskId(null);
    } catch (e: any) {
      alert(e.message || 'Error al eliminar tarea');
    }
  };

  const handleTaskSaved = (saved: any) => {
    setTareas(prev => {
      const exists = prev.some(t => t.id === saved.id);
      if (exists) {
        return prev.map(t => (t.id === saved.id ? { ...t, ...saved } : t));
      }
      return [saved, ...prev];
    });
  };

  const handleSprintSaved = (saved: any) => {
    setSprints(prev => {
      const exists = prev.some(s => s.id === saved.id);
      if (exists) return prev.map(s => (s.id === saved.id ? { ...s, ...saved } : s));
      return [...prev, saved];
    });
    setSelectedSprint(saved.id);
  };

  const sprintTasks = selectedSprint ? tareas.filter((t: any) => t.sprint === selectedSprint) : tareas;

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando tablero Kanban...</div>;

  if (error) {
    return (
      <div>
        <div className="page-header"><div><h2>Kanban</h2><p>Tablero dinámico de tareas</p></div></div>
        <div className="bento-cell" style={{ textAlign: 'center', padding: 40, color: 'var(--red)' }}>
          <AlertTriangle /> <div style={{ marginTop: 8 }}>{error}</div>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={load}>Reintentar</button>
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
        <div>
          <h2>Kanban Dinámico</h2>
          <p>{tareas.length} tareas totales · {sprintTasks.length} en vista actual (arrastra y suelta tarjetas)</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedSprint}
            onChange={e => setSelectedSprint(e.target.value)}
            style={{ width: 220 }}
          >
            <option value="">Todos los sprints</option>
            {sprints.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </option>
            ))}
          </select>

          <button
            className="btn-ghost"
            onClick={() => setIsSprintModalOpen(true)}
            title="Crear un nuevo sprint"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Calendar /> + Sprint
          </button>

          <button
            className="btn-primary"
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            title="Crear una nueva tarea"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus /> Nueva Tarea
          </button>
        </div>
      </div>

      <div className="kanban-board">
        {grouped.map(col => {
          const isOver = dragOverCol === col.key;
          return (
            <div
              key={col.key}
              className={`kanban-col ${isOver ? 'drag-over' : ''}`}
              onDragOver={e => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.key)}
              style={{
                transition: 'border-color 0.2s, background 0.2s',
                border: isOver ? `2px dashed ${col.color}` : '1px solid var(--border)',
                background: isOver ? `${col.color}0a` : undefined,
                borderRadius: 'var(--radius)',
              }}
            >
              <div className="kanban-col-header" style={{ borderTop: `3px solid ${col.color}` }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: col.color, display: 'inline-block' }} />
                {col.label}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>
                  {col.tasks.length}
                </span>
              </div>
              <div className="kanban-col-body" style={{ minHeight: 400 }}>
                {col.tasks.map((task: any) => {
                  const isDragging = draggingTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`bento-cell${task.is_blocked ? ' blocked' : ''}`}
                      style={{
                        cursor: 'grab',
                        opacity: isDragging ? 0.4 : 1,
                        transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
                        userSelect: 'none',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <span className="badge" style={{ backgroundColor: task.area_color }}>{task.codigo}</span>
                        {task.is_blocked && <Lock />}
                        <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                          {task.sprint_codigo}
                        </span>
                        <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setEditingTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            title="Editar Tarea"
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}
                          >
                            <Edit3 />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            title="Eliminar Tarea"
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </div>

                      <div
                        className="card-title"
                        onClick={() => setDetailTaskId(task.id)}
                        style={{ fontWeight: 500, cursor: 'pointer' }}
                        title="Ver detalles completos"
                      >
                        {task.titulo}
                      </div>

                      <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Users /> {task.responsable_nombre || 'Sin asignar'}
                      </div>

                      {task.is_blocked && (
                        <div className="card-blocked"><AlertTriangle /> {task.blocked_reason}</div>
                      )}

                      {/* Fallback instant move buttons */}
                      <div className="move-btns" style={{ display: 'flex', gap: 3, marginTop: 8, flexWrap: 'wrap' }}>
                        {STATUSES.filter(s => s.key !== task.status).map(s => (
                          <button
                            key={s.key}
                            onClick={() => moveTask(task.id, s.key)}
                            style={{
                              background: s.color + '15',
                              color: s.color,
                              fontSize: 9,
                              padding: '2px 7px',
                              borderRadius: 4,
                              border: `1px solid ${s.color}30`,
                              cursor: 'pointer',
                            }}
                            title={`Mover a ${s.label}`}
                          >
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {col.tasks.length === 0 && (
                  <div className="empty-col" style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 8, marginTop: 8 }}>
                    Arrastra una tarjeta aquí
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSaved={handleTaskSaved}
        task={editingTask}
        sprints={sprints}
        defaultSprintId={selectedSprint || sprints[0]?.id}
        projectId={projectId}
      />

      {/* Sprint Create Modal */}
      <SprintModal
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onSaved={handleSprintSaved}
        projectId={projectId}
        nextOrden={sprints.length}
      />

      {/* Task Detail Modal */}
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onEdit={task => {
            setDetailTaskId(null);
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDelete={id => handleDeleteTask(id)}
        />
      )}
    </div>
  );
}
