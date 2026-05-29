import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Torneo = {
  id: number;
  nombre: string;
};

export default function CrearQuiniela() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [torneoId, setTorneoId] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarTorneos();
  }, []);

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

  function generarCodigo() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async function crearQuiniela(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      alert('Debes iniciar sesión');
      navigate('/login');
      return;
    }

    const codigo = generarCodigo();

    const { data: quiniela, error } = await supabase
      .from('quinielas')
      .insert({
        nombre,
        torneo_id: Number(torneoId),
        creada_por: userId,
        codigo_invitacion: codigo,
      })
      .select('id, codigo_invitacion')
      .single();

    if (error) {
      setCargando(false);
      alert(error.message);
      return;
    }

    const { error: participanteError } = await supabase
      .from('quiniela_participantes')
      .insert({
        quiniela_id: quiniela.id,
        usuario_id: userId,
        puntos_totales: 0,
      });

    setCargando(false);

    if (participanteError) {
      alert(participanteError.message);
      return;
    }

    alert(`Quiniela creada. Código: ${quiniela.codigo_invitacion}`);
    navigate('/mis-quinielas');
  }

  return (
    <div>
      <h1>Crear quiniela</h1>

      <form onSubmit={crearQuiniela}>
        <div>
          <label>Nombre de la quiniela</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

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

        <button type="submit" disabled={cargando}>
          {cargando ? 'Creando...' : 'Crear quiniela'}
        </button>
      </form>

      <br />

      <button onClick={() => navigate('/home')}>Volver</button>
    </div>
  );
}