import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Participante = {
  id: number;
  usuario_id: string;
  puntos_totales: number;
};

type Perfil = {
  id: string;
  nombre: string;
};

type RankingItem = {
  id: number;
  usuario_id: string;
  nombre: string;
  puntos_totales: number;
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

    const { data: participantesData, error: participantesError } = await supabase
      .from('quiniela_participantes')
      .select('id, usuario_id, puntos_totales')
      .eq('quiniela_id', Number(id))
      .order('puntos_totales', { ascending: false });

    if (participantesError) {
      alert(participantesError.message);
      setCargando(false);
      return;
    }

    const participantes = (participantesData || []) as Participante[];
    const usuariosIds = participantes.map((p) => p.usuario_id);

    if (usuariosIds.length === 0) {
      setRanking([]);
      setCargando(false);
      return;
    }

    const { data: perfilesData, error: perfilesError } = await supabase
      .from('perfiles')
      .select('id, nombre')
      .in('id', usuariosIds);

    if (perfilesError) {
      alert(perfilesError.message);
      setCargando(false);
      return;
    }

    const perfiles = (perfilesData || []) as Perfil[];

    const perfilesMap = new Map<string, string>();

    perfiles.forEach((perfil) => {
      perfilesMap.set(perfil.id, perfil.nombre || 'Sin nombre');
    });

    const rankingCompleto: RankingItem[] = participantes.map((participante) => ({
      id: participante.id,
      usuario_id: participante.usuario_id,
      puntos_totales: participante.puntos_totales,
      nombre: perfilesMap.get(participante.usuario_id) || 'Sin nombre',
    }));

    setRanking(rankingCompleto);
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
                      <td>{item.nombre}</td>
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