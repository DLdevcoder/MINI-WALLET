import { useState, useEffect } from 'react';
import { Search, Eye, Filter, X } from 'lucide-react';
import './Trails.css';

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
        } else {
          console.error(data.message);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrails();
  }, [page, statusFilter]);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchTrails();
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="trails-page fade-in">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Tra Cứu Giao Dịch</h1>
          <p className="page-subtitle">Nhật ký chi tiết các giao dịch đang diễn ra, thành công và thất bại</p>
        </div>
      </div>

      <div className="controls-row">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo Mã giao dịch (RefID)..."
            className="search-input"
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            onKeyPress={handleSearchKeyPress}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
          <select
            className="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="init">Khởi tạo (init)</option>
            <option value="pending">Đang chờ (pending)</option>
            <option value="done">Thành công (done)</option>
            <option value="failed">Thất bại (failed)</option>
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
                <th>Input/Service</th>
                <th>Trạng Thái</th>
                <th>Lịch sử (Steps)</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td>
                </tr>
              ) : trails.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Không tìm thấy nhật ký giao dịch nào.
                  </td>
                </tr>
              ) : trails.map((trail) => {
                const serviceCode = trail.inputMessage?.serviceCode || 'UNKNOWN';
                const stepCount = trail.transStepLog ? trail.transStepLog.length : 0;

                return (
                  <tr key={trail.id}>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(trail.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: '#a5b4fc' }}>
                      {trail.transRefId}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dịch vụ:</div>
                      <div style={{ fontWeight: 500 }}>{serviceCode}</div>
                    </td>
                    <td>
                      <span className={`badge ${trail.status || 'init'}`}>
                        {trail.status || 'init'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {stepCount} bước đã ghi nhận
                    </td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => setSelectedTrail(trail)}
                        title="Xem chi tiết kỹ thuật"
                      >
                        <Eye size={16} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="page-info">Hiển thị {trails.length} trên tổng số {total} dòng</span>
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

      {/* JSON Viewer Modal */}
      {selectedTrail && (
        <div className="modal-overlay" onClick={() => setSelectedTrail(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết kỹ thuật (JSON) - {selectedTrail.transRefId}</h3>
              <button className="close-btn" onClick={() => setSelectedTrail(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <pre className="json-view">
                {JSON.stringify(selectedTrail, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
