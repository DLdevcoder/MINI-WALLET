import { useState, useEffect } from 'react';
import { Search, Lock, Unlock, User, Wallet } from 'lucide-react';
import './Customers.css';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchCustomers = () => {
    setLoading(true);
    fetch('http://localhost:1337/admin/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ page, limit, phone: phoneSearch })
    })
      .then(res => res.json())
      .then(data => {
        if (data.err === 200) {
          setCustomers(data.data.records);
          setTotal(data.data.total);
        } else {
          console.error(data.message);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearch = (e) => {
    setPhoneSearch(e.target.value);
    setPage(1);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchCustomers();
    }
  };

  const toggleStatus = (customerId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'locked' : 'active';
    if (!window.confirm(`Bạn có chắc chắn muốn ${newStatus === 'locked' ? 'Khoá' : 'Mở khoá'} tài khoản này không?`)) return;

    fetch('http://localhost:1337/admin/customers/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ customerId, status: newStatus })
    })
      .then(res => res.json())
      .then(data => {
        if (data.err === 200) {
          fetchCustomers();
        } else {
          alert(`Lỗi: ${data.message}`);
        }
      })
      .catch(err => {
        console.error(err);
        alert('Lỗi hệ thống');
      });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="customers-page fade-in">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Quản lý Khách hàng</h1>
          <p className="page-subtitle">Danh sách người dùng và trạng thái tài khoản</p>
        </div>
      </div>

      <div className="controls-row">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo số điện thoại..."
            className="search-input"
            value={phoneSearch}
            onChange={handleSearch}
            onKeyPress={handleSearchKeyPress}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Số Điện Thoại</th>
                <th>Mã Ví (ID)</th>
                <th>Số Dư Ví</th>
                <th>Trạng Thái</th>
                <th>Ngày Tạo</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Không tìm thấy khách hàng nào.
                  </td>
                </tr>
              ) : customers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={16} style={{ color: 'var(--text-secondary)' }} />
                      {customer.phone}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Wallet size={16} style={{ color: 'var(--text-secondary)' }} />
                      {customer.pocketId}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#fbbf24' }}>
                    {formatCurrency(customer.balance)}
                  </td>
                  <td>
                    <span className={`badge ${customer.status || 'active'}`}>
                      {customer.status || 'active'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {new Date(customer.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    {customer.status === 'locked' ? (
                      <button 
                        className="btn-unlock"
                        onClick={() => toggleStatus(customer.id, customer.status)}
                        title="Mở khoá tài khoản"
                      >
                        <Unlock size={16} /> Mở khoá
                      </button>
                    ) : (
                      <button 
                        className="btn-lock"
                        onClick={() => toggleStatus(customer.id, 'active')}
                        title="Khoá tài khoản"
                      >
                        <Lock size={16} /> Khoá
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="page-info">Hiển thị {customers.length} trên tổng số {total} khách hàng</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="page-btn" 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </button>
            <button 
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
