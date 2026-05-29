import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function Register() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
        },
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Usuario registrado correctamente');
    navigate('/login');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Regístrate para participar en quinielas.</p>

        <form className="form" onSubmit={handleRegister}>
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              placeholder="Tu nombre"
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Correo</label>
            <input
              type="email"
              value={email}
              placeholder="tu@email.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              placeholder="Mínimo 6 caracteres"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit">
            Registrarme
          </button>
        </form>

        <p style={{ marginTop: 20 }}>
          ¿Ya tienes cuenta?{' '}
          <Link className="link" to="/login">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}