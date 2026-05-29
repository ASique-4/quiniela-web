import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Equipo = {
  id: number;
  nombre: string;
  logo_url: string | null;
};

type Torneo = {
  id: number;
  nombre: string;
};

type Partido = {
  id: number;
  torneo_id: number;
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

  const [verificandoAdmin, setVerificandoAdmin] = useState(true);

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);

  const [nombreTorneo, setNombreTorneo] = useState('');
  const [fechaInicioTorneo, setFechaInicioTorneo] = useState('');
  const [fechaFinTorneo, setFechaFinTorneo] = useState('');

  const [nombreEquipo, setNombreEquipo] = useState('');

  const [torneoId, setTorneoId] = useState('');
  const [equipoLocalId, setEquipoLocalId] = useState('');
  const [equipoVisitanteId, setEquipoVisitanteId] = useState('');
  const [fechaPartido, setFechaPartido] = useState('');

  const [resultados, setResultados] = useState<
    Record<number, { local: string; visitante: string }>
  >({});

  useEffect(() => {
    verificarAdmin();
  }, []);

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
    await cargarDatosIniciales();
  }

  async function cargarDatosIniciales() {
    await Promise.all([cargarEquipos(), cargarTorneos(), cargarPartidos()]);
  }

  async function cargarEquipos() {
    const { data, error } = await supabase
      .from('equipos')
      .select('id, nombre, logo_url')
      .order('nombre', { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setEquipos(data || []);

    if (data && data.length > 0) {
      setEquipoLocalId(String(data[0].id));
      setEquipoVisitanteId(String(data[1]?.id || data[0].id));
    }
  }

  async function cargarTorneos() {
    const { data, error } = await supabase
      .from('torneos')
      .select('id, nombre')
      .order('id', { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setTorneos(data || []);

    if (data && data.length > 0) {
      setTorneoId(String(data[0].id));
    }
  }

  async function cargarPartidos() {
    const { data, error } = await supabase
      .from('partidos')
      .select(`
        id,
        torneo_id,
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

    const mapaResultados: Record<number, { local: string; visitante: string }> =
      {};

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

  async function crearTorneo(e: React.FormEvent) {
    e.preventDefault();

    const nombreLimpio = nombreTorneo.trim();

    if (!nombreLimpio || !fechaInicioTorneo || !fechaFinTorneo) {
      alert('Completa todos los campos del torneo');
      return;
    }

    if (fechaFinTorneo < fechaInicioTorneo) {
      alert('La fecha final no puede ser menor que la fecha inicial');
      return;
    }

    const { error } = await supabase.from('torneos').insert({
      nombre: nombreLimpio,
      fecha_inicio: fechaInicioTorneo,
      fecha_fin: fechaFinTorneo,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Torneo creado');
    setNombreTorneo('');
    setFechaInicioTorneo('');
    setFechaFinTorneo('');
    cargarTorneos();
  }

  async function crearEquipo(e: React.FormEvent) {
    e.preventDefault();

    const nombreLimpio = nombreEquipo.trim();

    if (!nombreLimpio) {
      alert('Ingresa el nombre del equipo');
      return;
    }

    const { error } = await supabase.from('equipos').insert({
      nombre: nombreLimpio,
      logo_url: null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Equipo creado');
    setNombreEquipo('');
    cargarEquipos();
  }

  async function crearPartido(e: React.FormEvent) {
    e.preventDefault();

    if (!torneoId || !equipoLocalId || !equipoVisitanteId || !fechaPartido) {
      alert('Completa todos los campos');
      return;
    }

    if (equipoLocalId === equipoVisitanteId) {
      alert('El equipo local y visitante no pueden ser iguales');
      return;
    }

    const fechaIso = new Date(fechaPartido).toISOString();

    const { error } = await supabase.from('partidos').insert({
      torneo_id: Number(torneoId),
      equipo_local_id: Number(equipoLocalId),
      equipo_visitante_id: Number(equipoVisitanteId),
      fecha: fechaIso,
      estado: 'pendiente',
      goles_local: null,
      goles_visitante: null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Partido creado');
    setFechaPartido('');
    cargarPartidos();
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

    if (
      Number.isNaN(golesLocal) ||
      Number.isNaN(golesVisitante) ||
      golesLocal < 0 ||
      golesVisitante < 0
    ) {
      alert('Los goles deben ser números válidos mayores o iguales a 0');
      return;
    }

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

  async function reabrirPartido(partidoId: number) {
    const confirmar = confirm(
      '¿Seguro que quieres reabrir este partido? Se quitará el resultado y los puntos se recalcularán.'
    );

    if (!confirmar) return;

    const { error: partidoError } = await supabase
      .from('partidos')
      .update({
        goles_local: null,
        goles_visitante: null,
        estado: 'pendiente',
      })
      .eq('id', partidoId);

    if (partidoError) {
      alert(partidoError.message);
      return;
    }

    const { error: pronosticoError } = await supabase
      .from('pronosticos')
      .update({
        puntos_obtenidos: 0,
      })
      .eq('partido_id', partidoId);

    if (pronosticoError) {
      alert(pronosticoError.message);
      return;
    }

    await recalcularRanking();

    alert('Partido reabierto');
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
    return (
      <div className="page">
        <div className="container">
          <div className="card">Verificando permisos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <div>
            <h1>Panel Admin</h1>
            <p>Administra torneos, equipos, partidos y resultados.</p>
          </div>

          <button className="btn btn-secondary" onClick={() => navigate('/home')}>
            Volver
          </button>
        </div>

        <div className="grid grid-3">
          <div className="card">
            <h2 className="section-title">Crear torneo</h2>

            <form className="form" onSubmit={crearTorneo}>
              <div className="form-group">
                <label>Nombre del torneo</label>
                <input
                  type="text"
                  value={nombreTorneo}
                  placeholder="Ej. Mundial 2026"
                  onChange={(e) => setNombreTorneo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha inicio</label>
                <input
                  type="date"
                  value={fechaInicioTorneo}
                  onChange={(e) => setFechaInicioTorneo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha fin</label>
                <input
                  type="date"
                  value={fechaFinTorneo}
                  onChange={(e) => setFechaFinTorneo(e.target.value)}
                  required
                />
              </div>

              <button className="btn btn-primary" type="submit">
                Crear torneo
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="section-title">Crear equipo</h2>

            <form className="form" onSubmit={crearEquipo}>
              <div className="form-group">
                <label>Nombre del equipo</label>
                <input
                  type="text"
                  value={nombreEquipo}
                  placeholder="Ej. Real Madrid"
                  onChange={(e) => setNombreEquipo(e.target.value)}
                  required
                />
              </div>

              <button className="btn btn-primary" type="submit">
                Crear equipo
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="section-title">Crear partido</h2>

            {equipos.length < 2 ? (
              <p>Debes crear al menos 2 equipos para crear un partido.</p>
            ) : torneos.length === 0 ? (
              <p>No hay torneos registrados.</p>
            ) : (
              <form className="form" onSubmit={crearPartido}>
                <div className="form-group">
                  <label>Torneo</label>
                  <select
                    value={torneoId}
                    onChange={(e) => setTorneoId(e.target.value)}
                    required
                  >
                    {torneos.map((torneo) => (
                      <option key={torneo.id} value={torneo.id}>
                        {torneo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Equipo local</label>
                  <select
                    value={equipoLocalId}
                    onChange={(e) => setEquipoLocalId(e.target.value)}
                    required
                  >
                    {equipos.map((equipo) => (
                      <option key={equipo.id} value={equipo.id}>
                        {equipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Equipo visitante</label>
                  <select
                    value={equipoVisitanteId}
                    onChange={(e) => setEquipoVisitanteId(e.target.value)}
                    required
                  >
                    {equipos.map((equipo) => (
                      <option key={equipo.id} value={equipo.id}>
                        {equipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={fechaPartido}
                    onChange={(e) => setFechaPartido(e.target.value)}
                    required
                  />
                </div>

                <button className="btn btn-primary" type="submit">
                  Crear partido
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="divider" />

        <div className="card">
          <h2 className="section-title">Partidos registrados</h2>

          {partidos.length === 0 ? (
            <div className="empty">No hay partidos registrados.</div>
          ) : (
            <div className="grid">
              {partidos.map((partido) => {
                const nombreLocal = obtenerNombreEquipo(partido.equipo_local);
                const nombreVisitante = obtenerNombreEquipo(
                  partido.equipo_visitante
                );

                return (
                  <div className="card match-card" key={partido.id}>
                    <div className="header" style={{ marginBottom: 0 }}>
                      <div>
                        <h3 className="match-title">
                          {nombreLocal} vs {nombreVisitante}
                        </h3>
                        <p>{new Date(partido.fecha).toLocaleString()}</p>
                      </div>

                      <span
                        className={
                          partido.estado === 'finalizado'
                            ? 'badge badge-finished'
                            : 'badge badge-pending'
                        }
                      >
                        {partido.estado}
                      </span>
                    </div>

                    {partido.estado === 'finalizado' && (
                      <p>
                        Resultado actual:{' '}
                        <strong>
                          {partido.goles_local} - {partido.goles_visitante}
                        </strong>
                      </p>
                    )}

                    <div className="score-row">
                      <div className="form-group">
                        <label>{nombreLocal}</label>
                        <input
                          type="number"
                          min="0"
                          value={resultados[partido.id]?.local || ''}
                          onChange={(e) =>
                            cambiarResultado(
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
                          value={resultados[partido.id]?.visitante || ''}
                          onChange={(e) =>
                            cambiarResultado(
                              partido.id,
                              'visitante',
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div />

                      <div className="actions">
                        <button
                          className="btn btn-success"
                          onClick={() => guardarResultado(partido.id)}
                        >
                          Guardar
                        </button>

                        {partido.estado === 'finalizado' && (
                          <button
                            className="btn btn-danger"
                            onClick={() => reabrirPartido(partido.id)}
                          >
                            Reabrir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}