import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Quiniela = {
  id: number;
  nombre: string;
  codigo_invitacion: string;
  torneo_id: number;
};

type Participacion = {
  puntos_totales: number;
  quinielas: Quiniela | Quiniela[] | null;
};

type Partido = {
  id: number;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: string;
};

type Pronostico = {
  partido_id: number;
  goles_local_pred: number;
  goles_visitante_pred: number;
};

type QuinielaVista = {
  id: number;
  nombre: string;
  codigo_invitacion: string;
  puntos: number;
};

export default function MisQuinielas() {
  const navigate = useNavigate();

  const [quinielasVista, setQuinielasVista] = useState<QuinielaVista[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMisQuinielas();
  }, []);

  function obtenerQuiniela(quinielas: Quiniela | Quiniela[] | null) {
    if (!quinielas) return null;
    if (Array.isArray(quinielas)) return quinielas[0] || null;
    return quinielas;
  }

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

  async function calcularPuntosUsuario(
    quinielaId: number,
    torneoId: number,
    userId: string
  ) {
    const { data: partidosData, error: partidosError } = await supabase
      .from('partidos')
      .select('id, goles_local, goles_visitante, estado')
      .eq('torneo_id', torneoId)
      .eq('estado', 'finalizado');

    if (partidosError) {
      alert(partidosError.message);
      return 0;
    }

    const { data: pronosticosData, error: pronosticosError } = await supabase
      .from('pronosticos')
      .select('partido_id, goles_local_pred, goles_visitante_pred')
      .eq('quiniela_id', quinielaId)
      .eq('usuario_id', userId);

    if (pronosticosError) {
      alert(pronosticosError.message);
      return 0;
    }

    const partidos = (partidosData || []) as Partido[];
    const pronosticos = (pronosticosData || []) as Pronostico[];

    const partidosMap = new Map<number, Partido>();

    partidos.forEach((partido) => {
      partidosMap.set(partido.id, partido);
    });

    let total = 0;

    pronosticos.forEach((pronostico) => {
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

    return total;
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
          codigo_invitacion,
          torneo_id
        )
      `)
      .eq('usuario_id', userId);

    if (error) {
      alert(error.message);
      setCargando(false);
      return;
    }

    const participaciones = (data as unknown as Participacion[]) || [];

    const resultado: QuinielaVista[] = [];

    for (const item of participaciones) {
      const quiniela = obtenerQuiniela(item.quinielas);

      if (!quiniela) continue;

      const puntos = await calcularPuntosUsuario(
        quiniela.id,
        quiniela.torneo_id,
        userId
      );

      resultado.push({
        id: quiniela.id,
        nombre: quiniela.nombre,
        codigo_invitacion: quiniela.codigo_invitacion,
        puntos,
      });
    }

    setQuinielasVista(resultado);
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
        ) : quinielasVista.length === 0 ? (
          <div className="card empty">No estás en ninguna quiniela todavía.</div>
        ) : (
          <div className="grid grid-2">
            {quinielasVista.map((quiniela) => (
              <div className="card" key={quiniela.id}>
                <h2 style={{ marginTop: 0 }}>{quiniela.nombre}</h2>

                <p>
                  Código:{' '}
                  <strong style={{ letterSpacing: 1 }}>
                    {quiniela.codigo_invitacion}
                  </strong>
                </p>

                <p>
                  Puntos: <strong>{quiniela.puntos}</strong>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}