import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Services from './pages/Services/Services';
import TransactionDesign from './pages/TransactionDesign/TransactionDesign';
import Layout from './components/Layout/Layout';
import './App.css';

// Component bảo vệ Route: Nếu chưa có token thì đẩy về login
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Nhóm các route Dashboard nằm trong Layout */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<div style={{ color: 'white', padding: '2rem' }}>Chào mừng bạn đến với Admin Dashboard</div>} />
          <Route path="services" element={<Services />} />
          <Route path="services/:id/design" element={<TransactionDesign />} />
          <Route path="customers" element={<div style={{ color: 'white' }}>Customer Management Page (Sắp ra mắt)</div>} />
          <Route path="transactions" element={<div style={{ color: 'white' }}>Transaction Management Page (Sắp ra mắt)</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
