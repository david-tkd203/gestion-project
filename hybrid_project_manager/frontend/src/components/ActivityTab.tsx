import { useEffect, useState } from 'react';
import { getCommits } from '../api';
import { Loader2 } from '../icons';

interface Props {
  connectionId: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('es-CL');
}

export default function ActivityTab({ connectionId }: Props) {
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState('');

  useEffect(() => {
    const params = areaFilter ? `&area=${areaFilter}` : '';
    getCommits(connectionId, params).then(c => {
      setCommits(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [connectionId, areaFilter]);

  // Get unique areas for filter
  const areaOptions = [...new Map(commits.filter(c => c.area_codigo).map(c => [c.area_codigo, { codigo: c.area_codigo, color: c.area_color }])).values()];

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando actividad...</div>;

  return (
    <div className="gh-activity">
      {/* Filters */}
      <div className="gh-filters">
        <select
          value={areaFilter}
          onChange={e => { setAreaFilter(e.target.value); setLoading(true); }}
          className="gh-filter-select"
        >
          <option value="">Todas las áreas</option>
          {areaOptions.map((a: any) => (
            <option key={a.codigo} value={a.codigo}>{a.codigo}</option>
          ))}
        </select>
        <span className="gh-filter-count">{commits.length} commits</span>
      </div>

      {commits.length === 0 ? (
        <p className="gh-empty">No hay commits. Sincronizá el repositorio.</p>
      ) : (
        <div className="gh-timeline">
          {commits.map((c: any) => (
            <div key={c.id} className="gh-commit-card" style={{ borderLeftColor: c.area_color || 'var(--border)' }}>
              <div className="gh-commit-header">
                {c.author_avatar && (
                  <img src={c.author_avatar} alt="" className="gh-avatar" width={20} height={20} />
                )}
                <span className="gh-author">{c.author_login}</span>
                <span className="gh-time">{timeAgo(c.committed_at)}</span>
                {c.is_fix && <span className="gh-fix-badge" title="Fix detectado">🔧 fix</span>}
              </div>
              <p className="gh-commit-msg">{c.message.split('\n')[0].slice(0, 120)}</p>
              <div className="gh-commit-meta">
                <span className="gh-mono">{c.sha.slice(0, 7)}</span>
                <span className="gh-branch-tag">{c.branch_name}</span>
                {c.area_codigo && (
                  <span className="gh-area-tag" style={{ color: c.area_color }}>{c.area_codigo}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
