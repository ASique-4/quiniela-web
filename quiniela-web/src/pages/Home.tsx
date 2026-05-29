import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function Home() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarPerfil();
  }, []);

  async function cargarPerfil() {
    setCargando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('perfiles')
      .select('nombre, rol')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      alert(error.message);
      setCargando(false);
      return;
    }

    setNombre(data?.nombre || 'Usuario');
    setRol(data?.rol || 'jugador');
    setCargando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  if (cargando) {
    return (
      <div className="page">
        <div className="container">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <div>
            <h1>Quiniela Web</h1>
            <p>Bienvenido, {nombre}</p>
          </div>

          <div className="actions">
            <span className={rol === 'admin' ? 'badge badge-admin' : 'badge badge-user'}>
              {rol}
            </span>
            <button className="btn btn-secondary" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid grid-3">
          <div className="menu-card">
            <h3>Mis quinielas</h3>
            <p>Consulta tus grupos, puntos y partidos disponibles.</p>
            <button className="btn btn-primary" onClick={() => navigate('/mis-quinielas')}>
              Ver mis quinielas
            </button>
          </div>

          <div className="menu-card">
            <h3>Crear quiniela</h3>
            <p>Crea un grupo nuevo y comparte el código con tus amigos.</p>
            <button className="btn btn-primary" onClick={() => navigate('/crear-quiniela')}>
              Crear
            </button>
          </div>

          <div className="menu-card">
            <h3>Unirme con código</h3>
            <p>Ingresa el código de invitación de una quiniela existente.</p>
            <button className="btn btn-primary" onClick={() => navigate('/unirse-quiniela')}>
              Unirme
            </button>
          </div>

          {rol === 'admin' && (
            <div className="menu-card">
              <h3>Panel Admin</h3>
              <p>Administra torneos, equipos, partidos y resultados.</p>
              <button className="btn btn-dark" onClick={() => navigate('/admin')}>
                Entrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}