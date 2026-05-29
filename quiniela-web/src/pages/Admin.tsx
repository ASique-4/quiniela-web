import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Partido = {
  id: number;
  fecha: string;
  estado: string;
  goles_local: number | null;
  goles_visitante: number | null;
  equipo_local:
    | {
        nombre: string;
      }
    | {
        nombre: string;
      }[]
    | null;
  equipo_visitante:
    | {
        nombre: string;
      }
    | {
        nombre: string;
      }[]
    | null;
};

export default function Admin() {
  const navigate = useNavigate();

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [verificandoAdmin, setVerificandoAdmin] = useState(true);

  const [resultados, setResultados] = useState<
    Record<number, { local: string; visitante: string }>
  >({});

  useEffect(() => {
    verificarAdmin();
  }, []);

  function obtenerNombreEquipo(
    equipo:
      | {
          nombre: string;
        }
      | {
          nombre: string;
        }[]
      | null
  ) {
    if (!equipo) return 'Equipo';

    if (Array.isArray(equipo)) {
      return equipo[0]?.nombre || 'Equipo';
    }

    return equipo.nombre || 'Equipo';
  }

  async function verificarAdmin() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      alert(error.message);
      navigate('/home');
      return;
    }

    if (!data || data.rol !== 'admin') {
      alert('No tienes permiso para entrar al panel admin');
      navigate('/home');
      return;
    }

    setVerificandoAdmin(false);
    cargarPartidos();
  }

  async function cargarPartidos() {
    const { data, error } = await supabase
      .from('partidos')
      .select(`
        id,
        fecha,
        estado,
        goles_local,
        goles_visitante,
        equipo_local:equipos!partidos_equipo_local_id_fkey (
          nombre
        ),
        equipo_visitante:equipos!partidos_equipo_visitante_id_fkey (
          nombre
        )
      `)
      .order('fecha', { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const mapaResultados: Record<
      number,
      { local: string; visitante: string }
    > = {};

    data?.forEach((partido) => {
      mapaResultados[partido.id] = {
        local: partido.goles_local !== null ? String(partido.goles_local) : '',
        visitante:
          partido.goles_visitante !== null
            ? String(partido.goles_visitante)
            : '',
      };
    });

    setResultados(mapaResultados);
    setPartidos((data as Partido[]) || []);
  }

  function cambiarResultado(
    partidoId: number,
    campo: 'local' | 'visitante',
    valor: string
  ) {
    setResultados((actual) => ({
      ...actual,
      [partidoId]: {
        local: actual[partidoId]?.local || '',
        visitante: actual[partidoId]?.visitante || '',
        [campo]: valor,
      },
    }));
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

  async function guardarResultado(partidoId: number) {
    const resultado = resultados[partidoId];

    if (!resultado || resultado.local === '' || resultado.visitante === '') {
      alert('Debes ingresar ambos goles');
      return;
    }

    const golesLocal = Number(resultado.local);
    const golesVisitante = Number(resultado.visitante);

    const { error: partidoError } = await supabase
      .from('partidos')
      .update({
        goles_local: golesLocal,
        goles_visitante: golesVisitante,
        estado: 'finalizado',
      })
      .eq('id', partidoId);

    if (partidoError) {
      alert(partidoError.message);
      return;
    }

    const { data: pronosticos, error: pronosticosError } = await supabase
      .from('pronosticos')
      .select(`
        id,
        quiniela_id,
        usuario_id,
        goles_local_pred,
        goles_visitante_pred
      `)
      .eq('partido_id', partidoId);

    if (pronosticosError) {
      alert(pronosticosError.message);
      return;
    }

    for (const pronostico of pronosticos || []) {
      const puntos = calcularPuntos(
        golesLocal,
        golesVisitante,
        pronostico.goles_local_pred,
        pronostico.goles_visitante_pred
      );

      const { error: updatePronosticoError } = await supabase
        .from('pronosticos')
        .update({
          puntos_obtenidos: puntos,
        })
        .eq('id', pronostico.id);

      if (updatePronosticoError) {
        alert(updatePronosticoError.message);
        return;
      }
    }

    await recalcularRanking();

    alert('Resultado guardado y puntos calculados');
    cargarPartidos();
  }

  async function recalcularRanking() {
    const { data: participantes, error: participantesError } = await supabase
      .from('quiniela_participantes')
      .select('id, quiniela_id, usuario_id');

    if (participantesError) {
      alert(participantesError.message);
      return;
    }

    for (const participante of participantes || []) {
      const { data: pronosticos, error: pronosticosError } = await supabase
        .from('pronosticos')
        .select('puntos_obtenidos')
        .eq('quiniela_id', participante.quiniela_id)
        .eq('usuario_id', participante.usuario_id);

      if (pronosticosError) {
        alert(pronosticosError.message);
        return;
      }

      const total = pronosticos?.reduce(
        (sum, p) => sum + (p.puntos_obtenidos || 0),
        0
      );

      const { error: updateError } = await supabase
        .from('quiniela_participantes')
        .update({
          puntos_totales: total || 0,
        })
        .eq('id', participante.id);

      if (updateError) {
        alert(updateError.message);
        return;
      }
    }
  }

  if (verificandoAdmin) {
    return <p>Verificando permisos...</p>;
  }

  return (
    <div>
      <h1>Panel Admin</h1>
      <p>Registrar resultados de partidos</p>

      {partidos.length === 0 && <p>No hay partidos registrados.</p>}

      {partidos.map((partido) => {
        const nombreLocal = obtenerNombreEquipo(partido.equipo_local);
        const nombreVisitante = obtenerNombreEquipo(partido.equipo_visitante);

        return (
          <div key={partido.id}>
            <h3>
              {nombreLocal} vs {nombreVisitante}
            </h3>

            <p>Fecha: {new Date(partido.fecha).toLocaleString()}</p>
            <p>Estado: {partido.estado}</p>

            <div>
              <label>{nombreLocal}</label>
              <input
                type="number"
                min="0"
                value={resultados[partido.id]?.local || ''}
                onChange={(e) =>
                  cambiarResultado(partido.id, 'local', e.target.value)
                }
              />

              <label>{nombreVisitante}</label>
              <input
                type="number"
                min="0"
                value={resultados[partido.id]?.visitante || ''}
                onChange={(e) =>
                  cambiarResultado(partido.id, 'visitante', e.target.value)
                }
              />

              <button onClick={() => guardarResultado(partido.id)}>
                Guardar resultado
              </button>
            </div>

            <hr />
          </div>
        );
      })}

      <button onClick={() => navigate('/home')}>Volver</button>
    </div>
  );
}