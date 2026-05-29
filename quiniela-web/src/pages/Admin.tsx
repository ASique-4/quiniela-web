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
    return <p>Verificando permisos...</p>;
  }

  return (
    <div>
      <h1>Panel Admin</h1>
      <p>Crear equipos, crear partidos y registrar resultados.</p>

      <button onClick={() => navigate('/home')}>Volver al inicio</button>

      <hr />

      <section>
        <h2>Crear equipo</h2>

        <form onSubmit={crearEquipo}>
          <div>
            <label>Nombre del equipo</label>
            <input
              type="text"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              placeholder="Ej. Real Madrid"
              required
            />
          </div>

          <button type="submit">Crear equipo</button>
        </form>
      </section>

      <hr />

      <section>
        <h2>Crear partido</h2>

        {equipos.length < 2 ? (
          <p>Debes crear al menos 2 equipos para crear un partido.</p>
        ) : torneos.length === 0 ? (
          <p>No hay torneos registrados.</p>
        ) : (
          <form onSubmit={crearPartido}>
            <div>
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

            <div>
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

            <div>
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

            <div>
              <label>Fecha y hora</label>
              <input
                type="datetime-local"
                value={fechaPartido}
                onChange={(e) => setFechaPartido(e.target.value)}
                required
              />
            </div>

            <button type="submit">Crear partido</button>
          </form>
        )}
      </section>

      <hr />

      <section>
        <h2>Partidos registrados</h2>

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

              {partido.estado === 'finalizado' && (
                <p>
                  Resultado actual: {partido.goles_local} -{' '}
                  {partido.goles_visitante}
                </p>
              )}

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

                {partido.estado === 'finalizado' && (
                  <button onClick={() => reabrirPartido(partido.id)}>
                    Reabrir partido
                  </button>
                )}
              </div>

              <hr />
            </div>
          );
        })}
      </section>
    </div>
  );
}