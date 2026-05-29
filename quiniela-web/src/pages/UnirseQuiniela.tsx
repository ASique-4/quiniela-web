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
    <div className="page">
      <div className="container">
        <div className="header">
          <div>
            <h1>Unirme a quiniela</h1>
            <p>Ingresa el código que te compartieron.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/home')}>
            Volver
          </button>
        </div>

        <div className="card">
          <form className="form" onSubmit={unirse}>
            <div className="form-group">
              <label>Código de invitación</label>
              <input
                type="text"
                value={codigo}
                placeholder="Ej. ABC123"
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                required
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={cargando}>
              {cargando ? 'Uniendo...' : 'Unirme'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}