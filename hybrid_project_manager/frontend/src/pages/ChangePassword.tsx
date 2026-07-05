import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function strength(s: string): { label: string; color: string; pct: number } {
  let score = 0;
  if (s.length >= 8) score++;
  if (s.length >= 12) score++;
  if (/[A-Z]/.test(s)) score++;
  if (/[a-z]/.test(s)) score++;
  if (/\d/.test(s)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~]/.test(s)) score++;
  if (score <= 2) return { label: 'Debil', color: '#ef4444', pct: 25 };
  if (score <= 4) return { label: 'Media', color: '#f59e0b', pct: 55 };
  if (score <= 6) return { label: 'Fuerte', color: '#10b981', pct: 85 };
  return { label: 'Muy fuerte', color: '#7c3aed', pct: 100 };
}

export default function ChangePassword() {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const st = strength(newPass);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setOk('');
    if (newPass !== confirm) { setError('Las contrasenas no coinciden'); return; }
    if (st.pct < 55) { setError('La contrasena es muy debil'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOk('Contrasena actualizada. Redirigiendo...');
      setTimeout(() => nav('/'), 1500);
    } catch { setError('Error de conexion'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', fontFamily: "'Inter', sans-serif", padding: '20px' }}>
      <form onSubmit={handleSubmit} style={{ background: '#111', padding: '40px', borderRadius: '12px',
        width: '100%', maxWidth: '420px', border: '1px solid #222' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            VINC<span style={{ color: '#7c3aed' }}>U</span>LO<span style={{ color: '#7c3aed', fontSize: '10px' }}>master</span>
          </div>
          <p style={{ color: '#a0a0a0', fontSize: '14px', marginTop: '8px' }}>Cambio de contrasena obligatorio</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#7c3aed', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Contrasena actual</label>
          <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} required
            style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e2e8f0', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ color: '#7c3aed', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Nueva contrasena</label>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required
            style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e2e8f0', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
        </div>

        {newPass && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: st.pct + '%', background: st.color, borderRadius: '2px', transition: 'width 0.2s' }} />
            </div>
            <span style={{ color: st.color, fontSize: '11px', fontWeight: 600 }}>{st.label}</span>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#7c3aed', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Confirmar contrasena</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
            style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#e2e8f0', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
        </div>

        <div style={{ fontSize: '12px', color: '#525252', marginBottom: '16px', lineHeight: '1.6' }}>
          Minimo 8 caracteres, mayuscula, minuscula, numero y un simbolo.
        </div>

        {error && <div style={{ background: '#2d1b1b', border: '1px solid #7c3aed', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        {ok && <div style={{ background: '#1b2d1b', border: '1px solid #10b981', color: '#86efac', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>{ok}</div>}

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Actualizando...' : 'Cambiar contrasena'}
        </button>
      </form>
    </div>
  );
}
