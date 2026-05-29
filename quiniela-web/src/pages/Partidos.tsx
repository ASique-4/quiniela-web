import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function Partidos() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);

  const [pronosticos, setPronosticos] = useState<
    Record<number, { local: string; visitante: string }>
  >({});

  useEffect(() => {
    cargarPartidos();
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

  function partidoYaInicio(fechaPartido: string) {
    const ahora = new Date();
    const fecha = new Date(fechaPartido);

    return fecha <= ahora;
  }

  async function cargarPartidos() {
    setCargando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      navigate('/login');
      return;
    }

    const { data: quiniela, error: quinielaError } = await supabase
      .from('quinielas')
      .select('torneo_id')
      .eq('id', Number(id))
      .single();

    if (quinielaError) {
      alert(quinielaError.message);
      setCargando(false);
      return;
    }

    const { data: partidosData, error: partidosError } = await supabase
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
      .eq('torneo_id', quiniela.torneo_id)
      .order('fecha', { ascending: true });

    if (partidosError) {
      alert(partidosError.message);
      setCargando(false);
      return;
    }

    const { data: pronosticosData, error: pronosticosError } = await supabase
      .from('pronosticos')
      .select('partido_id, goles_local_pred, goles_visitante_pred')
      .eq('quiniela_id', Number(id))
      .eq('usuario_id', userId);

    if (pronosticosError) {
      alert(pronosticosError.message);
      setCargando(false);
      return;
    }

    const pronosticosMap: Record<
      number,
      { local: string; visitante: string }
    > = {};

    pronosticosData?.forEach((p) => {
      pronosticosMap[p.partido_id] = {
        local: String(p.goles_local_pred),
        visitante: String(p.goles_visitante_pred),
      };
    });

    setPronosticos(pronosticosMap);
    setPartidos((partidosData as Partido[]) || []);
    setCargando(false);
  }

  function cambiarPronostico(
    partidoId: number,
    campo: 'local' | 'visitante',
    valor: string
  ) {
    setPronosticos((actual) => ({
      ...actual,
      [partidoId]: {
        local: actual[partidoId]?.local || '',
        visitante: actual[partidoId]?.visitante || '',
        [campo]: valor,
      },
    }));
  }

  async function guardarPronostico(partido: Partido) {
    if (partido.estado !== 'pendiente') {
      alert('Este partido ya fue finalizado. No puedes cambiar el pronóstico.');
      return;
    }

    if (partidoYaInicio(partido.fecha)) {
      alert('El partido ya inició. No puedes guardar o modificar el pronóstico.');
      return;
    }

    const pred = pronosticos[partido.id];

    if (!pred || pred.local === '' || pred.visitante === '') {
      alert('Debes ingresar ambos marcadores');
      return;
    }

    const golesLocalPred = Number(pred.local);
    const golesVisitantePred = Number(pred.visitante);

    if (
      Number.isNaN(golesLocalPred) ||
      Number.isNaN(golesVisitantePred) ||
      golesLocalPred < 0 ||
      golesVisitantePred < 0
    ) {
      alert('Los goles deben ser números válidos mayores o iguales a 0');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      navigate('/login');
      return;
    }

    const { error } = await supabase
      .from('pronosticos')
      .upsert(
        {
          quiniela_id: Number(id),
          usuario_id: userId,
          partido_id: partido.id,
          goles_local_pred: golesLocalPred,
          goles_visitante_pred: golesVisitantePred,
        },
        {
          onConflict: 'quiniela_id,usuario_id,partido_id',
        }
      );

    if (error) {
      alert(error.message);
      return;
    }

    alert('Pronóstico guardado');
    cargarPartidos();
  }

  function obtenerBadgeEstado(partido: Partido) {
    if (partido.estado === 'finalizado') {
      return <span className="badge badge-finished">Finalizado</span>;
    }

    if (partidoYaInicio(partido.fecha)) {
      return <span className="badge badge-closed">Cerrado</span>;
    }

    return <span className="badge badge-pending">Pendiente</span>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <div>
            <h1>Partidos</h1>
            <p>Haz tus pronósticos antes de que inicie cada partido.</p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => navigate('/mis-quinielas')}
          >
            Volver
          </button>
        </div>

        {cargando ? (
          <div className="card">Cargando partidos...</div>
        ) : partidos.length === 0 ? (
          <div className="card empty">No hay partidos registrados.</div>
        ) : (
          <div className="grid">
            {partidos.map((partido) => {
              const nombreLocal = obtenerNombreEquipo(partido.equipo_local);
              const nombreVisitante = obtenerNombreEquipo(
                partido.equipo_visitante
              );

              const cerradoPorFecha = partidoYaInicio(partido.fecha);
              const estaFinalizado = partido.estado === 'finalizado';
              const pronosticoCerrado = cerradoPorFecha || estaFinalizado;

              return (
                <div className="card match-card" key={partido.id}>
                  <div className="header" style={{ marginBottom: 0 }}>
                    <div>
                      <h2 className="match-title">
                        {nombreLocal} vs {nombreVisitante}
                      </h2>
                      <p>{new Date(partido.fecha).toLocaleString()}</p>
                    </div>

                    {obtenerBadgeEstado(partido)}
                  </div>

                  {estaFinalizado && (
                    <div className="card" style={{ background: '#f9fafb' }}>
                      <strong>Resultado final:</strong>{' '}
                      {partido.goles_local} - {partido.goles_visitante}
                    </div>
                  )}

                  {pronosticoCerrado ? (
                    <div className="card" style={{ background: '#f9fafb' }}>
                      <p style={{ marginTop: 0 }}>
                        <strong>Pronóstico cerrado</strong>
                      </p>

                      {pronosticos[partido.id] ? (
                        <p style={{ marginBottom: 0 }}>
                          Tu pronóstico:{' '}
                          <strong>
                            {pronosticos[partido.id].local} -{' '}
                            {pronosticos[partido.id].visitante}
                          </strong>
                        </p>
                      ) : (
                        <p style={{ marginBottom: 0 }}>
                          No registraste pronóstico para este partido.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="score-row">
                        <div className="form-group">
                          <label>{nombreLocal}</label>
                          <input
                            type="number"
                            min="0"
                            value={pronosticos[partido.id]?.local || ''}
                            onChange={(e) =>
                              cambiarPronostico(
                                partido.id,
                                'local',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div />

                        <div className="form-group">
                          <label>{nombreVisitante}</label>
                          <input
                            type="number"
                            min="0"
                            value={pronosticos[partido.id]?.visitante || ''}
                            onChange={(e) =>
                              cambiarPronostico(
                                partido.id,
                                'visitante',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div />

                        <button
                          className="btn btn-primary"
                          onClick={() => guardarPronostico(partido)}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}