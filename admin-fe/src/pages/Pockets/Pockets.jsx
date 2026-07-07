import { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, Wallet } from 'lucide-react';
import './Pockets.css';

export default function Pockets() {
  const [pockets, setPockets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedPocket, setSelectedPocket] = useState(null);

  // Forms state
  const [createForm, setCreateForm] = useState({ pocketId: '', clientType: 'system', currency: 'VND' });
  const [topupAmount, setTopupAmount] = useState('');

  useEffect(() => {
    fetchPockets();
  }, [filterType]);

  const fetchPockets = () => {
    setLoading(true);
    fetch('/admin/pockets/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ clientType: filterType })
    })
      .then(res => res.json())
      .then(data => {
        if (data.err === 200) {
          setPockets(data.data.data || []);
        } else {
          console.error(data.message);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleCreatePocket = (e) => {
    e.preventDefault();
    fetch('/admin/pockets/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify(createForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.err === 200) {
          alert('Tạo ví thành công');
          setShowCreateModal(false);
          setCreateForm({ pocketId: '', clientType: 'system', currency: 'VND' });
          fetchPockets();
        } else {
          alert('Lỗi: ' + data.message);
        }
      });
  };

  const handleTopup = (e) => {
    e.preventDefault();
    fetch('/admin/pockets/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ pocketId: selectedPocket.user, amount: Number(topupAmount) })
    })
      .then(res => res.json())
      .then(data => {
        if (data.err === 200) {
          alert('Nạp tiền thành công');
          setShowTopupModal(false);
          setTopupAmount('');
          fetchPockets();
        } else {
          alert('Lỗi: ' + data.message);
        }
      });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="pockets-page fade-in">
      <div className="page-header">
        <div className="header-left">
          <h2 className="page-title">Quản lý ví</h2>
          <p className="page-desc">Quản lý các ví của hệ thống</p>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Thêm Ví Mới
          </button>
        </div>
      </div>

      <div className="filter-bar glass-card">
        <select
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tất cả các loại ví</option>
          <option value="system">Ví Hệ Thống (System)</option>
          <option value="bank">Ví Ngân Hàng (Bank)</option>
          <option value="biller">Ví Đối Tác (Biller)</option>
          <option value="customer">Ví Khách Hàng (Customer)</option>
        </select>

        <div style={{ flex: 1 }}></div>

        <div className="search-bar" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Tìm theo ID ví..." className="search-input" />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách ví...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Ví (ID)</th>
                <th>Phân loại</th>
                <th>Số dư</th>
                <th>Toàn vẹn dữ liệu</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pockets.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Không tìm thấy ví nào.</td>
                </tr>
              ) : pockets.map((pocket) => (
                <tr key={pocket.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Wallet size={16} style={{ color: 'var(--text-secondary)' }} />
                      {pocket.user}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${pocket.client}`}>
                      {pocket.client}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#fbbf24' }}>
                    {formatMoney(pocket.balance)}
                  </td>
                  <td>
                    {pocket.isIntegrityValid ? (
                      <span className="badge success">Hợp lệ</span>
                    ) : (
                      <span className="badge danger">Lỗi Checksum</span>
                    )}
                  </td>
                  <td>
                    {['bank', 'system'].includes(pocket.client) && (
                      <button
                        className="btn-topup"
                        onClick={() => {
                          setSelectedPocket(pocket);
                          setShowTopupModal(true);
                        }}
                      >
                        <DollarSign size={14} /> Nạp Tiền Nhanh
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL THÊM VÍ */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card fade-in">
            <h3 className="modal-title">Tạo Ví Mới</h3>
            <form onSubmit={handleCreatePocket}>
              <div className="form-group">
                <label>Mã ví (ID viết liền, in hoa)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: BANK_POCKET_02"
                  value={createForm.pocketId}
                  onChange={(e) => setCreateForm({ ...createForm, pocketId: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phân loại ví</label>
                <select
                  className="form-control"
                  value={createForm.clientType}
                  onChange={(e) => setCreateForm({ ...createForm, clientType: e.target.value })}
                >
                  <option value="system">Ví Hệ Thống (System)</option>
                  <option value="bank">Ví Ngân Hàng (Bank)</option>
                </select>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  * Lưu ý: Ví Customer và Biller sẽ tự động sinh khi tạo tài khoản, không tạo thủ công ở đây.
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">Tạo mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NẠP TIỀN */}
      {showTopupModal && selectedPocket && (
        <div className="modal-overlay">
          <div className="modal-card fade-in">
            <h3 className="modal-title">Nạp Tiền Nhanh</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Đang nạp tiền trực tiếp vào ví <b>{selectedPocket.user}</b> ({selectedPocket.client}).
              Thao tác này sẽ tự động cập nhật Checksum.
            </p>
            <form onSubmit={handleTopup}>
              <div className="form-group">
                <label>Số tiền nạp thêm (VND)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="VD: 1000000"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => {
                  setShowTopupModal(false);
                  setTopupAmount('');
                }}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">Xác nhận Nạp</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
