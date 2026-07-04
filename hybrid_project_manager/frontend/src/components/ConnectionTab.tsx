import { useEffect, useState } from 'react';
import {
  getGithubConnection,
  createGithubConnection,
  deleteGithubConnection,
  triggerSync,
} from '../api';
import { Loader2 } from '../icons';

interface Props {
  projectId: string;
  connectionId: string | null;
  onConnected: (id: string) => void;
  onDisconnected: () => void;
}

export default function ConnectionTab({ projectId, connectionId, onConnected, onDisconnected }: Props) {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGithubConnection(projectId).then(c => {
      setConnection(c);
      if (c) onConnected(c.id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const c = await createGithubConnection({
        proyecto: projectId,
        repo_owner: owner,
        repo_name: repo,
        access_token: token,
      });
      setConnection(c);
      onConnected(c.id);
      setToken('');
    } catch (err: any) {
      setError(err.message || 'Error al conectar');
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('¿Desconectar el repo? Se eliminarán todos los datos sincronizados.')) return;
    await deleteGithubConnection(connection.id);
    setConnection(null);
    onDisconnected();
  };

  const handleSync = async () => {
    if (!connection) return;
    await triggerSync(connection.id);
  };

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando...</div>;

  if (connection) {
    return (
      <div className="gh-connection-status">
        <div className="gh-connected-card">
          <div className="gh-connected-header">
            <Link2 />
            <div>
              <strong>{connection.repo_owner}/{connection.repo_name}</strong>
              <small>Conectado el {new Date(connection.created_at).toLocaleDateString('es-CL')}</small>
            </div>
          </div>
          {connection.last_synced_at && (
            <p className="gh-sync-date">
              Última sincronización: {new Date(connection.last_synced_at).toLocaleString('es-CL')}
            </p>
          )}
          <div className="gh-connected-actions">
            <button className="btn" onClick={handleSync}>Sincronizar ahora</button>
            <button className="btn btn-ghost btn-danger" onClick={handleDisconnect}>
              <Trash2 /> Desconectar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gh-connection-form">
      <p className="gh-form-desc">
        Conectá un repositorio GitHub para ver actividad de ramas, commits y alertas de seguridad.
        El token necesita scopes: <code>repo</code> y <code>security_events</code>.
      </p>
      <form onSubmit={handleConnect}>
        <div className="form-row">
          <div className="form-group">
            <label>Owner</label>
            <input
              type="text"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="ej: david-tkd203"
              required
            />
          </div>
          <div className="form-group">
            <label>Repositorio</label>
            <input
              type="text"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="ej: investigacion-django_v2"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Personal Access Token</label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="ghp_..."
            required
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn" disabled={saving}>
          {saving ? <><Loader2 className="spinner" /> Conectando...</> : 'Conectar repositorio'}
        </button>
      </form>
    </div>
  );
}

// Inline icons
function Trash2() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function Link2() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
