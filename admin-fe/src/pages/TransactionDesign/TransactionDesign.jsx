import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Play, Plus, 
  Database, ShieldAlert, BadgeDollarSign, 
  BookOpenCheck, Settings2, FileCode2,
  Trash2, GripVertical, CheckCircle2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import './TransactionDesign.css';

const PREDEFINED_FIELDS = [
  { value: 'AMOUNT', label: 'Số tiền giao dịch', note: 'Ví dụ: 50000. Dùng để khách nhập số tiền cần chuyển' },
  { value: 'RECEIVERPHONE', label: 'Số ĐT người nhận', note: 'Ví dụ: 0901234567. Dùng để tra cứu ví người nhận' },
  { value: 'BILLCODE', label: 'Mã hoá đơn', note: 'Dùng để gọi thanh toán với đối tác (Biller)' },
  { value: 'BILLERCODE', label: 'Mã đối tác', note: 'Dùng để xác định thanh toán cho đối tác nào (VD: EVN)' },
  { value: 'DESCRIPTION', label: 'Nội dung/Mô tả', note: 'Nội dung hiển thị trong lịch sử giao dịch' },
  { value: '_OTHER_', label: 'Khác (Tự định nghĩa)', note: 'Tự đặt mã biến tùy ý' }
];

const PREDEFINED_BUILDERS = [
  { value: 'QUERY_POCKET', label: 'Tra cứu thông tin Ví từ Số điện thoại' },
  { value: 'QUERY_BILLER', label: 'Tra cứu thông tin Biller từ Mã đối tác' },
  { value: 'MAPPING', label: 'Gán biến trực tiếp' }
];

const PREDEFINED_VARS = [
  { value: 'RECEIVER_WALLET', label: 'Ví Người Nhận (RECEIVER_WALLET)' },
  { value: 'BILLER_WALLET', label: 'Ví Đối Tác (BILLER_WALLET)' },
  { value: 'BILL_AMOUNT', label: 'Số Tiền Hoá Đơn (BILL_AMOUNT)' },
  { value: '_OTHER_', label: 'Khác (Tự nhập tên biến)' }
];

const PREDEFINED_VALIDATIONS = [
  { value: 'balance_check', label: 'Số dư đủ để giao dịch', defaultCode: 'ERR_INSUFFICIENT_BALANCE', defaultNote: 'Kiểm tra ví người gửi có đủ tiền trả gốc + phí không' },
  { value: 'same_wallet', label: 'Không chuyển cho chính mình', defaultCode: 'ERR_SAME_WALLET', defaultNote: 'Kiểm tra ví gửi và ví nhận phải khác nhau' },
  { value: 'min_amount', label: 'Số tiền tối thiểu', defaultCode: 'ERR_MIN_AMOUNT', defaultNote: 'Giao dịch phải lớn hơn số tiền tối thiểu quy định' }
];

const PREDEFINED_POCKETS = [
  { value: 'SENDER_WALLET', label: 'Ví Người Gửi (Mặc định)' },
  { value: 'SYSTEM_FEE', label: 'Ví Thu Phí Hệ Thống (Mặc định)' },
  { value: 'BANK_WALLET', label: 'Ví Ngân Hàng Nạp Tiền (Mặc định)' }
];

export default function TransactionDesign() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('transField');
  const [loading, setLoading] = useState(true);

  // States for each tab
  const [serviceInfo, setServiceInfo] = useState({});
  const [transFields, setTransFields] = useState([]);
  const [fieldBuilders, setFieldBuilders] = useState([]);
  const [transValidations, setTransValidations] = useState([]);
  const [feeConfig, setFeeConfig] = useState({ type: 'fixed', amount: 0, percent: 0 });
  const [glSteps, setGlSteps] = useState([]);

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
        setServiceInfo(data.data.service || {});
        setTransFields(data.data.transFields || []);
        setTransValidations(data.data.transValidations || []);
        if (data.data.service && data.data.service.fieldBuilder) {
           setFieldBuilders(data.data.service.fieldBuilder);
        }
        if (data.data.service && data.data.service.fee) {
           setFeeConfig(data.data.service.fee);
        }
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
      fieldBuilder: fieldBuilders.map(fb => ({
        ...fb,
        targetVar: fb.targetVarSelect === '_OTHER_' ? fb.targetVar : fb.targetVarSelect || fb.targetVar
      })),
      transValidations,
      fee: feeConfig,
      glSteps
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
        alert('Lưu cấu hình thành công!');
      } else {
        alert('Lưu thất bại: ' + (data.message || 'Lỗi server'));
      }
    })
    .catch(err => {
      console.error(err);
      alert('Lỗi kết nối');
    });
  };

  const tabs = [
    { id: 'transField', label: '1. Khai báo Input', icon: FileCode2 },
    { id: 'fieldBuilder', label: '2. Nguồn Dữ Liệu', icon: Database },
    { id: 'transValidation', label: '3. Điều Kiện Chặn', icon: ShieldAlert },
    { id: 'fee', label: '4. Biểu Phí', icon: BadgeDollarSign },
    { id: 'transDefinition', label: '5. Luồng Dòng Tiền', icon: BookOpenCheck },
  ];

  if (loading) return <div style={{padding: '2rem', color: 'white'}}>Đang tải dữ liệu cấu hình...</div>;

  // Thu thập danh sách các biến được tạo từ FieldBuilder để dùng cho dropdown
  const dynamicVars = fieldBuilders.map(fb => fb.targetVarSelect === '_OTHER_' ? fb.targetVar : fb.targetVarSelect || fb.targetVar).filter(v => v);

  return (
    <div className="tx-design-page fade-in">
      <div className="page-header">
        <div className="header-left">
          <button className="icon-btn-sm" onClick={() => navigate('/dashboard/services')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="page-title">Thiết kế Kịch bản: {serviceInfo.name || 'Loading...'} ({serviceInfo.code})</h2>
            <p className="page-desc">Kéo thả và tuỳ chỉnh mà không cần viết code</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn btn-primary create-btn" onClick={handleSave}>
            <Save size={18} />
            Lưu Cấu Hình
          </button>
        </div>
      </div>

      <div className="tx-design-layout">
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
                <span>{tab.label}</span>
                {activeTab === tab.id && <CheckCircle2 size={16} className="tab-check" />}
              </button>
            ))}
          </div>
        </div>

        <div className="tx-workspace glass-card">
          
          {/* TAB 1 */}
          {activeTab === 'transField' && (
            <div className="workspace-section fade-in">
              <h3>1. Khai báo Input (Dữ liệu đầu vào)</h3>
              <p className="section-desc">Khai báo các trường dữ liệu mà Khách hàng cần nhập trên giao diện khi sử dụng dịch vụ này.</p>
              
              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Form Nhập Liệu</h4>
                  <button className="btn-sm" onClick={() => setTransFields([...transFields, { fieldName: '', fieldFormat: 'string', isRequired: true }])}>
                    <Plus size={16}/> Thêm Trường
                  </button>
                </div>
                
                <div className="nocode-list">
                  {transFields.map((field, idx) => {
                    const matchedPredefined = PREDEFINED_FIELDS.find(f => f.value === field.fieldName);
                    const isOther = field.fieldName !== '' && !matchedPredefined;
                    return (
                    <div key={idx} className="nocode-item drag-item">
                      <GripVertical size={18} className="drag-handle" />
                      <div className="item-content">
                        <div className="input-group-grid">
                          <div style={{ flex: '2' }}>
                            <label>Dữ liệu cần hỏi (Biến lưu trữ)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <select 
                                className="form-input" 
                                value={matchedPredefined ? field.fieldName : (field.fieldName === '' ? '' : '_OTHER_')} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newFields = [...transFields];
                                  if (val === '_OTHER_') {
                                    newFields[idx].fieldName = 'CUSTOM_VAR_';
                                  } else {
                                    newFields[idx].fieldName = val;
                                  }
                                  setTransFields(newFields);
                                }}
                              >
                                <option value="">-- Chọn dữ liệu --</option>
                                {PREDEFINED_FIELDS.map(pf => <option key={pf.value} value={pf.value}>{pf.label} ({pf.value})</option>)}
                              </select>
                              {isOther && (
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  value={field.fieldName || ''} 
                                  placeholder="Nhập mã biến (VD: CUSTOM_VAR)"
                                  onChange={(e) => {
                                    const newFields = [...transFields];
                                    newFields[idx].fieldName = e.target.value.toUpperCase();
                                    setTransFields(newFields);
                                  }}
                                />
                              )}
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {matchedPredefined ? matchedPredefined.note : 'Sử dụng biến này ở các bước sau'}
                              </span>
                            </div>
                          </div>
                          <div style={{ flex: '1' }}>
                            <label>Kiểu dữ liệu</label>
                            <select 
                              className="form-input"
                              value={field.fieldFormat || 'string'}
                              onChange={(e) => {
                                const newFields = [...transFields];
                                newFields[idx].fieldFormat = e.target.value;
                                setTransFields(newFields);
                              }}
                            >
                              <option value="string">Chữ & Số</option>
                              <option value="number">Chỉ Số</option>
                              <option value="boolean">Đúng/Sai</option>
                            </select>
                          </div>
                          <div className="checkbox-wrap" style={{ flex: '0.5' }}>
                            <label>
                              <input 
                                type="checkbox" 
                                checked={field.isRequired || false} 
                                onChange={(e) => {
                                  const newFields = [...transFields];
                                  newFields[idx].isRequired = e.target.checked;
                                  setTransFields(newFields);
                                }}
                              /> Bắt buộc?
                            </label>
                          </div>
                        </div>
                      </div>
                      <button className="icon-btn-danger" onClick={() => {
                        const newFields = [...transFields];
                        newFields.splice(idx, 1);
                        setTransFields(newFields);
                      }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )})}
                  {transFields.length === 0 && <p style={{color:'var(--text-muted)'}}>Chưa có trường dữ liệu nào. Bấm thêm trường.</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 */}
          {activeTab === 'fieldBuilder' && (
            <div className="workspace-section fade-in">
              <h3>2. Nguồn Dữ Liệu Ẩn (FieldBuilder)</h3>
              <p className="section-desc">Hệ thống sẽ dựa vào Input ở Bước 1 để tra cứu thêm thông tin ngầm (VD: Từ SĐT tra ra Ví).</p>
              
              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Quy tắc thu thập dữ liệu ngầm</h4>
                  <button className="btn-sm" onClick={() => setFieldBuilders([...fieldBuilders, { type: 'QUERY_POCKET', sourceField: '', targetVarSelect: 'RECEIVER_WALLET', targetVar: '' }])}>
                    <Plus size={16}/> Thêm Quy Tắc
                  </button>
                </div>
                
                <div className="nocode-list">
                  {fieldBuilders.map((rule, idx) => {
                    const matchedVar = PREDEFINED_VARS.find(v => v.value === (rule.targetVarSelect || rule.targetVar));
                    const isOtherVar = (rule.targetVarSelect === '_OTHER_' || (!matchedVar && rule.targetVar));
                    
                    return (
                    <div key={idx} className="nocode-item">
                      <div className="rule-type-indicator query">Dữ liệu ngầm</div>
                      <div className="item-content flex-col">
                        <div className="flex-row">
                          <span>Cách lấy:</span>
                          <select 
                            className="form-input inline-select"
                            value={rule.type || 'QUERY_POCKET'}
                            onChange={(e) => {
                              const newRules = [...fieldBuilders];
                              newRules[idx].type = e.target.value;
                              setFieldBuilders(newRules);
                            }}
                          >
                            {PREDEFINED_BUILDERS.map(pb => <option key={pb.value} value={pb.value}>{pb.label}</option>)}
                          </select>
                        </div>
                        <div className="flex-row mt-2">
                          <span>Từ Input:</span>
                          <select 
                            className="form-input inline-select"
                            value={rule.sourceField || ''}
                            onChange={(e) => {
                              const newRules = [...fieldBuilders];
                              newRules[idx].sourceField = e.target.value;
                              setFieldBuilders(newRules);
                            }}
                          >
                            <option value="">-- Chọn Input ở Bước 1 --</option>
                            {transFields.map((tf, i) => tf.fieldName ? <option key={i} value={tf.fieldName}>{tf.fieldName}</option> : null)}
                          </select>
                          <span>và Lưu vào Biến:</span>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1}}>
                            <select 
                              className="form-input inline-select"
                              value={matchedVar ? matchedVar.value : (isOtherVar ? '_OTHER_' : '')}
                              onChange={(e) => {
                                const newRules = [...fieldBuilders];
                                newRules[idx].targetVarSelect = e.target.value;
                                if (e.target.value !== '_OTHER_') {
                                  newRules[idx].targetVar = e.target.value;
                                } else {
                                  newRules[idx].targetVar = 'CUSTOM_WALLET';
                                }
                                setFieldBuilders(newRules);
                              }}
                            >
                              <option value="">-- Chọn biến lưu --</option>
                              {PREDEFINED_VARS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                            </select>
                            {isOtherVar && (
                              <input 
                                type="text" className="form-input inline-input" placeholder="Tự nhập mã biến"
                                value={rule.targetVar || ''}
                                onChange={(e) => {
                                  const newRules = [...fieldBuilders];
                                  newRules[idx].targetVar = e.target.value;
                                  setFieldBuilders(newRules);
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex-row mt-2">
                          <span style={{color: 'var(--text-muted)'}}>Ghi chú:</span>
                          <input 
                            type="text" className="form-input inline-input" style={{flex: 1, border: 'none', background: 'transparent', color: 'var(--text-secondary)'}}
                            placeholder="Nhập ghi chú cho người dùng khác dễ hiểu..."
                            value={rule.note || ''}
                            onChange={(e) => {
                              const newRules = [...fieldBuilders];
                              newRules[idx].note = e.target.value;
                              setFieldBuilders(newRules);
                            }}
                          />
                        </div>
                      </div>
                      <button className="icon-btn-danger" onClick={() => {
                        const newRules = [...fieldBuilders];
                        newRules.splice(idx, 1);
                        setFieldBuilders(newRules);
                      }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )})}
                  {fieldBuilders.length === 0 && <p style={{color:'var(--text-muted)'}}>Chưa có quy tắc nào.</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 */}
          {activeTab === 'transValidation' && (
            <div className="workspace-section fade-in">
              <h3>3. Điều Kiện Chặn (TransValidation)</h3>
              <p className="section-desc">Giao dịch sẽ bị TỪ CHỐI nếu vi phạm các điều kiện dưới đây.</p>
              
              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Các điều kiện bắt buộc đúng</h4>
                  <button className="btn-sm" onClick={() => setTransValidations([...transValidations, { valType: 'balance_check', errorCode: 'ERR_INSUFFICIENT_BALANCE', note: 'Kiểm tra ví người gửi có đủ tiền trả gốc + phí không' }])}>
                    <Plus size={16}/> Thêm Điều Kiện
                  </button>
                </div>
                
                <div className="nocode-list">
                  {transValidations.map((val, idx) => (
                    <div key={idx} className="nocode-item validation-item">
                      <ShieldAlert size={20} className="text-warning" />
                      <div className="item-content flex-col">
                        <div className="flex-row">
                          <span>Kiểm tra:</span>
                          <select 
                            className="form-input inline-select" style={{ flex: 1 }}
                            value={val.valType || 'balance_check'}
                            onChange={(e) => {
                              const newVal = [...transValidations];
                              newVal[idx].valType = e.target.value;
                              const matched = PREDEFINED_VALIDATIONS.find(pv => pv.value === e.target.value);
                              if (matched) {
                                newVal[idx].errorCode = matched.defaultCode;
                                newVal[idx].note = matched.defaultNote;
                              }
                              setTransValidations(newVal);
                            }}
                          >
                            {PREDEFINED_VALIDATIONS.map(pv => <option key={pv.value} value={pv.value}>{pv.label}</option>)}
                          </select>
                          <span>Mã Lỗi:</span>
                          <input 
                            type="text" className="form-input inline-input" style={{width: 200}}
                            value={val.errorCode || ''}
                            onChange={(e) => {
                              const newVal = [...transValidations];
                              newVal[idx].errorCode = e.target.value;
                              setTransValidations(newVal);
                            }}
                          />
                        </div>
                        <div className="flex-row mt-2">
                          <span style={{color: 'var(--text-muted)'}}>Ghi chú:</span>
                          <input 
                            type="text" className="form-input inline-input" style={{flex: 1, border: 'none', background: 'transparent', color: 'var(--text-secondary)'}}
                            placeholder="Giải thích điều kiện này..."
                            value={val.note || ''}
                            onChange={(e) => {
                              const newVal = [...transValidations];
                              newVal[idx].note = e.target.value;
                              setTransValidations(newVal);
                            }}
                          />
                        </div>
                      </div>
                      <button className="icon-btn-danger" onClick={() => {
                        const newVal = [...transValidations];
                        newVal.splice(idx, 1);
                        setTransValidations(newVal);
                      }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4 */}
          {activeTab === 'fee' && (
            <div className="workspace-section fade-in">
              <h3>4. Biểu Phí (Fee)</h3>
              <p className="section-desc">Thiết lập công thức thu phí. Tiền phí sẽ tự động được gom về Ví Hệ Thống khi giao dịch thành công.</p>
              
              <div className="config-card fee-card">
                <div className="form-group-row">
                  <label>Cách tính phí:</label>
                  <select 
                    className="form-input"
                    value={feeConfig.type || 'fixed'}
                    onChange={(e) => setFeeConfig({...feeConfig, type: e.target.value})}
                  >
                    <option value="fixed">Cố định một khoản tiền</option>
                    <option value="percent">Tính theo phần trăm (%) giao dịch</option>
                    <option value="free">Miễn phí (0đ)</option>
                  </select>
                </div>
                {feeConfig.type === 'fixed' && (
                  <div className="form-group-row">
                    <label>Số tiền phí (VND):</label>
                    <input 
                      type="number" className="form-input" 
                      value={feeConfig.amount || 0}
                      onChange={(e) => setFeeConfig({...feeConfig, amount: Number(e.target.value)})}
                    />
                  </div>
                )}
                {feeConfig.type === 'percent' && (
                  <div className="form-group-row">
                    <label>Phần trăm (%):</label>
                    <input 
                      type="number" className="form-input" 
                      value={feeConfig.percent || 0}
                      onChange={(e) => setFeeConfig({...feeConfig, percent: Number(e.target.value)})}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5 */}
          {activeTab === 'transDefinition' && (
            <div className="workspace-section fade-in">
              <h3>5. Luồng Dòng Tiền (Ghi sổ kép)</h3>
              <p className="section-desc">Định nghĩa đường đi của dòng tiền. Chọn Nguồn Tiền (Trừ đi) và Đích Đến (Cộng vào).</p>
              
              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Kịch bản dời tiền</h4>
                  <button className="btn-sm" onClick={() => setGlSteps([...glSteps, { debit: 'SENDER_WALLET', credit: 'RECEIVER_WALLET', amountVar: 'AMOUNT', note: 'Chuyển tiền gốc' }])}>
                    <Plus size={16}/> Thêm Bước Dời Tiền
                  </button>
                </div>
                
                {glSteps.map((step, idx) => (
                  <div key={idx} className="ledger-step-card">
                    <div className="ledger-step-header">
                      <span className="step-badge">Bước {idx + 1}</span>
                      <div className="step-amount-display" style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10}}>
                        <span>Ghi chú bước này:</span>
                        <input 
                          type="text" className="form-input inline-input" style={{ width: 200 }}
                          value={step.note || ''} placeholder="Ví dụ: Chuyển tiền gốc"
                          onChange={(e) => {
                            const newSteps = [...glSteps];
                            newSteps[idx].note = e.target.value;
                            setGlSteps(newSteps);
                          }}
                        />
                        <span style={{ marginLeft: '1rem' }}>Số tiền dời đi (Lấy từ Input):</span>
                        <select 
                          className="form-input inline-input" style={{ width: 150 }}
                          value={step.amountVar || 'AMOUNT'}
                          onChange={(e) => {
                            const newSteps = [...glSteps];
                            newSteps[idx].amountVar = e.target.value;
                            setGlSteps(newSteps);
                          }}
                        >
                          <option value="AMOUNT">Số tiền Input (AMOUNT)</option>
                          <option value="FEE_AMOUNT">Tiền Phí (FEE_AMOUNT)</option>
                          <option value="BILL_AMOUNT">Số tiền Hóa đơn (BILL_AMOUNT)</option>
                        </select>
                      </div>
                      <button className="icon-btn-danger" onClick={() => {
                        const newSteps = [...glSteps];
                        newSteps.splice(idx, 1);
                        setGlSteps(newSteps);
                      }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="ledger-flow">
                      <div className="pocket-box debit">
                        <div className="pocket-title">Trừ Tiền (Debit) từ ví:</div>
                        <select 
                          className="form-input"
                          value={step.debit || ''}
                          onChange={(e) => {
                            const newSteps = [...glSteps];
                            newSteps[idx].debit = e.target.value;
                            setGlSteps(newSteps);
                          }}
                        >
                          <option value="">-- Chọn Ví Nguồn --</option>
                          {PREDEFINED_POCKETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          {dynamicVars.length > 0 && <optgroup label="Ví lấy từ Nguồn Dữ Liệu (Bước 2)">
                            {dynamicVars.map((v, i) => <option key={`dyn-${i}`} value={v}>Ví: {v}</option>)}
                          </optgroup>}
                        </select>
                      </div>
                      <div className="flow-arrow">
                        <ArrowLeft size={24} style={{transform: 'rotate(180deg)'}} />
                      </div>
                      <div className="pocket-box credit">
                        <div className="pocket-title">Cộng Tiền (Credit) vào ví:</div>
                        <select 
                          className="form-input"
                          value={step.credit || ''}
                          onChange={(e) => {
                            const newSteps = [...glSteps];
                            newSteps[idx].credit = e.target.value;
                            setGlSteps(newSteps);
                          }}
                        >
                          <option value="">-- Chọn Ví Đích --</option>
                          {PREDEFINED_POCKETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          {dynamicVars.length > 0 && <optgroup label="Ví lấy từ Nguồn Dữ Liệu (Bước 2)">
                            {dynamicVars.map((v, i) => <option key={`dyn-${i}`} value={v}>Ví: {v}</option>)}
                          </optgroup>}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
