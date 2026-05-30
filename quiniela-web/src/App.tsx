import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CrearQuiniela from './pages/CrearQuiniela';
import UnirseQuiniela from './pages/UnirseQuiniela';
import MisQuinielas from './pages/MisQuinielas';
import Partidos from './pages/Partidos';
import Admin from './pages/Admin';
import Ranking from './pages/Ranking';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        <Route path="/home" element={<Home />} />

        <Route path="/crear-quiniela" element={<CrearQuiniela />} />
        <Route path="/unirse-quiniela" element={<UnirseQuiniela />} />
        <Route path="/mis-quinielas" element={<MisQuinielas />} />

        <Route path="/quiniela/:id/partidos" element={<Partidos />} />
        <Route path="/quiniela/:id/ranking" element={<Ranking />} />

        <Route path="/admin" element={<Admin />} />
      </Routes>
    </HashRouter>
  );
}

export default App;