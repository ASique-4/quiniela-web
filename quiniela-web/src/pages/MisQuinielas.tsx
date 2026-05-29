import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Participacion = {
  puntos_totales: number;
  quinielas: {
    id: number;
    nombre: string;
    codigo_invitacion: string;
  };
};

export default function MisQuinielas() {
  const navigate = useNavigate();
  const [participaciones, setParticipaciones] = useState<Participacion[]>([]);

  useEffect(() => {
    cargarMisQuinielas();
  }, []);

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

    setParticipaciones((data as Participacion[]) || []);
  }

  return (
    <div>
      <h1>Mis quinielas</h1>

      {participaciones.length === 0 && <p>No estás en ninguna quiniela.</p>}

      {participaciones.map((item) => (
        <div key={item.quinielas.id}>
          <h3>{item.quinielas.nombre}</h3>
          <p>Código: {item.quinielas.codigo_invitacion}</p>
          <p>Puntos: {item.puntos_totales}</p>
          <button onClick={() => navigate(`/quiniela/${item.quinielas.id}/partidos`)}>
            Ver partidos
            </button>
            <button onClick={() => navigate(`/quiniela/${item.quinielas.id}/ranking`)}>
  Ver ranking
</button>
          <hr />
        </div>
      ))}

      <button onClick={() => navigate('/home')}>Volver</button>
    </div>
  );
}