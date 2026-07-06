import { useState, useEffect } from 'react';
import { Plus, Power, Settings, MoreVertical, ShieldCheck, Activity, X } from 'lucide-react';
import './Services.css';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newService, setNewService] = useState({ name: '', code: '', authMethod: 'NONE' });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = () => {
    setLoading(true);
    fetch('/admin/services/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.err === 200) {
        setServices(data.data || []);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleCreateService = () => {
    if (!newService.name || !newService.code) {
      alert("Vui lòng điền đủ Tên và Mã Dịch Vụ!");
      return;
    }
    
    setCreateLoading(true);
    fetch('/admin/services/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify(newService)
    })
    .then(res => res.json())
    .then(data => {
      if (data.err !== 200) {
        alert(data.message || 'Có lỗi xảy ra');
      } else {
        setShowModal(false);
        setNewService({ name: '', code: '', authMethod: 'NONE' });
        fetchServices(); // Refresh list
      }
      setCreateLoading(false);
    })
    .catch(err => {
      console.error(err);
      alert('Lỗi kết nối');
      setCreateLoading(false);
    });
  };

  const toggleStatus = (id) => {
    fetch('/admin/services/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ serviceId: id })
    })
    .then(res => res.json())
    .then(data => {
      if (data.err === 200) {
        // Update local state directly to reflect DB
        setServices(services.map(s => {
          if (s.id === id) {
            return { ...s, status: data.data.status };
          }
          return s;
        }));
      }
    })
    .catch(err => console.error(err));
  };

  return (
    <div className="services-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Quản lý Services</h2>
          <p className="page-desc">Nơi khởi tạo và cấu hình các loại giao dịch của hệ thống (Config-Driven)</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          <span>Tạo Dịch Vụ Mới</span>
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card glass-card">
          <div className="stat-icon bg-blue"><Activity size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng số dịch vụ</span>
            <span className="stat-value">{services.length}</span>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon bg-green"><ShieldCheck size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Đang hoạt động</span>
            <span className="stat-value">{services.filter(s => s.status === 'active').length}</span>
          </div>
        </div>
      </div>

      <div className="table-container glass-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>MÃ (CODE)</th>
              <th>TÊN DỊCH VỤ</th>
              <th>BẢO MẬT (AUTH)</th>
              <th>TRẠNG THÁI</th>
              <th className="text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center" style={{padding: '2rem'}}>Đang tải dữ liệu...</td></tr>
            ) : services.map(service => (
              <tr key={service.id}>
                <td className="text-muted">#{service.id}</td>
                <td><span className="badge badge-code">{service.code}</span></td>
                <td className="font-medium">{service.name}</td>
                <td>
                  <span className="badge badge-gray">{service.auth?.method || 'NONE'}</span>
                </td>
                <td>
                  <div className={`status-badge ${service.status}`}>
                    <span className="status-dot"></span>
                    {service.status === 'active' ? 'Hoạt động' : 'Đang tắt'}
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className={`toggle-btn ${service.status === 'active' ? 'on' : 'off'}`}
                      onClick={() => toggleStatus(service.id)}
                      title={service.status === 'active' ? 'Tắt dịch vụ' : 'Bật dịch vụ'}
                    >
                      <div className="toggle-slider"></div>
                    </button>
                    <button 
                      className="icon-btn-sm" 
                      title="Cấu hình luồng (Transaction Design)"
                      onClick={() => window.location.href = `/dashboard/services/${service.id}/design`}
                    >
                      <Settings size={18} />
                    </button>
                    <button className="icon-btn-sm" title="Tuỳ chọn khác">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!loading && services.length === 0) && (
              <tr><td colSpan="6" className="text-center" style={{padding: '2rem'}}>Chưa có dịch vụ nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL TẠO DỊCH VỤ */}
      {showModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Tạo Dịch Vụ Mới</h3>
              <button className="icon-btn-sm" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">Khởi tạo một nghiệp vụ mới. Sau khi tạo, bạn cần vào phần Cấu hình luồng (Transaction Design) để thiết lập chi tiết.</p>
              
              <div className="form-group">
                <label>Tên Dịch Vụ (Hiển thị cho User)</label>
                <input 
                  type="text" 
                  className="form-input w-full" 
                  placeholder="VD: Nạp tiền từ thẻ ATM"
                  value={newService.name}
                  onChange={(e) => setNewService({...newService, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Mã Nghiệp Vụ (Service Code)</label>
                <input 
                  type="text" 
                  className="form-input w-full" 
                  placeholder="VD: CASH_IN_ATM"
                  value={newService.code}
                  onChange={(e) => setNewService({...newService, code: e.target.value.toUpperCase()})}
                />
                <span className="input-hint">Mã viết hoa, không dấu, không khoảng trắng.</span>
              </div>

              <div className="form-group">
                <label>Yêu cầu Xác thực (Auth Method)</label>
                <select 
                  className="form-input w-full"
                  value={newService.authMethod}
                  onChange={(e) => setNewService({...newService, authMethod: e.target.value})}
                >
                  <option value="NONE">Không yêu cầu (NONE) - Dành cho Officer</option>
                  <option value="PIN">Yêu cầu mã PIN - Dành cho Khách hàng</option>
                  <option value="OTP">Yêu cầu OTP (Tương lai)</option>
                </select>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Huỷ bỏ</button>
              <button className="btn btn-primary" onClick={handleCreateService} disabled={createLoading}>
                {createLoading ? 'Đang tạo...' : 'Tạo Dịch Vụ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
