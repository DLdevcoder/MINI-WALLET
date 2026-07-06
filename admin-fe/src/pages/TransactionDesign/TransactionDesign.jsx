import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Play, Plus, 
  Database, ShieldAlert, BadgeDollarSign, 
  BookOpenCheck, Settings2, FileCode2,
  Trash2, GripVertical, CheckCircle2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import './TransactionDesign.css';

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
      fieldBuilder: fieldBuilders,
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
              <p className="section-desc">Khai báo các trường (fields) Client cần gửi lên.</p>
              
              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Form Nhập Liệu</h4>
                  <button className="btn-sm" onClick={() => setTransFields([...transFields, { fieldName: '', fieldFormat: 'string', isRequired: true }])}>
                    <Plus size={16}/> Thêm Trường
                  </button>
                </div>
                
                <div className="nocode-list">
                  {transFields.map((field, idx) => (
                    <div key={idx} className="nocode-item drag-item">
                      <GripVertical size={18} className="drag-handle" />
                      <div className="item-content">
                        <div className="input-group-grid">
                          <div>
                            <label>Biến lưu trữ (Field Code)</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={field.fieldName || ''} 
                              onChange={(e) => {
                                const newFields = [...transFields];
                                newFields[idx].fieldName = e.target.value;
                                setTransFields(newFields);
                              }}
                            />
                          </div>
                          <div>
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
                              <option value="string">Chữ & Số (String)</option>
                              <option value="number">Chỉ Số (Number)</option>
                              <option value="boolean">Đúng/Sai (Boolean)</option>
                            </select>
                          </div>
                          <div className="checkbox-wrap">
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
                  ))}
                  {transFields.length === 0 && <p style={{color:'var(--text-muted)'}}>Chưa có trường dữ liệu nào. Bấm thêm trường.</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 */}
          {activeTab === 'fieldBuilder' && (
            <div className="workspace-section fade-in">
              <h3>2. Nguồn Dữ Liệu Ẩn (FieldBuilder)</h3>
              <p className="section-desc">Hệ thống cần tự động tra cứu thêm thông tin gì để xử lý giao dịch này?</p>
              
              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Các quy tắc lấy dữ liệu</h4>
                  <button className="btn-sm" onClick={() => setFieldBuilders([...fieldBuilders, { type: 'QUERY_POCKET', sourceField: '', targetVar: '' }])}>
                    <Plus size={16}/> Thêm Quy Tắc
                  </button>
                </div>
                
                <div className="nocode-list">
                  {fieldBuilders.map((rule, idx) => (
                    <div key={idx} className="nocode-item">
                      <div className="rule-type-indicator query">Tra Cứu Database</div>
                      <div className="item-content flex-col">
                        <div className="flex-row">
                          <span>Tra cứu Ví dựa vào biến đầu vào</span>
                          <select 
                            className="form-input inline-select"
                            value={rule.sourceField || ''}
                            onChange={(e) => {
                              const newRules = [...fieldBuilders];
                              newRules[idx].sourceField = e.target.value;
                              setFieldBuilders(newRules);
                            }}
                          >
                            <option value="">-- Chọn Input --</option>
                            {transFields.map((tf, i) => tf.fieldName ? <option key={i} value={tf.fieldName}>{tf.fieldName}</option> : null)}
                          </select>
                          <span>và lưu vào biến ẩn</span>
                          <input 
                            type="text" className="form-input inline-input" placeholder="VD: RECEIVER_WALLET"
                            value={rule.targetVar || ''}
                            onChange={(e) => {
                              const newRules = [...fieldBuilders];
                              newRules[idx].targetVar = e.target.value;
                              setFieldBuilders(newRules);
                            }}
                          />
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
                  ))}
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
                  <button className="btn-sm" onClick={() => setTransValidations([...transValidations, { valType: 'balance_check', valCondition: '', errorCode: 'E01' }])}>
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
                            className="form-input inline-select"
                            value={val.valType || 'balance_check'}
                            onChange={(e) => {
                              const newVal = [...transValidations];
                              newVal[idx].valType = e.target.value;
                              setTransValidations(newVal);
                            }}
                          >
                            <option value="balance_check">Số dư đủ để giao dịch</option>
                            <option value="same_wallet">Không chuyển cho chính mình</option>
                          </select>
                          <span>Mã Lỗi:</span>
                          <input 
                            type="text" className="form-input inline-input" style={{width: 80}}
                            value={val.errorCode || 'E01'}
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
              <p className="section-desc">Thiết lập công thức thu phí. Tiền phí sẽ tự động được gom về Ví Hệ Thống.</p>
              
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
              <h3>5. Luồng Dòng Tiền (glSteps)</h3>
              <p className="section-desc">Định nghĩa đường đi của dòng tiền. Ghi Sổ Kép (trừ ở nguồn, cộng ở đích).</p>
              
              <div className="config-card">
                <div className="card-header-flex">
                  <h4>Kịch bản dời tiền</h4>
                  <button className="btn-sm" onClick={() => setGlSteps([...glSteps, { debit: 'SENDER_WALLET', credit: 'RECEIVER_WALLET', amountVar: 'TRANS_AMOUNT' }])}>
                    <Plus size={16}/> Thêm Bước Ghi Sổ
                  </button>
                </div>
                
                {glSteps.map((step, idx) => (
                  <div key={idx} className="ledger-step-card">
                    <div className="ledger-step-header">
                      <span className="step-badge">Bước {idx + 1}</span>
                      <div className="step-amount-display" style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10}}>
                        <span>Biến Số tiền dời đi:</span>
                        <input 
                          type="text" className="form-input inline-input" 
                          value={step.amountVar || 'TRANS_AMOUNT'}
                          onChange={(e) => {
                            const newSteps = [...glSteps];
                            newSteps[idx].amountVar = e.target.value;
                            setGlSteps(newSteps);
                          }}
                        />
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
                          <option value="">-- Chọn Ví Trừ --</option>
                          <option value="SENDER_WALLET">Ví người gửi (SENDER_WALLET)</option>
                          <option value="SYSTEM_FEE">Ví thu phí hệ thống (SYSTEM_FEE)</option>
                          <option value="BILLER_EVN">Ví đối tác EVN (BILLER_EVN)</option>
                          {fieldBuilders.map((fb, i) => fb.targetVar ? <option key={i} value={fb.targetVar}>Ví lưu ở biến: {fb.targetVar}</option> : null)}
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
                          <option value="">-- Chọn Ví Cộng --</option>
                          <option value="SENDER_WALLET">Ví người gửi (SENDER_WALLET)</option>
                          <option value="SYSTEM_FEE">Ví thu phí hệ thống (SYSTEM_FEE)</option>
                          <option value="BILLER_EVN">Ví đối tác EVN (BILLER_EVN)</option>
                          {fieldBuilders.map((fb, i) => fb.targetVar ? <option key={i} value={fb.targetVar}>Ví lưu ở biến: {fb.targetVar}</option> : null)}
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
