import { useState, useEffect, FormEvent } from 'react';
import { Employee, AssemblyLine, EmployeeStatus } from './types';
import { RESIGNATION_REASONS, MANAGERS } from './mockData';
import { X, Save, AlertOctagon, Calendar, Briefcase, User, Phone, CheckCircle } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Partial<Employee>) => void;
  employee?: Employee | null; // null for add mode
  mode: 'ADD' | 'EDIT' | 'RESIGN';
}

// Helper to parse manually inputted date formats and return standard YYYY-MM-DD
const normalizeDateInput = (val: string): string => {
  const str = val.trim();
  if (!str) return '';

  // 1. Handles format DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const partsSlash = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (partsSlash) {
    const day = partsSlash[1].padStart(2, '0');
    const month = partsSlash[2].padStart(2, '0');
    let year = partsSlash[3];
    if (year.length === 2) {
      const yrNum = parseInt(year, 10);
      year = String(yrNum <= 50 ? 2000 + yrNum : 1900 + yrNum);
    }
    return `${year}-${month}-${day}`;
  }

  // 2. Handles format YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const partsISOLike = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (partsISOLike) {
    const year = partsISOLike[1];
    const month = partsISOLike[2].padStart(2, '0');
    const day = partsISOLike[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 3. Fallback standard Date parser
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
};

export default function EmployeeModal({ isOpen, onClose, onSave, employee, mode }: EmployeeModalProps) {
  // Common states
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [phone, setPhone] = useState('');
  const [line, setLine] = useState<AssemblyLine>('DCLR');
  const [joinDateStr, setJoinDateStr] = useState('15/06/2026');
  const [status, setStatus] = useState<EmployeeStatus>('WORKING');
  const [notes, setNotes] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthplace, setBirthplace] = useState('');

  // Resignation states
  const [resignDate, setResignDate] = useState('2026-06-15');
  const [selectedReasonOption, setSelectedReasonOption] = useState(RESIGNATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isCustomReason, setIsCustomReason] = useState(false);

  // Form error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or fill form on open/change
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (employee) {
        // Edit or Resign Mode
        setCode(employee.code);
        setFullName(employee.fullName);
        setGender(employee.gender);
        setPhone(employee.phone);
        setLine(employee.line);
        
        // Convert YYYY-MM-DD from database to DD/MM/YYYY for Vietnamese manual editing
        if (employee.joinDate) {
          const parts = employee.joinDate.split('-');
          if (parts.length === 3) {
            setJoinDateStr(`${parts[2]}/${parts[1]}/${parts[0]}`);
          } else {
            setJoinDateStr(employee.joinDate);
          }
        } else {
          setJoinDateStr('15/06/2026');
        }

        setStatus(employee.status);
        setNotes(employee.notes || '');
        setBirthday(employee.birthday || '');
        setBirthplace(employee.birthplace || '');
        
        if (employee.resignDate) {
          setResignDate(employee.resignDate);
        } else {
          setResignDate('2026-06-15'); // Current default in simulated date
        }

        if (employee.resignReason) {
          const isPreset = RESIGNATION_REASONS.includes(employee.resignReason);
          if (isPreset) {
            setSelectedReasonOption(employee.resignReason);
            setIsCustomReason(false);
          } else {
            setSelectedReasonOption('Khác');
            setCustomReason(employee.resignReason);
            setIsCustomReason(true);
          }
        } else {
          setSelectedReasonOption(RESIGNATION_REASONS[0]);
          setCustomReason('');
          setIsCustomReason(false);
        }
      } else {
        // Add Mode
        const generatedCode = `DCLR-${Math.floor(100 + Math.random() * 900)}`;
        setCode(generatedCode);
        setFullName('');
        setGender('Nam');
        setPhone('');
        setLine('DCLR');
        setJoinDateStr('15/06/2026');
        setStatus('WORKING');
        setNotes('');
        setBirthday('');
        setBirthplace('');
        setResignDate('2026-06-15');
        setSelectedReasonOption(RESIGNATION_REASONS[0]);
        setCustomReason('');
        setIsCustomReason(false);
      }
    }
  }, [isOpen, employee, mode]);

  // Sync Manager on Line change
  const currentManager = MANAGERS[line];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!code.trim()) newErrors.code = 'Mã nhân viên không được để trống';
    if (!fullName.trim()) newErrors.fullName = 'Họ tên không được để trống';
    if (!phone.trim()) {
      newErrors.phone = 'SĐT không được để trống';
    } else if (!/^[0-9+ ]{9,12}$/.test(phone)) {
      newErrors.phone = 'SĐT không đúng định dạng (9 đến 12 số)';
    }

    const normJoin = normalizeDateInput(joinDateStr);
    if (!joinDateStr.trim()) {
      newErrors.joinDate = 'Cần điền ngày nhận việc';
    } else if (!normJoin) {
      newErrors.joinDate = 'Ngày nhận việc không hợp lệ (VD: 15/06/2026 hoặc 2026-06-15)';
    }
    
    if (mode === 'RESIGN') {
      if (!resignDate) newErrors.resignDate = 'Cần điền ngày nghỉ việc';
      if (isCustomReason && !customReason.trim()) {
        newErrors.resignReason = 'Hãy nhập lý do nghỉ việc chi tiết';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalReason = isCustomReason ? customReason : selectedReasonOption;
    const normJoin = normalizeDateInput(joinDateStr);

    if (mode === 'RESIGN') {
      onSave({
        ...employee,
        status: 'RESIGNED',
        resignDate,
        resignReason: finalReason,
        notes: notes ? `${notes} (Cập nhật nghỉ ngày ${resignDate})` : `Thôi việc: ${finalReason}`
      });
    } else {
      onSave({
        id: employee?.id, // edit uses ID, add will have no ID
        code,
        fullName,
        gender,
        phone,
        line,
        manager: currentManager,
        joinDate: normJoin,
        status,
        notes,
        birthday,
        birthplace,
        ...((status === 'RESIGNED' || status === 'LEAVE') ? { resignDate, resignReason: finalReason } : { resignDate: undefined, resignReason: undefined })
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div id="modal-container" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-slate-800 transition-all duration-300 transform scale-100">
        
        {/* Header styling depending on mode */}
        <div className={`p-5 flex justify-between items-center ${mode === 'RESIGN' ? 'bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 border-b border-rose-100' : 'bg-gradient-to-r from-slate-50 to-blue-50/20 text-slate-800 border-b border-slate-100'}`}>
          <div className="flex items-center gap-2">
            {mode === 'RESIGN' ? (
              <AlertOctagon size={20} className="text-rose-600" />
            ) : (
              <Briefcase size={20} className="text-blue-600" />
            )}
            <h3 className="font-bold text-base">
              {mode === 'ADD' && 'Thêm Nhân Sự Tuyển Mới'}
              {mode === 'EDIT' && `Chỉnh Sửa Nhân Sự: ${fullName}`}
              {mode === 'RESIGN' && `Thiết Lập Nghỉ Việc: ${fullName}`}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* RESIGNATION FORM MODE */}
          {mode === 'RESIGN' ? (
            <div className="space-y-4">
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex gap-3 text-rose-950 text-xs">
                <div className="mt-0.5">⚠️</div>
                <div>
                  <p className="font-bold mb-1">Xác nhận chuyển trạng thái thôi việc</p>
                  <p className="leading-relaxed">Ủy thác thôi việc đối với nhân viên <strong className="text-rose-700">{fullName}</strong> thuộc chuyền <strong>{line}</strong>. Hệ thống sẽ cập nhật trạng thái đã nghỉ việc và phục vụ cho hạch toán báo cáo biến động.</p>
                </div>
              </div>

              {/* Date of leaving */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-rose-500" /> Ngày Nghỉ Việc Chính Thức <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={resignDate}
                  onChange={(e) => setResignDate(e.target.value)}
                  className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
                {errors.resignDate && <p className="text-rose-600 text-xs mt-1 font-bold">{errors.resignDate}</p>}
              </div>

              {/* Resignation Reason selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Lý do nghỉ việc chính thức <span className="text-rose-500">*</span>
                </label>
                <select
                  value={isCustomReason ? 'Khác' : selectedReasonOption}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Khác') {
                      setIsCustomReason(true);
                      setSelectedReasonOption('Khác');
                    } else {
                      setIsCustomReason(false);
                      setSelectedReasonOption(val);
                    }
                  }}
                  className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white text-slate-800"
                >
                  {RESIGNATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                  <option value="Khác">Lý do khác... (Viết tay dập mẫu)</option>
                </select>
              </div>

              {/* Custom Write In Reason */}
              {isCustomReason && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nhập lý do nghỉ việc chi tiết khác
                  </label>
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Vui lòng nêu chi tiết để bổ túc hồ sơ..."
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  />
                  {errors.resignReason && <p className="text-rose-600 text-xs mt-1 font-bold">{errors.resignReason}</p>}
                </div>
              )}

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Ghi chú bàn giao công việc / Bảo hộ
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Đã bàn giao dụng cụ, ký cam kết bảo mật..."
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>
            </div>
          ) : (
            // ADD / EDIT FORM MODE
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ID Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Mã Nhân Viên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="DCLR-123"
                  />
                  {errors.code && <p className="text-rose-600 text-xs mt-1 font-bold">{errors.code}</p>}
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Họ và Tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Nguyễn Văn A"
                  />
                  {errors.fullName && <p className="text-rose-600 text-xs mt-1 font-bold">{errors.fullName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Giới Tính
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('Nam')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition ${gender === 'Nam' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      🕺 Nam
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Nữ')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition ${gender === 'Nữ' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      💃 Nữ
                    </button>
                  </div>
                </div>

                {/* Telephone */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" /> SĐT liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="0912345678"
                  />
                  {errors.phone && <p className="text-rose-600 text-xs mt-1 font-bold">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Birthday */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" /> Ngày sinh
                  </label>
                  <input
                    type="text"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="20/01/2004"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Định dạng: DD/MM/YYYY</p>
                </div>

                {/* Birthplace */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nơi sinh (Tỉnh/Thành phố)
                  </label>
                  <input
                    type="text"
                    value={birthplace}
                    onChange={(e) => setBirthplace(e.target.value)}
                    className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Bình Dương"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assembly Line */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Dây chuyền tuyển dụng
                  </label>
                  <select
                    value={line}
                    onChange={(e) => setLine(e.target.value as AssemblyLine)}
                    className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                  >
                    <option value="DCLR">Dương chuyền DCLR (Khiêm)</option>
                    <option value="DC RMA BG">Dây chuyền DC RMA BG (Thịnh)</option>
                  </select>
                </div>

                {/* Auto Suggested Manager */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Quản lý tiếp nhận trực tiếp
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentManager}
                    className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Hệ thống đồng bộ tự động theo Dây chuyền</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Onboarding date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" /> Ngày nhận việc chính thức <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={joinDateStr}
                    onChange={(e) => setJoinDateStr(e.target.value)}
                    placeholder="VD: 15/06/2026 hoặc 2026-06-15"
                    className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ gõ tay thủ công rảnh tay</p>
                  {errors.joinDate && <p className="text-rose-600 text-xs mt-1 font-bold">{errors.joinDate}</p>}
                </div>

                {/* Status Level */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Trạng thái nhân sự
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                    className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                  >
                    <option value="WORKING">Đang làm việc tại chuyền</option>
                    <option value="ONBOARDING">Chờ nhận việc (Chưa onboarding)</option>
                    <option value="RESIGNED">Đã thôi việc hẳn (Chấm dứt HĐ)</option>
                    <option value="LEAVE">Nghỉ phép / Nghỉ việc tạm thời</option>
                  </select>
                  {employee && (employee.status === 'RESIGNED' || employee.status === 'LEAVE') && (status === 'WORKING' || status === 'ONBOARDING') && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1 bg-emerald-50 p-2 rounded-lg border border-emerald-150 animate-slide-up">
                      ✨ Nhân sự thay đổi ý định thôi việc. Trạng thái thôi việc sẽ được HỦY và khôi phục hoạt động khi lưu!
                    </p>
                  )}
                </div>
              </div>

              {/* Extra notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Ghi chú điều động / Sức khỏe / Tay nghề
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Hồ sơ gốc có đầy đủ lí lịch, sức khỏe tốt, mong muốn làm gắn bó ca đêm..."
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Resignation or Leave parameters inside EDIT form if they forced status to RESIGNED or LEAVE */}
              {(status === 'RESIGNED' || status === 'LEAVE') && (
                <div className={`p-4 rounded-xl border space-y-3 animate-slide-up ${status === 'RESIGNED' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-200'}`}>
                  <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 ${status === 'RESIGNED' ? 'text-rose-800' : 'text-amber-800'}`}>
                    ⚙️ Thuộc tính {status === 'RESIGNED' ? 'Thôi việc hẳn' : 'Nghỉ vắng / Nghỉ phép'} mở rộng
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase mb-1 ${status === 'RESIGNED' ? 'text-rose-700' : 'text-amber-700'}`}>
                        {status === 'RESIGNED' ? 'Ngày nghỉ hẳn' : 'Ngày bắt đầu nghỉ'}
                      </label>
                      <input
                        type="date"
                        value={resignDate}
                        onChange={(e) => setResignDate(e.target.value)}
                        className={`w-full text-xs font-bold p-2 rounded border text-slate-800 bg-white ${status === 'RESIGNED' ? 'border-rose-200 focus:ring-rose-500' : 'border-amber-200 focus:ring-amber-500'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase mb-1 ${status === 'RESIGNED' ? 'text-rose-700' : 'text-amber-700'}`}>
                        {status === 'RESIGNED' ? 'Dữ liệu lý do thôi việc' : 'Dữ liệu lý do nghỉ phép'}
                      </label>
                      <select
                        value={isCustomReason ? 'Khác' : selectedReasonOption}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Khác') {
                            setIsCustomReason(true);
                            setSelectedReasonOption('Khác');
                          } else {
                            setIsCustomReason(false);
                            setSelectedReasonOption(val);
                          }
                        }}
                        className={`w-full text-[11px] font-semibold p-2 border rounded text-slate-800 bg-white ${status === 'RESIGNED' ? 'border-rose-200' : 'border-amber-200'}`}
                      >
                        {RESIGNATION_REASONS.map((res) => (
                          <option key={`sub-res-${res}`} value={res}>{res}</option>
                        ))}
                        <option value="Khác">Lý do khác...</option>
                      </select>
                    </div>
                  </div>
                  {isCustomReason && (
                    <input
                      type="text"
                      placeholder={status === 'RESIGNED' ? 'Ghi lý do thôi việc chi tiết vào đây...' : 'Ghi lý do nghỉ phép chi tiết vào đây...'}
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className={`w-full text-xs p-2 border rounded text-slate-800 bg-white font-semibold ${status === 'RESIGNED' ? 'border-rose-200' : 'border-amber-200'}`}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              id="btn-modal-save"
              className={`px-5 py-2 text-sm font-bold text-white rounded-xl transition shadow-sm flex items-center gap-1.5 ${mode === 'RESIGN' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {mode === 'RESIGN' ? (
                <>Cắt hợp động & Nghỉ việc</>
              ) : (
                <>
                  <Save size={14} /> Tháo gỡ & Lưu lại
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
