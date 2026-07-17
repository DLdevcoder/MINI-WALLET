import { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Plus,
  Database, ShieldAlert, BadgeDollarSign,
  BookOpenCheck, Settings2, FileCode2,
  Trash2, CheckCircle2, ArrowRight, Info
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import './TransactionDesign.css';

// Các field input thường dùng cho khách nhập
const PREDEFINED_INPUT_FIELDS = [
  { value: 'AMOUNT', label: 'Số tiền giao dịch', format: 'number', regex: '^[0-9]+$', note: 'Số tiền khách nhập (VD: 50000)' },
  { value: 'RECEIVERPHONE', label: 'Số ĐT người nhận', format: 'string', regex: '^[0-9]{10}$', note: 'Số điện thoại 10 chữ số của người nhận' },
  { value: 'BILLCODE', label: 'Mã hoá đơn', format: 'string', regex: null, note: 'Mã hoá đơn để tra cứu với đối tác (Biller)' },
  { value: 'BILLERCODE', label: 'Mã đối tác (Biller)', format: 'string', regex: null, note: 'VD: EVN, VN-POST ...' },
  { value: 'DESCRIPTION', label: 'Nội dung chuyển tiền', format: 'string', regex: null, note: 'Nội dung mô tả giao dịch' },
];

// Các luật fieldBuilder thường dùng — khớp đúng format engine
const PRESET_BUILDERS = [
  {
    label: 'Tự động gán ID người gửi (từ JWT)',
    rule: { order: 0, name: 'SENDERID', rule: 'mapping', source: 'ctx.senderId' }
  },
  {
    label: 'Tra ví người nhận từ SĐT (P2P)',
    rule: { order: 0, name: 'RECEIVERID', rule: 'query', source: 'queryPocketByPhone' }
  },
  {
    label: 'Lấy thông tin Biller từ mã đối tác',
    rule: { order: 0, name: 'BILLERID', rule: 'query', source: 'queryBillerPocket' }
  },
  {
    label: 'Gán số điện thoại người nhận vào TRANSBODY',
    rule: { order: 0, name: 'RECEIVERPHONE', rule: 'mapping', source: 'body.receiverPhone' }
  },
  {
    label: 'Gán số tiền vào TRANSBODY',
    rule: { order: 0, name: 'AMOUNT', rule: 'mapping', source: 'body.amount' }
  },
];

const VALIDATION_PRESETS = [
  { value: 'balance_check', label: 'Kiểm tra đủ số dư', errorCode: 'ERR_INSUFFICIENT_BALANCE', note: 'Ví người gửi phải có đủ tiền (gốc + phí)' },
  { value: 'same_wallet', label: 'Không chuyển cho chính mình', errorCode: 'ERR_SAME_WALLET', note: 'Ví gửi và ví nhận phải khác nhau' },
  { value: 'min_amount', label: 'Số tiền tối thiểu', errorCode: 'ERR_MIN_AMOUNT', note: 'Giao dịch phải lớn hơn mức tối thiểu' },
];

// Regex presets thường dùng
const REGEX_PRESETS = [
  { value: '', label: 'Không kiểm tra (bỏ qua)' },
  { value: '^[0-9]{10}$', label: 'Số điện thoại 10 chữ số' },
  { value: '^[0-9]+$', label: 'Chỉ số nguyên dương' },
  { value: '^[0-9]{1,15}$', label: 'Số nguyên (tối đa 15 chữ số)' },
  { value: '^[a-zA-Z0-9_-]+$', label: 'Mã (chữ, số, gạch ngang/dưới)' },
  { value: '^.{1,200}$', label: 'Văn bản (1-200 ký tự)' },
  { value: '_OTHER_', label: 'Tự nhập biểu thức (Khác)' },
];

const RULE_LABELS = { mapping: 'Gán trực tiếp', query: 'Tra cứu DB', fixed: 'Giá trị cố định' };

export default function TransactionDesign() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('transField');
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');

  // States for each tab
  const [serviceInfo, setServiceInfo] = useState({});
  const [transFields, setTransFields] = useState([]);
  const [fieldBuilders, setFieldBuilders] = useState([]);
  const [transValidations, setTransValidations] = useState([]);
  const [feeConfig, setFeeConfig] = useState({ type: 'fixed', value: 0 });
  const [glSteps, setGlSteps] = useState([]);
  const [walletPockets, setWalletPockets] = useState([]); // System + Bank pockets

  useEffect(() => {
    fetchConfig();
  }, [id]);

  const fetchConfig = () => {
    setLoading(true);
    fetch('/admin/services/config/get', {
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
          const svc = data.data.service || {};
          setServiceInfo(svc);
          setTransFields(data.data.transFields || []);
          setTransValidations(data.data.transValidations || []);
          setWalletPockets(data.data.walletPockets || []);
          if (svc.fieldBuilder) setFieldBuilders(svc.fieldBuilder);
          if (svc.fee) setFeeConfig(svc.fee);
          if (data.data.transDefinition && data.data.transDefinition.glSteps) {
            setGlSteps(data.data.transDefinition.glSteps);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSave = () => {
    const payload = {
      serviceId: id,
      transFields,
      fieldBuilder: fieldBuilders.map((fb, i) => ({ ...fb, order: i + 1 })),
      transValidations,
      fee: feeConfig,
      glSteps: glSteps.map((s, i) => ({ ...s, order: i + 1 }))
    };

    fetch('/admin/services/config/save', {
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
          setSaveMsg('✅ Lưu cấu hình thành công!');
        } else {
          setSaveMsg('❌ Lỗi: ' + (data.message || 'Server lỗi'));
        }
        setTimeout(() => setSaveMsg(''), 3000);
      })
      .catch(() => setSaveMsg('❌ Lỗi kết nối'));
  };

  const tabs = [
    { id: 'transField', label: '1. Input người dùng', icon: FileCode2, desc: 'Khai báo dữ liệu khách nhập' },
    { id: 'fieldBuilder', label: '2. Nguồn dữ liệu ngầm', icon: Database, desc: 'Tra cứu & dựng TRANSBODY' },
    { id: 'transValidation', label: '3. Điều kiện chặn', icon: ShieldAlert, desc: 'Luật nghiệp vụ trước khi tiền chạy' },
    { id: 'fee', label: '4. Biểu phí', icon: BadgeDollarSign, desc: 'Cách tính phí giao dịch' },
    { id: 'transDefinition', label: '5. Luồng dòng tiền', icon: BookOpenCheck, desc: 'Ví nào trừ → ví nào cộng' },
  ];

  const addFieldBuilder = (preset) => {
    const newRule = { ...preset.rule, order: fieldBuilders.length + 1 };
    setFieldBuilders([...fieldBuilders, newRule]);
  };

  const updateBuilder = (idx, key, val) => {
    setFieldBuilders(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [key]: val };
      return updated;
    });
  };

  const addGlStep = () => {
    setGlSteps([...glSteps, {
      order: glSteps.length + 1,
      amount: 'AMOUNT',
      debitLevel: 'role',
      debitTarget: 'SENDERID',
      creditLevel: 'role',
      creditTarget: 'RECEIVERID',
      note: 'Chuyển tiền gốc'
    }]);
  };

  const updateGlStep = (idx, key, val) => {
    setGlSteps(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [key]: val };
      return updated;
    });
  };

  // Tất cả biến TRANSBODY hiện có (từ fieldBuilder)
  const transbodyVars = [...new Set(fieldBuilders.map(fb => fb.name).filter(Boolean))];

  if (loading) return <div style={{ padding: '2rem', color: 'white' }}>Đang tải cấu hình...</div>;

  return (
    <div className="tx-design-page fade-in">
      <div className="page-header">
        <div className="header-left" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="icon-btn-sm" onClick={() => navigate('/dashboard/services')} style={{ margin: 0 }}>
              <ArrowLeft size={20} />
            </button>
            <h2 className="page-title" style={{ margin: 0 }}>Transaction Design: <span style={{ color: '#a5b4fc' }}>{serviceInfo.name || 'Loading...'}</span> <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>({serviceInfo.code})</span></h2>
          </div>
          <p className="page-desc" style={{ margin: 0, paddingLeft: '2.75rem' }}>Thiết lập luồng nghiệp vụ</p>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveMsg && <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{saveMsg}</span>}
          <button className="btn btn-primary create-btn" onClick={handleSave}>
            <Save size={18} />
            Lưu Cấu Hình
          </button>
        </div>
      </div>

      <div className="tx-design-layout">
        {/* Sidebar tabs */}
        <div className="tx-sidebar glass-card">
          <div className="sidebar-title">
            <Settings2 size={18} />
            <span>5 Bước Cấu Hình</span>
          </div>
          <div className="tabs-container">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="tab-icon-wrapper">
                  <tab.icon size={16} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div>{tab.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{tab.desc}</div>
                </div>
                {activeTab === tab.id && <CheckCircle2 size={16} className="tab-check" />}
              </button>
            ))}
          </div>
        </div>

        <div className="tx-workspace glass-card">

          {/* ============ TAB 1: TransField ============ */}
          {activeTab === 'transField' && (
            <div className="workspace-section fade-in">
              <h3>1. Khai báo Input (Dữ liệu khách hàng nhập)</h3>
              {serviceInfo.baseTemplate === 'BATCH' ? (
                <div className="info-box warn-box" style={{ marginTop: '1rem' }}>
                  <ShieldAlert size={18} style={{ color: '#ef4444' }} />
                  <span style={{ color: '#fca5a5' }}><b>Bị khóa:</b> Dịch vụ Lô (BATCH) sử dụng định dạng payload cố định, không thể tùy chỉnh trường Input.</span>
                </div>
              ) : (
                <>
              <div className="info-box">
                <Info size={16} />
                <span>Khai báo những gì khách hàng cần nhập khi sử dụng dịch vụ. Engine sẽ validate các trường này trước khi xử lý.</span>
              </div>

              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Danh sách trường Input</h4>
                  <button className="btn-sm" onClick={() => setTransFields([...transFields, { fieldName: '', fieldFormat: 'string', isRequired: true, regex: '', _isCustomName: false }])}>
                    <Plus size={16} /> Thêm Trường
                  </button>
                </div>

                <div className="nocode-list">
                  {transFields.map((field, idx) => {
                    const preset = PREDEFINED_INPUT_FIELDS.find(f => f.value === field.fieldName);
                    // is custom name: either flagged or fieldName not empty and not in preset list
                    const isCustomName = field._isCustomName || (!preset && field.fieldName !== '');
                    // For regex: is it a known preset value or custom?
                    const regexPreset = REGEX_PRESETS.find(r => r.value === field.regex && r.value !== '_OTHER_');
                    const isCustomRegex = field.regex && !regexPreset;
                    return (
                      <div key={idx} className="nocode-item">
                        <div className="item-content">
                          <div className="input-group-grid">
                            <div style={{ flex: '2' }}>
                              <label>Tên biến (field)</label>
                              <select
                                className="form-input"
                                value={preset ? field.fieldName : (isCustomName || field._isCustomName ? '_OTHER_' : '')}
                                onChange={(e) => {
                                  const newFields = [...transFields];
                                  const val = e.target.value;
                                  if (val === '_OTHER_') {
                                    newFields[idx] = { ...newFields[idx], fieldName: 'MY_FIELD', _isCustomName: true };
                                  } else if (val === '') {
                                    newFields[idx] = { ...newFields[idx], fieldName: '', _isCustomName: false };
                                  } else {
                                    const p = PREDEFINED_INPUT_FIELDS.find(f => f.value === val);
                                    newFields[idx] = { ...newFields[idx], fieldName: val, fieldFormat: p?.format || 'string', regex: p?.regex || '', _isCustomName: false };
                                  }
                                  setTransFields(newFields);
                                }}
                              >
                                <option value="">-- Chọn loại dữ liệu --</option>
                                {PREDEFINED_INPUT_FIELDS.map(pf => <option key={pf.value} value={pf.value}>{pf.label} ({pf.value})</option>)}
                                <option value="_OTHER_">Khác (tự định nghĩa)</option>
                              </select>
                              {/* Text input for custom variable name */}
                              {isCustomName && (
                                <input type="text" className="form-input" style={{ marginTop: '0.4rem' }}
                                  value={field.fieldName || ''}
                                  placeholder="Nhập tên biến (in hoa, VD: MY_FIELD)"
                                  onChange={(e) => { const nf = [...transFields]; nf[idx].fieldName = e.target.value.toUpperCase(); nf[idx]._isCustomName = true; setTransFields(nf); }}
                                />
                              )}
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {preset ? preset.note : (isCustomName ? 'Tên biến sẽ được lưu vào TRANSBODY' : '')}
                              </span>
                            </div>
                            <div style={{ flex: '1' }}>
                              <label>Kiểu dữ liệu</label>
                              <select className="form-input" value={field.fieldFormat || 'string'}
                                onChange={(e) => { const nf = [...transFields]; nf[idx].fieldFormat = e.target.value; setTransFields(nf); }}
                              >
                                <option value="string">Chữ & Số</option>
                                <option value="number">Chỉ Số</option>
                              </select>
                            </div>
                            <div style={{ flex: '1.5' }}>
                              <label>Regex kiểm tra</label>
                              <select className="form-input"
                                value={isCustomRegex ? '_OTHER_' : (field.regex || '')}
                                onChange={(e) => {
                                  const nf = [...transFields];
                                  if (e.target.value === '_OTHER_') {
                                    nf[idx].regex = '^.+$'; // placeholder
                                    nf[idx]._isCustomRegex = true;
                                  } else {
                                    nf[idx].regex = e.target.value;
                                    nf[idx]._isCustomRegex = false;
                                  }
                                  setTransFields(nf);
                                }}
                              >
                                {REGEX_PRESETS.map(rp => <option key={rp.value} value={rp.value}>{rp.label}{rp.value && rp.value !== '_OTHER_' ? ` — ${rp.value}` : ''}</option>)}
                              </select>
                              {/* Custom regex input */}
                              {(isCustomRegex || field._isCustomRegex) && (
                                <input type="text" className="form-input mono" style={{ marginTop: '0.4rem' }}
                                  value={field.regex || ''}
                                  placeholder="VD: ^[A-Z0-9]{6,12}$"
                                  onChange={(e) => { const nf = [...transFields]; nf[idx].regex = e.target.value; setTransFields(nf); }}
                                />
                              )}
                            </div>
                            <div className="checkbox-wrap" style={{ flex: '0.5', alignSelf: 'center', marginTop: '1.2rem' }}>
                              <label>
                                <input type="checkbox" checked={field.isRequired || false}
                                  onChange={(e) => { const nf = [...transFields]; nf[idx].isRequired = e.target.checked; setTransFields(nf); }}
                                /> Bắt buộc
                              </label>
                            </div>
                          </div>
                        </div>
                        <button className="icon-btn-danger" onClick={() => { const nf = [...transFields]; nf.splice(idx, 1); setTransFields(nf); }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )
                  })}
                  {transFields.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Chưa có trường Input nào. Bấm "Thêm Trường".</p>}
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* ============ TAB 2: FieldBuilder ============ */}
          {activeTab === 'fieldBuilder' && (
            <div className="workspace-section fade-in">
              <h3>2. Nguồn Dữ Liệu Ngầm (FieldBuilder)</h3>
              {serviceInfo.baseTemplate === 'BATCH' ? (
                <div className="info-box warn-box" style={{ marginTop: '1rem' }}>
                  <ShieldAlert size={18} style={{ color: '#ef4444' }} />
                  <span style={{ color: '#fca5a5' }}><b>Bị khóa:</b> Trường dữ liệu ngầm của Dịch vụ Lô (BATCH) được tự động tối ưu hóa nên không thể chỉnh sửa.</span>
                </div>
              ) : (
                <>
              <div className="info-box">
                <Info size={16} />
                <span>Hệ thống tự động tra cứu thêm thông tin cần thiết từ DB (VD: từ SĐT → tra ra ID ví người nhận). Kết quả được lưu vào <b>TRANSBODY</b> để dùng ở Bước 5.</span>
              </div>

              {/* DB variable reference + preset chips */}
              <div className="preset-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Database size={14} style={{ color: '#6ee7b7' }} />
                  <span style={{ fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 600 }}>Biến hệ thống có sẵn (hover để xem mô tả):</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                  {[
                    { name: 'SENDERID', desc: 'ID pocket người gửi — tự động lấy từ JWT (ctx.senderId)' },
                    { name: 'RECEIVERID', desc: 'ID pocket người nhận — tra ra từ số điện thoại RECEIVERPHONE' },
                    { name: 'BILLERID', desc: 'ID pocket biller đối tác — tra ra từ mã BILLERCODE' },
                    { name: 'AMOUNT', desc: 'Số tiền giao dịch (lấy từ Input body.amount)' },
                    { name: 'RECEIVERPHONE', desc: 'Số điện thoại người nhận (lấy từ Input body.receiverPhone)' },
                    { name: 'BILLERCODE', desc: 'Mã đối tác biller (lấy từ Input body.billerCode)' },
                  ].map(v => (
                    <span key={v.name} title={v.desc}
                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '0.2rem 0.55rem', borderRadius: '0.35rem', fontSize: '0.8rem', fontFamily: 'monospace', cursor: 'help' }}
                    >{v.name}</span>
                  ))}
                  {transFields.filter(tf => tf.fieldName).map(tf => (
                    <span key={tf.fieldName} title={`Từ input bước 1: ${tf.fieldName}`}
                      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', padding: '0.2rem 0.55rem', borderRadius: '0.35rem', fontSize: '0.8rem', fontFamily: 'monospace', cursor: 'help' }}
                    >{tf.fieldName}<span style={{ opacity: 0.65, fontSize: '0.7rem' }}> (B1)</span></span>
                  ))}
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Thêm nhanh quy tắc phổ biến:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {PRESET_BUILDERS.map((pb, i) => (
                    <button key={i} className="preset-chip" onClick={() => addFieldBuilder(pb)}>
                      <Plus size={12} /> {pb.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Quy tắc dựng dữ liệu</h4>
                  <button className="btn-sm" onClick={() => setFieldBuilders([...fieldBuilders, { order: fieldBuilders.length + 1, name: 'MY_VAR', rule: 'mapping', source: 'body.myField' }])}>
                    <Plus size={16} /> Thêm thủ công
                  </button>
                </div>

                <div className="nocode-list">
                  {fieldBuilders.map((fb, idx) => (
                    <div key={idx} className="nocode-item builder-item">
                      <div className="builder-row">
                        <div className="builder-col">
                          <label>Lưu vào biến</label>
                          <input type="text" className="form-input mono"
                            value={fb.name || ''}
                            placeholder="VD: RECEIVERID"
                            onChange={(e) => updateBuilder(idx, 'name', e.target.value.toUpperCase())}
                          />
                        </div>
                        <div className="builder-col" style={{ flex: '0.8' }}>
                          <label>Cách lấy</label>
                          <select className="form-input" value={fb.rule || 'mapping'}
                            onChange={(e) => updateBuilder(idx, 'rule', e.target.value)}
                          >
                            <option value="mapping">Gán trực tiếp từ Input</option>
                            <option value="query">Tra cứu DB</option>
                            <option value="fixed">Giá trị cố định</option>
                          </select>
                        </div>
                        <div className="builder-col">
                          <label>
                            {fb.rule === 'mapping' ? 'Lấy từ (body.xxx / ctx.xxx)' :
                              fb.rule === 'query' ? 'Hàm tra cứu' :
                                'Giá trị cố định'}
                          </label>
                          {fb.rule === 'query' ? (
                            <select className="form-input" value={fb.source || 'queryPocketByPhone'}
                              onChange={(e) => updateBuilder(idx, 'source', e.target.value)}
                            >
                              <option value="queryPocketByPhone">Tra ví theo SĐT (P2P) — RECEIVERPHONE → RECEIVERID</option>
                              <option value="queryBillerPocket">Tra ví Biller theo mã (Bill) — BILLERCODE → BILLERID</option>
                            </select>
                          ) : (
                            <input type="text" className="form-input mono"
                              value={fb.source || ''}
                              placeholder={fb.rule === 'mapping' ? 'body.amount / ctx.senderId' : 'Giá trị cố định'}
                              onChange={(e) => updateBuilder(idx, 'source', e.target.value)}
                            />
                          )}
                        </div>
                        <button className="icon-btn-danger" onClick={() => { const nf = [...fieldBuilders]; nf.splice(idx, 1); setFieldBuilders(nf); }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {fieldBuilders.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Chưa có quy tắc nào. Dùng "Thêm nhanh" ở trên hoặc thêm thủ công.</p>}
                </div>
              </div>

              {transbodyVars.length > 0 && (
                <div className="info-box success-box">
                  <CheckCircle2 size={16} />
                  <span>Các biến sẽ có trong TRANSBODY: {transbodyVars.map(v => <code key={v} style={{ background: 'rgba(165,180,252,0.15)', padding: '0 4px', borderRadius: 4, margin: '0 2px' }}>{v}</code>)}</span>
                </div>
              )}
                </>
              )}
            </div>
          )}

          {/* ============ TAB 3: TransValidation ============ */}
          {activeTab === 'transValidation' && (
            <div className="workspace-section fade-in">
              <h3>3. Điều Kiện Chặn (Luật Nghiệp Vụ)</h3>
              {serviceInfo.baseTemplate === 'BATCH' ? (
                <div className="info-box warn-box" style={{ marginTop: '1rem' }}>
                  <ShieldAlert size={18} style={{ color: '#ef4444' }} />
                  <span style={{ color: '#fca5a5' }}><b>Bị khóa:</b> Điều kiện chặn của Dịch vụ Lô (BATCH) được xử lý độc lập cho từng giao dịch con bởi Batch Engine (số dư tổng, trạng thái ví) nên không thể tùy chỉnh.</span>
                </div>
              ) : (
                <>
              <div className="info-box">
                <Info size={16} />
                <span>Giao dịch sẽ bị <b>từ chối</b> nếu vi phạm bất kỳ điều kiện nào dưới đây. Các kiểm tra này chạy TRƯỚC khi tiền bị trừ.</span>
              </div>

              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Điều kiện phải thoả mãn</h4>
                  <button className="btn-sm" onClick={() => setTransValidations([...transValidations, { valType: 'balance_check', errorCode: 'ERR_INSUFFICIENT_BALANCE', note: VALIDATION_PRESETS[0].note }])}>
                    <Plus size={16} /> Thêm Điều Kiện
                  </button>
                </div>

                <div className="nocode-list">
                  {transValidations.map((val, idx) => (
                    <div key={idx} className="nocode-item validation-item">
                      <ShieldAlert size={20} className="text-warning" />
                      <div className="item-content flex-col" style={{ flex: 1 }}>
                        <div className="flex-row">
                          <span>Kiểm tra:</span>
                          <select
                            className="form-input inline-select" style={{ flex: 1 }}
                            value={val.valType || 'balance_check'}
                            onChange={(e) => {
                              const newVal = [...transValidations];
                              newVal[idx].valType = e.target.value;
                              const matched = VALIDATION_PRESETS.find(pv => pv.value === e.target.value);
                              if (matched) {
                                newVal[idx].errorCode = matched.errorCode;
                                newVal[idx].note = matched.note;
                              }
                              setTransValidations(newVal);
                            }}
                          >
                            {VALIDATION_PRESETS.map(pv => <option key={pv.value} value={pv.value}>{pv.label}</option>)}
                          </select>
                        </div>
                        {val.note && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', paddingLeft: '0.5rem' }}>ℹ {val.note}</div>}
                      </div>
                      <button className="icon-btn-danger" onClick={() => { const nv = [...transValidations]; nv.splice(idx, 1); setTransValidations(nv); }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {transValidations.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Chưa có điều kiện nào.</p>}
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* ============ TAB 4: Fee ============ */}
          {activeTab === 'fee' && (
            <div className="workspace-section fade-in">
              <h3>4. Biểu Phí (Fee)</h3>
              <div className="info-box">
                <Info size={16} />
                <span>Phí được thu từ người gửi và tự động gom về <b>Ví Hệ Thống</b> khi giao dịch thành công. Cấu hình ở đây sẽ thêm một bước ghi sổ phí tự động.</span>
              </div>

              <div className="config-card fee-card">
                <div className="form-group-row">
                  <label>Cách tính phí:</label>
                  <select className="form-input" value={feeConfig.type || 'free'}
                    onChange={(e) => setFeeConfig({ ...feeConfig, type: e.target.value })}
                  >
                    <option value="free">Miễn phí (0đ)</option>
                    <option value="fixed">Cố định một khoản tiền (VND)</option>
                    <option value="percent">Theo phần trăm (%) giao dịch</option>
                  </select>
                </div>
                {feeConfig.type === 'fixed' && (
                  <div className="form-group-row">
                    <label>Số tiền phí (VND):</label>
                    <input type="number" className="form-input" min="0"
                      value={feeConfig.value || 0}
                      onChange={(e) => setFeeConfig({ ...feeConfig, value: Number(e.target.value) })}
                    />
                  </div>
                )}
                {feeConfig.type === 'percent' && (
                  <>
                    <div className="form-group-row">
                      <label>Phần trăm (%):</label>
                      <input type="number" className="form-input" min="0" max="100" step="0.1"
                        value={feeConfig.value || 0}
                        onChange={(e) => setFeeConfig({ ...feeConfig, value: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group-row">
                      <label>Phí tối đa (VND, tuỳ chọn):</label>
                      <input type="number" className="form-input" min="0"
                        placeholder="Để trống = không giới hạn"
                        value={feeConfig.max || ''}
                        onChange={(e) => setFeeConfig({ ...feeConfig, max: e.target.value ? Number(e.target.value) : null })}
                      />
                    </div>
                  </>
                )}
                {feeConfig.type !== 'free' && (
                  <div className="info-box" style={{ marginTop: '1rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Phí sẽ được tự động trừ từ ví người gửi và ghi có vào Ví Hệ Thống. Bạn không cần thêm bước phí thủ công ở Bước 5.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ TAB 5: glSteps (TransDefinition) ============ */}
          {activeTab === 'transDefinition' && (
            <div className="workspace-section fade-in">
              <h3>5. Luồng Dòng Tiền (Ghi Sổ Kép)</h3>
              {serviceInfo.baseTemplate === 'BATCH' ? (
                <div className="info-box warn-box" style={{ marginTop: '1rem' }}>
                  <ShieldAlert size={18} style={{ color: '#ef4444' }} />
                  <span style={{ color: '#fca5a5' }}><b>Bị khóa:</b> Bút toán của Dịch vụ Lô (BATCH) được xử lý gom tổng tự động bởi Batch Engine để tránh nghẽn ví (Hot Document), do đó không thể chỉnh sửa bằng tay.</span>
                </div>
              ) : (
                <>
              <div className="info-box">
                <Info size={16} />
                <span>Định nghĩa đường đi của tiền. Mỗi bước là một bút toán: <b>trừ một ví</b> và <b>cộng một ví khác</b> với cùng số tiền. Tiền chỉ dịch chuyển, không mất đi.</span>
              </div>

              {walletPockets.length === 0 && (
                <div className="info-box warn-box">
                  <Info size={16} />
                  <span>Chưa có ví System/Bank nào. Vào <b>Quản lý Ví</b> để tạo trước nếu cần chọn ví cố định ở đây.</span>
                </div>
              )}

              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Các bước dời tiền</h4>
                  <button className="btn-sm" onClick={addGlStep}>
                    <Plus size={16} /> Thêm Bước Dời Tiền
                  </button>
                </div>

                {glSteps.map((step, idx) => (
                  <div key={idx} className="ledger-step-card">
                    <div className="ledger-step-header">
                      <span className="step-badge">Bước {idx + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ghi chú:</span>
                        <input type="text" className="form-input inline-input" style={{ width: 180 }}
                          value={step.note || ''} placeholder="VD: Chuyển tiền gốc"
                          onChange={(e) => updateGlStep(idx, 'note', e.target.value)}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Số tiền:</span>
                        <select className="form-input inline-input" style={{ width: 140 }}
                          value={step.amount || 'AMOUNT'}
                          onChange={(e) => updateGlStep(idx, 'amount', e.target.value)}
                        >
                          <option value="AMOUNT">Số tiền (AMOUNT)</option>
                          <option value="FEE">Phí (FEE)</option>
                          {transbodyVars.filter(v => !['SENDERID', 'RECEIVERID', 'RECEIVERPHONE', 'SENDERPHONE'].includes(v)).map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <button className="icon-btn-danger" style={{ marginLeft: '0.5rem' }} onClick={() => { const ns = [...glSteps]; ns.splice(idx, 1); setGlSteps(ns); }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="ledger-flow">
                      {/* DEBIT */}
                      <div className="pocket-box debit">
                        <div className="pocket-title">➖ Trừ tiền từ ví (Debit)</div>
                        <select className="form-input" value={step.debitLevel || 'productLevel'}
                          onChange={(e) => { updateGlStep(idx, 'debitLevel', e.target.value); updateGlStep(idx, 'debitTarget', e.target.value === 'productLevel' ? 'SENDERID' : (walletPockets[0]?.user || '')); }}
                        >
                          <option value="productLevel">Ví động (lấy từ TRANSBODY)</option>
                          <option value="wallet">Ví cố định (System/Bank)</option>
                        </select>
                        {step.debitLevel === 'productLevel' ? (
                          <select className="form-input" style={{ marginTop: '0.4rem' }} value={step.debitTarget || 'SENDERID'}
                            onChange={(e) => updateGlStep(idx, 'debitTarget', e.target.value)}
                          >
                            <option value="SENDERID">SENDERID (ví người gửi)</option>
                            <option value="RECEIVERID">RECEIVERID (ví người nhận)</option>
                            <option value="BILLERID">BILLERID (ví đối tác)</option>
                            {transbodyVars.filter(v => !['SENDERID', 'RECEIVERID', 'BILLERID', 'RECEIVERPHONE', 'AMOUNT'].includes(v)).map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <select className="form-input" style={{ marginTop: '0.4rem' }} value={step.debitTarget || ''}
                            onChange={(e) => updateGlStep(idx, 'debitTarget', e.target.value)}
                          >
                            <option value="">-- Chọn ví cố định --</option>
                            {walletPockets.map(p => (
                              <option key={p.id} value={p.user}>{p.user} ({p.client})</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="flow-arrow">
                        <ArrowRight size={28} style={{ color: '#a5b4fc' }} />
                      </div>

                      {/* CREDIT */}
                      <div className="pocket-box credit">
                        <div className="pocket-title">➕ Cộng tiền vào ví (Credit)</div>
                        <select className="form-input" value={step.creditLevel || 'productLevel'}
                          onChange={(e) => { updateGlStep(idx, 'creditLevel', e.target.value); updateGlStep(idx, 'creditTarget', e.target.value === 'productLevel' ? 'RECEIVERID' : (walletPockets[0]?.user || '')); }}
                        >
                          <option value="productLevel">Ví động (lấy từ TRANSBODY)</option>
                          <option value="wallet">Ví cố định (System/Bank)</option>
                        </select>
                        {step.creditLevel === 'productLevel' ? (
                          <select className="form-input" style={{ marginTop: '0.4rem' }} value={step.creditTarget || 'RECEIVERID'}
                            onChange={(e) => updateGlStep(idx, 'creditTarget', e.target.value)}
                          >
                            <option value="RECEIVERID">RECEIVERID (ví người nhận)</option>
                            <option value="SENDERID">SENDERID (ví người gửi)</option>
                            <option value="BILLERID">BILLERID (ví đối tác)</option>
                            {transbodyVars.filter(v => !['SENDERID', 'RECEIVERID', 'BILLERID', 'RECEIVERPHONE', 'AMOUNT'].includes(v)).map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <select className="form-input" style={{ marginTop: '0.4rem' }} value={step.creditTarget || ''}
                            onChange={(e) => updateGlStep(idx, 'creditTarget', e.target.value)}
                          >
                            <option value="">-- Chọn ví cố định --</option>
                            {walletPockets.map(p => (
                              <option key={p.id} value={p.user}>{p.user} ({p.client})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {glSteps.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>Chưa có bước dời tiền nào. Bấm "Thêm Bước Dời Tiền".</p>}
              </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
