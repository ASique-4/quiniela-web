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

    if (!data) {
      setNombre('Usuario');
      setRol('jugador');
      setCargando(false);
      return;
    }

    setNombre(data.nombre);
    setRol(data.rol);
    setCargando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  if (cargando) {
    return <p>Cargando...</p>;
  }

  return (
    <div>
      <h1>Quiniela Web</h1>

      <p>Bienvenido, {nombre}</p>
      <p>Rol: {rol}</p>

      <button onClick={cerrarSesion}>Cerrar sesión</button>

      <hr />

      <h2>Menú</h2>

      <div>
        <button onClick={() => navigate('/mis-quinielas')}>
          Mis quinielas
        </button>

        <button onClick={() => navigate('/crear-quiniela')}>
          Crear quiniela
        </button>

        <button onClick={() => navigate('/unirse-quiniela')}>
          Unirme con código
        </button>

        {rol === 'admin' && (
          <button onClick={() => navigate('/admin')}>
            Panel Admin
          </button>
        )}
      </div>
    </div>
  );
}