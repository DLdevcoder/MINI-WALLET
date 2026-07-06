import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Placeholder cho Dashboard */}
        <Route path="/dashboard" element={<div style={{ color: 'white', padding: '2rem' }}>Welcome to Admin Dashboard</div>} />
      </Routes>
    </Router>
  );
}

export default App;
