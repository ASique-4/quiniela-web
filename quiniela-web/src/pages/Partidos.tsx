import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Partido = {
  id: number;
  fecha: string;
  estado: string;
  goles_local: number | null;
  goles_visitante: number | null;
  equipo_local: {
    nombre: string;
  };
  equipo_visitante: {
    nombre: string;
  };
  pronostico?: {
    goles_local_pred: number;
    goles_visitante_pred: number;
  } | null;
};

export default function Partidos() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [pronosticos, setPronosticos] = useState<Record<number, { local: string; visitante: string }>>({});

  useEffect(() => {
    cargarPartidos();
  }, []);

  async function cargarPartidos() {
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
      return;
    }

    const { data: pronosticosData, error: pronosticosError } = await supabase
      .from('pronosticos')
      .select('partido_id, goles_local_pred, goles_visitante_pred')
      .eq('quiniela_id', Number(id))
      .eq('usuario_id', userId);

    if (pronosticosError) {
      alert(pronosticosError.message);
      return;
    }

    const pronosticosMap: Record<number, { local: string; visitante: string }> = {};

    pronosticosData?.forEach((p) => {
      pronosticosMap[p.partido_id] = {
        local: String(p.goles_local_pred),
        visitante: String(p.goles_visitante_pred),
      };
    });

    setPronosticos(pronosticosMap);
    setPartidos((partidosData as Partido[]) || []);
  }

  function cambiarPronostico(partidoId: number, campo: 'local' | 'visitante', valor: string) {
    setPronosticos((actual) => ({
      ...actual,
      [partidoId]: {
        local: actual[partidoId]?.local || '',
        visitante: actual[partidoId]?.visitante || '',
        [campo]: valor,
      },
    }));
  }

  async function guardarPronostico(partidoId: number) {
    const pred = pronosticos[partidoId];

    if (!pred || pred.local === '' || pred.visitante === '') {
      alert('Debes ingresar ambos marcadores');
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
          partido_id: partidoId,
          goles_local_pred: Number(pred.local),
          goles_visitante_pred: Number(pred.visitante),
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
  }

  return (
    <div>
      <h1>Partidos</h1>

      {partidos.length === 0 && <p>No hay partidos registrados.</p>}

      {partidos.map((partido) => (
        <div key={partido.id}>
          <h3>
            {partido.equipo_local.nombre} vs {partido.equipo_visitante.nombre}
          </h3>

          <p>Fecha: {new Date(partido.fecha).toLocaleString()}</p>
          <p>Estado: {partido.estado}</p>

          {partido.estado === 'finalizado' ? (
            <p>
              Resultado: {partido.goles_local} - {partido.goles_visitante}
            </p>
          ) : (
            <div>
              <label>{partido.equipo_local.nombre}</label>
              <input
                type="number"
                min="0"
                value={pronosticos[partido.id]?.local || ''}
                onChange={(e) =>
                  cambiarPronostico(partido.id, 'local', e.target.value)
                }
              />

              <label>{partido.equipo_visitante.nombre}</label>
              <input
                type="number"
                min="0"
                value={pronosticos[partido.id]?.visitante || ''}
                onChange={(e) =>
                  cambiarPronostico(partido.id, 'visitante', e.target.value)
                }
              />

              <button onClick={() => guardarPronostico(partido.id)}>
                Guardar pronóstico
              </button>
            </div>
          )}

          <hr />
        </div>
      ))}

      <button onClick={() => navigate('/mis-quinielas')}>Volver</button>
    </div>
  );
}