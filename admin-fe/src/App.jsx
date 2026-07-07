import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Services from './pages/Services/Services';
import TransactionDesign from './pages/TransactionDesign/TransactionDesign';
import Pockets from './pages/Pockets/Pockets';
import Customers from './pages/Customers/Customers';
import Trails from './pages/Trails/Trails';
import Transactions from './pages/Transactions/Transactions';
import Billers from './pages/Billers/Billers';
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
          <Route path="pockets" element={<Pockets />} />
          <Route path="customers" element={<Customers />} />
          <Route path="trails" element={<Trails />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="billers" element={<Billers />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
