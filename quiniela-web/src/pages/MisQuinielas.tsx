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

  useEffect(() => {
    cargarMisQuinielas();
  }, []);

  function obtenerQuiniela(quinielas: Quiniela | Quiniela[] | null) {
    if (!quinielas) return null;

    if (Array.isArray(quinielas)) {
      return quinielas[0] || null;
    }

    return quinielas;
  }

  async function cargarMisQuinielas() {
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
      return;
    }

    setParticipaciones((data as unknown as Participacion[]) || []);
  }

  return (
    <div>
      <h1>Mis quinielas</h1>

      {participaciones.length === 0 && <p>No estás en ninguna quiniela.</p>}

      {participaciones.map((item, index) => {
        const quiniela = obtenerQuiniela(item.quinielas);

        if (!quiniela) {
          return null;
        }

        return (
          <div key={`${quiniela.id}-${index}`}>
            <h3>{quiniela.nombre}</h3>

            <p>Código: {quiniela.codigo_invitacion}</p>
            <p>Puntos: {item.puntos_totales}</p>

            <button onClick={() => navigate(`/quiniela/${quiniela.id}/partidos`)}>
              Ver partidos
            </button>

            <button onClick={() => navigate(`/quiniela/${quiniela.id}/ranking`)}>
              Ver ranking
            </button>

            <hr />
          </div>
        );
      })}

      <button onClick={() => navigate('/home')}>Volver</button>
    </div>
  );
}