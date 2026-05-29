import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function UnirseQuiniela() {
  const navigate = useNavigate();

  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);

  async function unirse(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      alert('Debes iniciar sesión');
      navigate('/login');
      return;
    }

    const { data: quiniela, error: quinielaError } = await supabase
      .from('quinielas')
      .select('id, nombre')
      .eq('codigo_invitacion', codigo.toUpperCase())
      .maybeSingle();

    if (quinielaError) {
      setCargando(false);
      alert(quinielaError.message);
      return;
    }

    if (!quiniela) {
      setCargando(false);
      alert('No existe una quiniela con ese código');
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
      if (participanteError.message.includes('duplicate')) {
        alert('Ya estás unido a esta quiniela');
      } else {
        alert(participanteError.message);
      }
      return;
    }

    alert(`Te uniste a: ${quiniela.nombre}`);
    navigate('/mis-quinielas');
  }

  return (
    <div>
      <h1>Unirme a quiniela</h1>

      <form onSubmit={unirse}>
        <div>
          <label>Código de invitación</label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={cargando}>
          {cargando ? 'Uniendo...' : 'Unirme'}
        </button>
      </form>

      <br />

      <button onClick={() => navigate('/home')}>Volver</button>
    </div>
  );
}