import { useState } from 'react';
import { Plus, Power, Settings, MoreVertical, ShieldCheck, Activity } from 'lucide-react';
import './Services.css';

export default function Services() {
  const [services, setServices] = useState([
    { id: 1, code: 'CASH_IN', name: 'Nạp tiền vào ví', status: 'active', fee: 'Miễn phí' },
    { id: 2, code: 'P2P_TRANSFER', name: 'Chuyển tiền ví - ví', status: 'active', fee: '1% (Max 50K)' },
    { id: 3, code: 'BILL_PAYMENT', name: 'Thanh toán hoá đơn', status: 'active', fee: '2,000 VND' },
    { id: 4, code: 'CASH_OUT', name: 'Rút tiền', status: 'inactive', fee: '5,000 VND' },
  ]);

  const toggleStatus = (id) => {
    setServices(services.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'active' ? 'inactive' : 'active' };
      }
      return s;
    }));
  };

  return (
    <div className="services-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Quản lý Dịch vụ (Services)</h2>
          <p className="page-desc">Quản lý và cấu hình các nghiệp vụ giao dịch trên hệ thống</p>
        </div>
        <button className="btn btn-primary create-btn">
          <Plus size={18} />
          Tạo dịch vụ mới
        </button>
      </div>

      <div className="glass-card table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã Dịch Vụ</th>
              <th>Tên Dịch Vụ</th>
              <th>Cấu hình Phí</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  <div className="service-code">
                    <ShieldCheck size={16} className="text-accent" />
                    {service.code}
                  </div>
                </td>
                <td className="font-medium">{service.name}</td>
                <td>
                  <span className="fee-badge">{service.fee}</span>
                </td>
                <td>
                  <div className={`status-badge ${service.status}`}>
                    {service.status === 'active' ? (
                      <><Activity size={14} /> Hoạt động</>
                    ) : (
                      <><Power size={14} /> Tạm dừng</>
                    )}
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
                    <button className="icon-btn-sm" title="Cấu hình luồng (Transaction Design)">
                      <Settings size={18} />
                    </button>
                    <button className="icon-btn-sm" title="Tuỳ chọn khác">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
