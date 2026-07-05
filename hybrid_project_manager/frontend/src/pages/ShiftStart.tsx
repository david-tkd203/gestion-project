import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ShiftStart() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState('');
  const [camError, setCamError] = useState('');
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
  }, []);

  // GPS
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocError('GPS no disponible en este dispositivo');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => setLocError('Error GPS: ' + (err.code === 1 ? 'Permiso denegado' : err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Camera
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      setCamError('Camara no disponible. Permisos denegados o dispositivo sin camara.');
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setPhoto(c.toDataURL('image/jpeg', 0.8));
    // Stop camera
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const startShift = () => {
    setStarted(true);
    getLocation();
    startCamera();
  };

  const confirmShift = () => {
    // Here you would POST to backend
    alert('Turno iniciado correctamente:\n' +
      'Hora: ' + time + '\n' +
      'Ubicacion: ' + (location ? `${location.lat}, ${location.lng}` : 'No disponible') + '\n' +
      'Foto: ' + (photo ? 'Capturada' : 'No disponible'));
    nav('/');
  };

  const s: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0a0a0a', fontFamily: "'Inter', sans-serif", padding: '20px'
  };
  const card: React.CSSProperties = {
    background: '#111', padding: '32px', borderRadius: '12px',
    width: '100%', maxWidth: '480px', border: '1px solid #222'
  };
  const label: React.CSSProperties = {
    color: '#7c3aed', fontSize: '11px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px'
  };
  const box: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
    padding: '12px 16px', color: '#e2e8f0', fontSize: '13px'
  };
  const btn: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: '6px',
    border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    transition: 'opacity 0.2s'
  };

  return (
    <div style={s}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            VINC<span style={{ color: '#7c3aed' }}>U</span>LO<span style={{ color: '#7c3aed', fontSize: '10px' }}>master</span>
          </div>
          <p style={{ color: '#a0a0a0', fontSize: '14px', marginTop: '8px' }}>Inicio de Turno</p>
        </div>

        {!started ? (
          <button onClick={startShift} style={{ ...btn, background: '#7c3aed', color: '#fff' }}>
            Iniciar Turno
          </button>
        ) : (
          <>
            {/* Time */}
            <div style={{ marginBottom: '16px' }}>
              <div style={label}>Hora de inicio</div>
              <div style={box}>{time}</div>
            </div>

            {/* GPS */}
            <div style={{ marginBottom: '16px' }}>
              <div style={label}>Ubicacion GPS</div>
              {location ? (
                <div style={box}>
                  Lat: {location.lat.toFixed(6)}<br />
                  Lng: {location.lng.toFixed(6)}
                </div>
              ) : locError ? (
                <div style={{ ...box, color: '#fca5a5' }}>{locError}</div>
              ) : (
                <div style={box}>Obteniendo ubicacion...</div>
              )}
            </div>

            {/* Camera */}
            <div style={{ marginBottom: '16px' }}>
              <div style={label}>Foto de inicio</div>
              {camError ? (
                <div style={{ ...box, color: '#fca5a5' }}>{camError}</div>
              ) : !photo ? (
                <div>
                  <video ref={videoRef} autoPlay playsInline
                    style={{ width: '100%', borderRadius: '8px', marginBottom: '8px', background: '#000' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <button onClick={takePhoto} style={{ ...btn, background: '#222', color: '#fff', marginBottom: '8px' }}>
                    Tomar Foto
                  </button>
                </div>
              ) : (
                <div>
                  <img src={photo} alt="foto inicio" style={{ width: '100%', borderRadius: '8px' }} />
                </div>
              )}
            </div>

            <button onClick={confirmShift}
              style={{ ...btn, background: '#7c3aed', color: '#fff', marginTop: '8px' }}>
              Confirmar Inicio de Turno
            </button>
          </>
        )}
      </div>
    </div>
  );
}
