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

type Pronostico = {
  usuario_id: string;
  partido_id: number;
  goles_local_pred: number;
  goles_visitante_pred: number;
};

type Partido = {
  id: number;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: string;
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

  function calcularPuntos(
    golesLocalReal: number,
    golesVisitanteReal: number,
    golesLocalPred: number,
    golesVisitantePred: number
  ) {
    if (
      golesLocalReal === golesLocalPred &&
      golesVisitanteReal === golesVisitantePred
    ) {
      return 3;
    }

    const resultadoReal =
      golesLocalReal > golesVisitanteReal
        ? 'LOCAL'
        : golesLocalReal < golesVisitanteReal
        ? 'VISITANTE'
        : 'EMPATE';

    const resultadoPred =
      golesLocalPred > golesVisitantePred
        ? 'LOCAL'
        : golesLocalPred < golesVisitantePred
        ? 'VISITANTE'
        : 'EMPATE';

    return resultadoReal === resultadoPred ? 1 : 0;
  }

  async function cargarRanking() {
    setCargando(true);

    const { data: quiniela, error: quinielaError } = await supabase
      .from('quinielas')
      .select('nombre, torneo_id')
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

    setNombreQuiniela(quiniela.nombre || 'Quiniela');

    const { data: participantesData, error: participantesError } =
      await supabase
        .from('quiniela_participantes')
        .select('id, usuario_id, puntos_totales')
        .eq('quiniela_id', Number(id));

    if (participantesError) {
      alert(participantesError.message);
      setCargando(false);
      return;
    }

    const participantes = (participantesData || []) as Participante[];

    if (participantes.length === 0) {
      setRanking([]);
      setCargando(false);
      return;
    }

    const usuariosIds = participantes.map((p) => p.usuario_id);

    const { data: perfilesData, error: perfilesError } = await supabase
      .from('perfiles')
      .select('id, nombre')
      .in('id', usuariosIds);

    if (perfilesError) {
      alert(perfilesError.message);
      setCargando(false);
      return;
    }

    const { data: partidosData, error: partidosError } = await supabase
      .from('partidos')
      .select('id, goles_local, goles_visitante, estado')
      .eq('torneo_id', quiniela.torneo_id)
      .eq('estado', 'finalizado');

    if (partidosError) {
      alert(partidosError.message);
      setCargando(false);
      return;
    }

    const { data: pronosticosData, error: pronosticosError } = await supabase
      .from('pronosticos')
      .select('usuario_id, partido_id, goles_local_pred, goles_visitante_pred')
      .eq('quiniela_id', Number(id));

    if (pronosticosError) {
      alert(pronosticosError.message);
      setCargando(false);
      return;
    }

    const perfiles = (perfilesData || []) as Perfil[];
    const partidos = (partidosData || []) as Partido[];
    const pronosticos = (pronosticosData || []) as Pronostico[];

    const perfilesMap = new Map<string, string>();

    perfiles.forEach((perfil) => {
      perfilesMap.set(perfil.id, perfil.nombre || 'Sin nombre');
    });

    const partidosMap = new Map<number, Partido>();

    partidos.forEach((partido) => {
      partidosMap.set(partido.id, partido);
    });

    const rankingCalculado: RankingItem[] = participantes.map(
      (participante) => {
        const pronosticosUsuario = pronosticos.filter(
          (p) => p.usuario_id === participante.usuario_id
        );

        let total = 0;

        pronosticosUsuario.forEach((pronostico) => {
          const partido = partidosMap.get(pronostico.partido_id);

          if (
            !partido ||
            partido.goles_local === null ||
            partido.goles_visitante === null
          ) {
            return;
          }

          total += calcularPuntos(
            partido.goles_local,
            partido.goles_visitante,
            pronostico.goles_local_pred,
            pronostico.goles_visitante_pred
          );
        });

        return {
          id: participante.id,
          usuario_id: participante.usuario_id,
          nombre: perfilesMap.get(participante.usuario_id) || 'Sin nombre',
          puntos_totales: total,
        };
      }
    );

    rankingCalculado.sort((a, b) => b.puntos_totales - a.puntos_totales);

    setRanking(rankingCalculado);
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

          <button
            className="btn btn-secondary"
            onClick={() => navigate('/mis-quinielas')}
          >
            Volver
          </button>
        </div>

        <div className="card">
          <div style={{ marginBottom: 24 }}>
            <h2 className="section-title">Reglas de puntuación</h2>

            <div className="grid grid-3">
              <div className="menu-card">
                <span className="badge badge-finished">3 puntos</span>
                <h3>Marcador exacto</h3>
                <p>Acertar exactamente los goles de ambos equipos.</p>
              </div>

              <div className="menu-card">
                <span className="badge badge-pending">1 punto</span>
                <h3>Resultado correcto</h3>
                <p>
                  Acertar ganador o empate, aunque el marcador no sea exacto.
                </p>
              </div>

              <div className="menu-card">
                <span className="badge badge-closed">0 puntos</span>
                <h3>Resultado incorrecto</h3>
                <p>No acertar ni ganador ni empate.</p>
              </div>
            </div>

            <div className="divider" />
          </div>

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