import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProyectos } from '../api';
import ConnectionTab from '../components/ConnectionTab';
import BranchesTab from '../components/BranchesTab';
import ActivityTab from '../components/ActivityTab';
import AlertsTab from '../components/AlertsTab';
import { Loader2 } from '../icons';

type Tab = 'connection' | 'branches' | 'activity' | 'alerts';

interface Props {
  onLoaded?: (id: string) => void;
}

export default function GitHubPage({ onLoaded }: Props) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<Tab>('connection');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProyectos().then((p: any[]) => {
      if (p?.[0]) {
        setProjectId(p[0].id);
        onLoaded?.(p[0].id);
      }
      setLoading(false);
    });
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'connection', label: 'Conexión' },
    { key: 'branches', label: 'Ramas' },
    { key: 'activity', label: 'Actividad' },
    { key: 'alerts', label: 'Alertas' },
  ];

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando...</div>;
  if (!projectId) return <div className="loading"><p>No hay proyectos. Creá uno primero.</p></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>GitHub</h2>
          <p>Integración con repositorio</p>
        </div>
        {connectionId && (
          <div className="gh-sync-info">
            {syncing ? (
              <span className="gh-syncing"><Loader2 className="spinner" /> Sincronizando...</span>
            ) : (
              <span className="gh-last-sync">
                {lastSync ? `Último sync: ${lastSync}` : 'Sin sincronizar'}
              </span>
            )}
          </div>
        )}
      </div>

      {connectionId && (
        <nav className="gh-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`gh-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      <div className="gh-content">
        {tab === 'connection' && (
          <ConnectionTab
            projectId={projectId}
            onConnected={(id) => setConnectionId(id)}
            onDisconnected={() => setConnectionId(null)}
            connectionId={connectionId}
          />
        )}
        {connectionId && tab === 'branches' && <BranchesTab connectionId={connectionId} />}
        {connectionId && tab === 'activity' && <ActivityTab connectionId={connectionId} />}
        {connectionId && tab === 'alerts' && <AlertsTab connectionId={connectionId} />}
      </div>
    </div>
  );
}

// Inline refresh icon
function RefreshCw() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
