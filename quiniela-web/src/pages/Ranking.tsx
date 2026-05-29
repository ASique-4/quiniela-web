import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

type RankingItem = {
  id: number;
  puntos_totales: number;
  perfiles:
    | {
        nombre: string;
      }
    | {
        nombre: string;
      }[]
    | null;
};

export default function Ranking() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [nombreQuiniela, setNombreQuiniela] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarRanking();
  }, []);

  function obtenerNombreJugador(perfiles: RankingItem['perfiles']) {
    if (!perfiles) return 'Sin nombre';

    if (Array.isArray(perfiles)) {
      return perfiles[0]?.nombre || 'Sin nombre';
    }

    return perfiles.nombre || 'Sin nombre';
  }

  async function cargarRanking() {
    setCargando(true);

    const { data: quiniela, error: quinielaError } = await supabase
      .from('quinielas')
      .select('nombre')
      .eq('id', Number(id))
      .maybeSingle();

    if (quinielaError) {
      alert(quinielaError.message);
      setCargando(false);
      return;
    }

    if (!quiniela) {
      alert('No se encontró la quiniela');
      setCargando(false);
      return;
    }

    setNombreQuiniela(quiniela.nombre);

    const { data, error } = await supabase
      .from('quiniela_participantes')
      .select(`
        id,
        puntos_totales,
        perfiles!quiniela_participantes_usuario_id_fkey (
          nombre
        )
      `)
      .eq('quiniela_id', Number(id))
      .order('puntos_totales', { ascending: false });

    if (error) {
      alert(error.message);
      setCargando(false);
      return;
    }

    setRanking((data as RankingItem[]) || []);
    setCargando(false);
  }

  if (cargando) {
    return <p>Cargando ranking...</p>;
  }

  return (
    <div>
      <h1>Ranking</h1>
      <h2>{nombreQuiniela}</h2>

      {ranking.length === 0 ? (
        <p>No hay participantes todavía.</p>
      ) : (
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>Posición</th>
              <th>Jugador</th>
              <th>Puntos</th>
            </tr>
          </thead>

          <tbody>
            {ranking.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{obtenerNombreJugador(item.perfiles)}</td>
                <td>{item.puntos_totales}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <br />

      <button onClick={() => navigate('/mis-quinielas')}>Volver</button>
    </div>
  );
}