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
    if (Array.isArray(perfiles)) return perfiles[0]?.nombre || 'Sin nombre';
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

    setNombreQuiniela(quiniela?.nombre || 'Quiniela');

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

    setRanking((data as unknown as RankingItem[]) || []);
    setCargando(false);
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <div>
            <h1>Ranking</h1>
            <p>{nombreQuiniela}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/mis-quinielas')}>
            Volver
          </button>
        </div>

        <div className="card">
          {cargando ? (
            <p>Cargando ranking...</p>
          ) : ranking.length === 0 ? (
            <div className="empty">No hay participantes todavía.</div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
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
                      <td>#{index + 1}</td>
                      <td>{obtenerNombreJugador(item.perfiles)}</td>
                      <td>
                        <strong>{item.puntos_totales}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}