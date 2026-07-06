import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound, User, Loader2, AlertCircle } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:1337/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.officer));
        navigate('/dashboard');
      } else {
        setErrorMsg(data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
      }
    } catch (err) {
      setErrorMsg('Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-logo">
            <Shield size={32} color="var(--accent)" />
          </div>
          <h2>MiniWallet Admin</h2>
          <p>Đăng nhập để vào hệ thống quản trị</p>
        </div>

        {errorMsg && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="form-input with-icon"
                placeholder="Nhập username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div className="input-wrapper">
              <KeyRound size={18} className="input-icon" />
              <input
                type="password"
                className="form-input with-icon"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block login-btn"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={18} className="spinner" /> : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
