import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProyectos, getSprints, getTareas } from '../api';
import GameMap from '../components/GameMap';
import { Loader2 } from '../icons';

interface Sprint {
  id: string;
  codigo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  color: string;
  progress: number;
}

interface TareaItem {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
  is_blocked: boolean;
  sprint: string;
}

export default function GameMapPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tareas, setTareas] = useState<TareaItem[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const projs: any[] = await getProyectos();
        const firstProj = projs?.[0];
        if (firstProj) {
          setProjectId(firstProj.id);
          const [s, t] = await Promise.all([
            getSprints(firstProj.id),
            getTareas(`?proyecto=${firstProj.id}`),
          ]);
          setSprints(s);
          setTareas(Array.isArray(t) ? t : []);
        } else {
          const s = await getSprints();
          setSprints(s);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="loading"><Loader2 className="spinner" /> Cargando mapa...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Mapa del Proyecto</h2>
          <p>Recorrido de niveles — cada sprint contiene sus tareas</p>
        </div>
      </div>
      <GameMap
        sprints={sprints}
        tareas={tareas}
        onNodeClick={(id) => navigate(`/sprint/${id}`)}
        onTaskClick={(id) => {
          const t = tareas.find(x => x.id === id);
          if (t?.sprint) navigate(`/sprint/${t.sprint}`);
        }}
      />
    </div>
  );
}
