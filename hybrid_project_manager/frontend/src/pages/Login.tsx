import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs';
import { login } from '../api';
import { LogIn, Loader2 } from '../icons';
import ThreeBackground from '../ThreeBackground';

export default function Login() {
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    anime({ targets: '.login-card', opacity: [0, 1], translateY: [30, 0], duration: 800, easing: 'easeOutExpo' });
    return () => anime.remove('.login-card');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await login(user, pass);
      localStorage.setItem('access_token', data.access);
      // Check if password change is required
      const me = await (await fetch('/api/me/', {
        headers: { Authorization: 'Bearer ' + data.access }
      })).json();
      if (me.must_change_password) {
        nav('/change-password');
      } else {
        nav('/');
      }
    } catch (err: any) { setError(err.message || 'Error al iniciar sesion'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <ThreeBackground />
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="logo-wrap"><LogIn /></div>
        <h1>VINCULOmaster</h1>
        <p className="sub">Ingresa con tu cuenta para acceder al panel de gestion</p>
        <div className="field">
          <label>Usuario</label>
          <input value={user} onChange={e => setUser(e.target.value)} placeholder="admin" />
        </div>
        <div className="field">
          <label>Contrasena</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••" />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <><Loader2 className="spinner" /> Ingresando...</> : 'Iniciar sesion'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
