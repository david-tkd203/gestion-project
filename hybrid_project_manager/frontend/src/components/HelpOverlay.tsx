import { useState, useRef, useEffect } from 'react';

const platformGuide = {
  dashboard: {
    title: 'Panel Principal',
    desc: 'Vista general del proyecto con metricas clave, estado de tareas y actividad reciente.',
    steps: [
      'Resumen de tareas por estado (Backlog, Desarrollo, QA, Done)',
      'Grafico de progreso del sprint actual',
      'Alertas de seguridad de GitHub sincronizadas',
      'Acceso rapido a las secciones principales'
    ]
  },
  kanban: {
    title: 'Tablero Kanban',
    desc: 'Gestion visual de tareas con arrastrar y soltar entre columnas de estado.',
    steps: [
      'Arrastra las tarjetas entre columnas para cambiar su estado',
      'Clic en una tarjeta para ver/editar detalles',
      'Las dependencias bloquean automaticamente una tarea',
      'Filtra por area, responsable o sprint'
    ]
  },
  flow: {
    title: 'Cronograma / Sprint Flow',
    desc: 'Planificacion temporal de sprints con diagrama de flujo y fechas.',
    steps: [
      'Visualiza la duracion de cada sprint en el calendario',
      'Las tareas se ordenan por dependencias calculadas',
      'Clic para expandir y ver tareas individuales',
      'Los colores corresponden al area responsable'
    ]
  }
};

type Platform = keyof typeof platformGuide;

const icons: Record<Platform, string> = {
  dashboard: 'M3 9h18M3 15h18M9 3v18M15 3v18 M3 3h18v18H3z',
  kanban: 'M5 5h4v14H5zM10 5h4v10h-4zM15 5h4v6h-4z',
  flow: 'M8 3v18M16 3v18M3 12h18',
};

export default function HelpOverlay({ currentPath }: { currentPath: string }) {
  const [active, setActive] = useState<Platform | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentPlatform = currentPath === '/' ? 'dashboard'
    : currentPath === '/kanban' ? 'kanban'
    : currentPath === '/flow' ? 'flow' : null;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false); setActive(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const guide = active ? platformGuide[active] : null;

  const btnStyle: React.CSSProperties = {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
    width: '48px', height: '48px', borderRadius: '50%',
    background: '#7c3aed', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed', bottom: '84px', right: '24px', zIndex: 1000,
    width: '360px', maxHeight: '70vh', overflowY: 'auto',
    background: '#111', borderRadius: '12px', border: '1px solid #222',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)', padding: '24px',
  };

  const cardStyle = (isCurrent: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
    background: '#1a1a1a', borderRadius: '8px',
    border: `1px solid ${isCurrent ? '#7c3aed' : '#222'}`,
    cursor: 'pointer', transition: 'border-color 0.2s',
  });

  return (
    <>
      <button onClick={() => setShowPanel(!showPanel)} style={btnStyle}
        title="Instrucciones">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>

      {showPanel && (
        <div ref={panelRef} style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ color: '#7c3aed', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Instrucciones</span>
            <button onClick={() => { setShowPanel(false); setActive(null); }}
              style={{ background: 'none', border: 'none', color: '#525252', cursor: 'pointer', padding: '4px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {!active ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(Object.keys(platformGuide) as Platform[]).map(key => {
                const p = platformGuide[key];
                return (
                  <div key={key} onClick={() => setActive(key)}
                    style={cardStyle(key === currentPlatform)}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
                        <path d={icons[key]}/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>{p.title}</div>
                      <div style={{ color: '#525252', fontSize: '12px' }}>{p.desc.slice(0, 60)}...</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <button onClick={() => setActive(null)}
                style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '13px', padding: '0 0 16px 0' }}>
                ← Volver
              </button>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{guide!.title}</div>
              <div style={{ color: '#a0a0a0', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{guide!.desc}</div>
              <div style={{ color: '#7c3aed', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Pasos</div>
              <ol style={{ margin: 0, padding: '0 0 0 20px', fontSize: '13px', lineHeight: '1.8' }}>
                {guide!.steps.map((s, i) => <li key={i} style={{ color: '#cbd5e1' }}>{s}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </>
  );
}
