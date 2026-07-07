import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import './Transactions.css';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const fetchTransactions = () => {
    setLoading(true);

    fetch('http://localhost:1337/admin/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ page, limit })
    })
      .then(res => res.json())
      .then(data => {
        if (data.err === 200) {
          setTransactions(data.data.records);
          setTotal(data.data.total);
        } else {
          console.error(data.message);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="transactions-page fade-in">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Lịch sử giao dịch</h1>
          <p className="page-subtitle">Danh sách các giao dịch đã xử lý thành công và chốt số dư</p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Thời Gian</th>
                <th>Mã GD (Code)</th>
                <th>Dịch Vụ</th>
                <th>Luồng Giao Dịch</th>
                <th>Số Tiền (Gốc / Phí)</th>
                <th>Tổng Cộng</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    Chưa có giao dịch thành công nào.
                  </td>
                </tr>
              ) : transactions.map((tx) => {
                const serviceCode = tx.service?.code || 'UNKNOWN';

                return (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {tx.code}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 500 }}>{serviceCode}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="wallet-badge" title="Ví Người Gửi">{tx.sender}</span>
                        <ArrowRight size={14} style={{ color: 'var(--text-secondary)' }} />
                        <span className="wallet-badge" title="Ví Người Nhận">{tx.receiver}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span className="amount-text">{formatCurrency(tx.amount)}</span>
                        <span className="amount-text fee" style={{ fontSize: '0.8rem' }}>+ Phí: {formatCurrency(tx.fee)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="amount-text total">{formatCurrency(tx.totalAmount)}</span>
                    </td>
                    <td>
                      <span className={`badge ${tx.status || 'done'}`}>
                        {tx.status === 'done' ? <><CheckCircle2 size={12} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} /> THÀNH CÔNG</> : <><XCircle size={12} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} /> THẤT BẠI</>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="page-info">Hiển thị {transactions.length} trên tổng số {total} giao dịch</span>
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
