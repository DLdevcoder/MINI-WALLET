import { useState, useEffect } from 'react';
import { Search, Eye, Filter, X, CheckCircle, XCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import './Trails.css';

const STATUS_CONFIG = {
  pending: { label: 'Đang xử lý', color: '#fbbf24', Icon: Clock },
  inProgress: { label: 'Đang ghi sổ', color: '#60a5fa', Icon: Clock },
  done: { label: 'Thành công', color: '#34d399', Icon: CheckCircle },
  failed: { label: 'Thất bại', color: '#f87171', Icon: XCircle },
  refund_pending: { label: 'Chờ hoàn tiền', color: '#f97316', Icon: AlertCircle },
  init: { label: 'Khởi tạo', color: '#94a3b8', Icon: Clock },
};

const formatMoney = (n) => n != null ? new Intl.NumberFormat('vi-VN').format(n) + ' ₫' : '—';

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.init;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}50`, padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.78rem', fontWeight: 600 }}>
      <cfg.Icon size={12} /> {cfg.label}
    </span>
  );
}

function TrailDetailModal({ trail, onClose }) {
  const body = trail.inputMessage || {};
  const trans = body.transBody || {};
  const serviceCode = body.serviceCode || 'N/A';
  const amount = trans.AMOUNT || trans.amount || '—';
  const fee = body.fee ?? '—';
  const receiverPhone = trans.RECEIVERPHONE || trans.receiverPhone || '—';
  const billCode = trans.BILLCODE || trans.billCode || null;

  const steps = [
    { key: 'Request', label: 'Bước 1 — Request', desc: 'Dựng dữ liệu, validate, tính phí', done: true },
    { key: 'Confirm', label: 'Bước 2 — Confirm', desc: 'Xác thực (PIN / NONE)', done: trail.status !== 'pending' && trail.status !== 'init' },
    { key: 'Verify', label: 'Bước 3 — Verify', desc: 'Ghi sổ kép, đổi số dư', done: trail.status === 'done' || trail.status === 'refund_pending' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" style={{ maxWidth: 680, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Chi tiết giao dịch</h3>
          <button className="close-btn" onClick={onClose}><X size={22} /></button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="detail-card">
              <div className="detail-label">Mã RefID</div>
              <div className="detail-val mono">{trail.transRefId}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Dịch vụ</div>
              <div className="detail-val">{serviceCode}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Trạng thái</div>
              <div className="detail-val"><StatusBadge status={trail.status} /></div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Số tiền</div>
              <div className="detail-val" style={{ color: '#fbbf24', fontWeight: 700 }}>{formatMoney(amount)}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Phí</div>
              <div className="detail-val" style={{ color: '#94a3b8' }}>{formatMoney(fee)}</div>
            </div>
            {receiverPhone !== '—' && (
              <div className="detail-card">
                <div className="detail-label">Số ĐT người nhận</div>
                <div className="detail-val mono">{receiverPhone}</div>
              </div>
            )}
            {billCode && (
              <div className="detail-card">
                <div className="detail-label">Mã hoá đơn</div>
                <div className="detail-val mono">{billCode}</div>
              </div>
            )}
            <div className="detail-card">
              <div className="detail-label">Thời gian tạo</div>
              <div className="detail-val">{new Date(trail.createdAt).toLocaleString('vi-VN')}</div>
            </div>
          </div>

          {/* Timeline 3 steps */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiến trình xử lý</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              {steps.map((s, i) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ flex: 1, background: s.done ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${s.done ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
                    {s.done ? <CheckCircle size={18} style={{ color: '#34d399', marginBottom: '0.3rem' }} /> : <Clock size={18} style={{ color: '#94a3b8', marginBottom: '0.3rem' }} />}
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: s.done ? '#34d399' : '#94a3b8' }}>{s.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.desc}</div>
                  </div>
                  {i < steps.length - 1 && <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, margin: '0 0.25rem' }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Raw JSON toggle */}
          <details style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Xem dữ liệu kỹ thuật (JSON)</summary>
            <pre style={{ fontSize: '0.75rem', color: '#a5b4fc', marginTop: '0.75rem', overflow: 'auto', maxHeight: 300 }}>{JSON.stringify(trail, null, 2)}</pre>
          </details>

        </div>
      </div>
    </div>
  );
}

export default function Trails() {
  const [trails, setTrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchRef, setSearchRef] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const limit = 15;

  const fetchTrails = () => {
    setLoading(true);
    const payload = { page, limit };
    if (searchRef) payload.transRefId = searchRef;
    if (statusFilter) payload.status = statusFilter;

    fetch('http://localhost:1337/admin/trails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.err === 200) {
          setTrails(data.data.records);
          setTotal(data.data.total);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTrails(); }, [page, statusFilter]);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') { setPage(1); fetchTrails(); }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="trails-page fade-in">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Transaction Trails</h1>
          <p className="page-subtitle">Nhật ký toàn bộ giao dịch</p>
        </div>
      </div>

      <div className="controls-row">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo Mã RefID..."
            className="search-input"
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            onKeyPress={handleSearchKeyPress}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
          <select className="status-filter" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Đang chờ (pending)</option>
            <option value="inProgress">Đang ghi sổ</option>
            <option value="done">Thành công (done)</option>
            <option value="failed">Thất bại (failed)</option>
            <option value="refund_pending">Chờ hoàn tiền</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="trails-table">
            <thead>
              <tr>
                <th>Thời Gian</th>
                <th>Mã RefID</th>
                <th>Dịch Vụ</th>
                <th>Số Tiền</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</td></tr>
              ) : trails.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">Không tìm thấy nhật ký nào.</td></tr>
              ) : trails.map((trail) => {
                const serviceCode = trail.inputMessage?.serviceCode || 'UNKNOWN';
                const amount = trail.inputMessage?.transBody?.AMOUNT || trail.inputMessage?.transBody?.amount;
                const cfg = STATUS_CONFIG[trail.status] || STATUS_CONFIG.init;
                return (
                  <tr key={trail.id}>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {new Date(trail.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: '#a5b4fc', fontSize: '0.82rem' }}>
                      {trail.transRefId}
                    </td>
                    <td>
                      <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '0.15rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.82rem', fontWeight: 600 }}>
                        {serviceCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#fbbf24' }}>
                      {amount != null ? formatMoney(amount) : '—'}
                    </td>
                    <td><StatusBadge status={trail.status} /></td>
                    <td>
                      <button className="btn-view" onClick={() => setSelectedTrail(trail)}>
                        <Eye size={15} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="page-info">{trails.length} / {total} dòng</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Sau</button>
          </div>
        </div>
      </div>

      {selectedTrail && <TrailDetailModal trail={selectedTrail} onClose={() => setSelectedTrail(null)} />}
    </div>
  );
}
