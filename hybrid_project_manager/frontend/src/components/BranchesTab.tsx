import { useEffect, useState } from 'react';
import { getBranches, updateBranch, getAreas } from '../api';
import { Loader2 } from '../icons';

interface Props {
  connectionId: string;
}

interface Area {
  codigo: string;
  nombre: string;
  color: string;
}

export default function BranchesTab({ connectionId }: Props) {
  const [branches, setBranches] = useState<any[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getBranches(connectionId),
      getAreas(),
    ]).then(([b, a]) => {
      setBranches(Array.isArray(b) ? b : []);
      setAreas(Array.isArray(a) ? a : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [connectionId]);

  const handleAreaChange = async (branchId: string, areaCodigo: string) => {
    setUpdating(branchId);
    await updateBranch(branchId, { area: areaCodigo || null });
    setBranches(prev => prev.map(b =>
      b.id === branchId ? { ...b, area: areaCodigo || null, area_codigo: areaCodigo || '', area_nombre: areas.find(a => a.codigo === areaCodigo)?.nombre || '', area_color: areas.find(a => a.codigo === areaCodigo)?.color || '' } : b
    ));
    setUpdating(null);
  };

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando ramas...</div>;

  return (
    <div className="gh-branches">
      {branches.length === 0 ? (
        <p className="gh-empty">No hay ramas. Sincronizá el repositorio.</p>
      ) : (
        <div className="gh-table-wrap">
          <table className="gh-table">
            <thead>
              <tr>
                <th>Rama</th>
                <th>Último commit</th>
                <th>Área</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b: any) => (
                <tr key={b.id} className={!b.is_active ? 'gh-inactive' : ''}>
                  <td>
                    <span className="gh-branch-name">
                      {b.is_default && <span className="gh-default-badge">default</span>}
                      {b.branch_name}
                    </span>
                  </td>
                  <td className="gh-mono">
                    {b.last_commit_sha ? b.last_commit_sha.slice(0, 7) : '—'}
                  </td>
                  <td>
                    <select
                      className="gh-area-select"
                      value={b.area || ''}
                      onChange={e => handleAreaChange(b.id, e.target.value)}
                      disabled={updating === b.id}
                      style={{ borderColor: b.area_color || 'var(--border)' }}
                    >
                      <option value="">Sin área</option>
                      {areas.map(a => (
                        <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`gh-status ${b.is_active ? 'active' : 'inactive'}`}>
                      {b.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
