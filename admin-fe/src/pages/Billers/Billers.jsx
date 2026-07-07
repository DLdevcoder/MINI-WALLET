import { useState, useEffect } from 'react';
import { Search, Plus, Store, Link as LinkIcon, Settings, X, Power } from 'lucide-react';
import './Billers.css';

export default function Billers() {
  const [billers, setBillers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBillerId, setEditingBillerId] = useState(null);
  const [billerForm, setBillerForm] = useState({
    billerCode: '',
    name: '',
    inquiryUrl: 'http://localhost:1337/mock/evn/inquiry',
    paymentUrl: 'http://localhost:1337/mock/evn/payment',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBillers();
  }, []);

  const fetchBillers = () => {
    setLoading(true);
    fetch('http://localhost:1337/admin/billers/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ page: 1, limit: 50 })
    })
      .then(res => res.json())
      .then(data => {
        if (data.err === 200) {
          setBillers(data.data.records);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const openCreateModal = () => {
    setEditingBillerId(null);
    setBillerForm({
      billerCode: '',
      name: '',
      inquiryUrl: 'http://localhost:1337/mock/evn/inquiry',
      paymentUrl: 'http://localhost:1337/mock/evn/payment',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (biller) => {
    setEditingBillerId(biller.id);
    setBillerForm({
      billerCode: biller.billerCode,
      name: biller.name,
      inquiryUrl: biller.inquiryUrl || '',
      paymentUrl: biller.paymentUrl || '',
      status: biller.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!billerForm.billerCode || !billerForm.name) {
      alert("Vui lòng điền đủ Mã đối tác và Tên đối tác!");
      return;
    }

    setIsSubmitting(true);
    const endpoint = editingBillerId ? '/admin/billers/update' : '/admin/billers/create';
    const payload = editingBillerId ? { ...billerForm, id: editingBillerId } : billerForm;

    fetch(`http://localhost:1337${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.err !== 200) {
          alert(data.message || 'Có lỗi xảy ra');
        } else {
          setShowModal(false);
          fetchBillers();
        }
      })
      .catch(err => {
        console.error(err);
        alert('Lỗi kết nối');
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="billers-page fade-in">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Quản Lý Biller</h1>
          <p className="page-subtitle">Quản lý các nhà cung cấp dịch vụ</p>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Thêm Đối Tác
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="billers-table">
            <thead>
              <tr>
                <th>Mã Đối Tác</th>
                <th>Tên Đối Tác</th>
                <th>API Liên Kết</th>
                <th>Ví Chứa Tiền (ID)</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td>
                </tr>
              ) : billers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Chưa có đối tác nào.
                  </td>
                </tr>
              ) : billers.map((biller) => {
                const pocketId = biller.pocket?.id || 'Chưa tạo';
                const pocketBal = biller.pocket?.balance || 0;

                return (
                  <tr key={biller.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: '#a5b4fc' }}>
                      {biller.billerCode}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {biller.name}
                      </div>
                    </td>
                    <td>
                      <div className="api-links">
                        {biller.inquiryUrl ? <div className="api-link-item"><LinkIcon size={12} /> Vấn tin</div> : ''}
                        {biller.paymentUrl ? <div className="api-link-item success"><LinkIcon size={12} /> Thanh toán</div> : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>Ví ID: <span style={{ fontFamily: 'monospace' }}>#{pocketId}</span></div>
                      <div style={{ fontSize: '0.8rem', color: '#34d399' }}>Số dư: {new Intl.NumberFormat('vi-VN').format(pocketBal)} đ</div>
                    </td>
                    <td>
                      <span className={`badge ${biller.status === 'active' ? 'active' : 'inactive'}`}>
                        {biller.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-btn-sm"
                        title="Sửa thông tin"
                        onClick={() => openEditModal(biller)}
                      >
                        <Settings size={18} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>{editingBillerId ? 'Sửa Thông Tin Biller' : 'Thêm Biller Mới'}</h3>
              <button className="icon-btn-sm" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">

              <div className="form-group">
                <label>Tên Đối Tác (Biller Name)</label>
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="VD: Điện lực EVN Miền Bắc"
                  value={billerForm.name}
                  onChange={(e) => setBillerForm({ ...billerForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Mã Đối Tác (Biller Code)</label>
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="VD: BILLER_EVN"
                  value={billerForm.billerCode}
                  onChange={(e) => setBillerForm({ ...billerForm, billerCode: e.target.value.toUpperCase() })}
                  disabled={editingBillerId !== null}
                />
                <span className="input-hint">Viết hoa, không dấu. {editingBillerId ? 'Không thể đổi mã sau khi tạo.' : 'Hệ thống sẽ tự tạo 1 Ví (Pocket) dùng chung mã này.'}</span>
              </div>

              <div className="form-group">
                <label>API Vấn tin Hóa đơn (Inquiry URL)</label>
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="Nhập đường dẫn API"
                  value={billerForm.inquiryUrl}
                  onChange={(e) => setBillerForm({ ...billerForm, inquiryUrl: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>API Gạch nợ (Payment URL)</label>
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="Nhập đường dẫn API"
                  value={billerForm.paymentUrl}
                  onChange={(e) => setBillerForm({ ...billerForm, paymentUrl: e.target.value })}
                />
              </div>

              {editingBillerId && (
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select
                    className="form-input w-full"
                    value={billerForm.status}
                    onChange={(e) => setBillerForm({ ...billerForm, status: e.target.value })}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Đã khóa</option>
                  </select>
                </div>
              )}

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Huỷ bỏ</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : (editingBillerId ? 'Cập Nhật' : 'Tạo Biller')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
