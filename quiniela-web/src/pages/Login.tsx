import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    navigate('/home');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Quiniela Web</h1>
        <p className="auth-subtitle">Inicia sesión para hacer tus pronósticos.</p>

        <form className="form" onSubmit={handleLogin}>
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
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit">
            Entrar
          </button>
        </form>

        <p style={{ marginTop: 20 }}>
          ¿No tienes cuenta?{' '}
          <Link className="link" to="/registro">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}