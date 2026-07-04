import { useEffect, useState } from 'react';
import { getAlerts } from '../api';
import { Loader2, AlertTriangle, Shield } from '../icons';

interface Props {
  connectionId: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#cf222e',
  high: '#d97706',
  medium: '#d4a72c',
  low: '#6b7280',
  warning: '#d97706',
  note: '#6b7280',
};

const TYPE_LABELS: Record<string, string> = {
  dependabot: 'Dependabot',
  code_scanning: 'Code Scanning',
  secret_scanning: 'Secret Scanning',
};

const TYPE_ICONS: Record<string, string> = {
  dependabot: '📦',
  code_scanning: '🔍',
  secret_scanning: '🔑',
};

export default function AlertsTab({ connectionId }: Props) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  useEffect(() => {
    const params = [
      typeFilter && `alert_type=${typeFilter}`,
      severityFilter && `severity=${severityFilter}`,
    ].filter(Boolean).join('&');
    getAlerts(connectionId, params ? `&${params}` : '').then(a => {
      setAlerts(Array.isArray(a) ? a : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [connectionId, typeFilter, severityFilter]);

  // Group by type
  const grouped: Record<string, any[]> = {};
  for (const a of alerts) {
    if (!grouped[a.alert_type]) grouped[a.alert_type] = [];
    grouped[a.alert_type].push(a);
  }

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando alertas...</div>;

  return (
    <div className="gh-alerts">
      {/* Filters */}
      <div className="gh-filters">
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setLoading(true); }} className="gh-filter-select">
          <option value="">Todos los tipos</option>
          <option value="dependabot">Dependabot</option>
          <option value="code_scanning">Code Scanning</option>
          <option value="secret_scanning">Secret Scanning</option>
        </select>
        <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setLoading(true); }} className="gh-filter-select">
          <option value="">Todas las severidades</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="gh-filter-count">{alerts.length} alertas</span>
      </div>

      {alerts.length === 0 ? (
        <div className="gh-empty-safe">
          <Shield />
          <p>No hay alertas de seguridad activas</p>
          <small>¡Buen trabajo! El repositorio está limpio.</small>
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="gh-alert-group">
            <h3 className="gh-alert-type-header">
              {TYPE_ICONS[type] || '•'} {TYPE_LABELS[type] || type}
              <span className="gh-alert-count">{items.length}</span>
            </h3>
            {items.map(a => (
              <a
                key={a.id}
                href={a.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="gh-alert-card"
              >
                <div className="gh-alert-left">
                  <span
                    className="gh-severity-badge"
                    style={{ background: SEVERITY_COLORS[a.severity] || '#6b7280' }}
                  >
                    {a.severity}
                  </span>
                  <div className="gh-alert-body">
                    <strong className="gh-alert-title">{a.title}</strong>
                    {a.package_name && <small className="gh-alert-pkg">{a.package_name}</small>}
                  </div>
                </div>
                <div className="gh-alert-right">
                  <span className={`gh-alert-state ${a.state}`}>
                    {a.state === 'open' ? 'Abierta' : a.state === 'fixed' ? 'Corregida' : a.state}
                  </span>
                  <span className="gh-alert-link">↗</span>
                </div>
              </a>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
