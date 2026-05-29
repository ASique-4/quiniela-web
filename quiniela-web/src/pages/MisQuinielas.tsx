import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Quiniela = {
  id: number;
  nombre: string;
  codigo_invitacion: string;
};

type Participacion = {
  puntos_totales: number;
  quinielas: Quiniela | Quiniela[] | null;
};

export default function MisQuinielas() {
  const navigate = useNavigate();
  const [participaciones, setParticipaciones] = useState<Participacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMisQuinielas();
  }, []);

  function obtenerQuiniela(quinielas: Quiniela | Quiniela[] | null) {
    if (!quinielas) return null;
    if (Array.isArray(quinielas)) return quinielas[0] || null;
    return quinielas;
  }

  async function cargarMisQuinielas() {
    setCargando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('quiniela_participantes')
      .select(`
        puntos_totales,
        quinielas (
          id,
          nombre,
          codigo_invitacion
        )
      `)
      .eq('usuario_id', userId);

    if (error) {
      alert(error.message);
      setCargando(false);
      return;
    }

    setParticipaciones((data as unknown as Participacion[]) || []);
    setCargando(false);
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <div>
            <h1>Mis quinielas</h1>
            <p>Consulta tus quinielas, puntos y ranking.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/home')}>
            Volver
          </button>
        </div>

        {cargando ? (
          <div className="card">Cargando...</div>
        ) : participaciones.length === 0 ? (
          <div className="card empty">No estás en ninguna quiniela todavía.</div>
        ) : (
          <div className="grid grid-2">
            {participaciones.map((item, index) => {
              const quiniela = obtenerQuiniela(item.quinielas);

              if (!quiniela) return null;

              return (
                <div className="card" key={`${quiniela.id}-${index}`}>
                  <h2 style={{ marginTop: 0 }}>{quiniela.nombre}</h2>

                  <p>
                    Código:{' '}
                    <strong style={{ letterSpacing: 1 }}>
                      {quiniela.codigo_invitacion}
                    </strong>
                  </p>

                  <p>
                    Puntos: <strong>{item.puntos_totales}</strong>
                  </p>

                  <div className="actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/quiniela/${quiniela.id}/partidos`)}
                    >
                      Ver partidos
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/quiniela/${quiniela.id}/ranking`)}
                    >
                      Ver ranking
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}