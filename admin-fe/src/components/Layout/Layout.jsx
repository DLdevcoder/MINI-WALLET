import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings2, 
  Users, 
  CreditCard, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  ChevronDown,
  Wallet,
  Activity,
  Store
} from 'lucide-react';
import './Layout.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { path: '/dashboard/services', label: 'Quản lý Services', icon: Settings2 },
    { path: '/dashboard/pockets', label: 'Quản lý Ví', icon: Wallet },
    { path: '/dashboard/customers', label: 'Khách hàng', icon: Users },
    { path: '/dashboard/trails', label: 'Tra cứu GD (Trails)', icon: Activity },
    { path: '/dashboard/transactions', label: 'Biên lai (History)', icon: CreditCard },
    { path: '/dashboard/billers', label: 'Đối tác (Billers)', icon: Store }
  ];

  const currentPathName = navItems.find(item => location.pathname.startsWith(item.path))?.label || 'Bảng điều khiển';

  return (
    <div className="layout-wrapper">
      {/* Sidebar Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">M</div>
            <span className="logo-text">MiniWallet</span>
          </div>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive || (location.pathname === item.path) ? 'active' : ''}`}
              end={item.path === '/dashboard'}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar glass-card">
          <div className="topbar-left">
            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 className="page-title">{currentPathName}</h1>
          </div>

          <div className="topbar-right">
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input type="text" placeholder="Tìm kiếm..." className="search-input" />
            </div>
            <button className="icon-btn">
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>
            <div className="user-profile">
              <div className="avatar">A</div>
              <span className="user-name">Admin</span>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
