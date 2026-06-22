import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Employee } from './types';
import { X, Printer, Check, Copy, Sliders, ChevronRight, Download, Users, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null; // Selected employee (if from individual click)
  allEmployees: Employee[];   // All employees in the system for bulk operations
  onUpdateEmployee?: (updatedEmp: Employee) => void;
}

export default function EmployeeCardModal({ isOpen, onClose, employee, allEmployees, onUpdateEmployee }: EmployeeCardModalProps) {
  const [plantTitle, setPlantTitle] = useState('NHÀ MÁY SUNHOUSE BÌNH DƯƠNG');
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [isPrinting, setIsPrinting] = useState(false);
  const [bulkFilter, setBulkFilter] = useState<'ALL' | 'DCLR' | 'DC_RMA_BG' | 'NEW'>('ALL');
  
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUploadPhoto = (empId: string, base64: string) => {
    const updatedEmp = allEmployees.find(e => e.id === empId);
    if (updatedEmp && onUpdateEmployee) {
      onUpdateEmployee({
        ...updatedEmp,
        avatar: base64
      });
    }
  };
  
  // Map selected elements to the latest entities from allEmployees to ensure up-to-date values (such as updated avatars)
  const resolvedSelectedEmployees = selectedEmployees.map(emp => {
    return allEmployees.find(e => e.id === emp.id) || emp;
  });
  
  // Initialize selections
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        setSelectedEmployees([employee]);
        setActiveTab('single');
      } else {
        // Default to select all active in bulk mode
        setSelectedEmployees(allEmployees.filter(e => e.status !== 'RESIGNED'));
        setActiveTab('bulk');
      }
    }
  }, [isOpen, employee, allEmployees]);

  if (!isOpen) return null;

  // Filter options for bulk printing
  const getFilteredEmployees = () => {
    if (bulkFilter === 'ALL') {
      return allEmployees;
    } else if (bulkFilter === 'DCLR') {
      return allEmployees.filter(e => e.line === 'DCLR');
    } else if (bulkFilter === 'DC_RMA_BG') {
      return allEmployees.filter(e => e.line === 'DC RMA BG');
    } else if (bulkFilter === 'NEW') {
      // Employees added within the last 15 days or onboarding status
      return allEmployees.filter(e => e.status === 'ONBOARDING' || e.notes?.toLowerCase().includes('excel') || e.code.startsWith('DCLR-'));
    }
    return allEmployees;
  };

  const handleSelectAll = (filtered: Employee[]) => {
    setSelectedEmployees(filtered);
  };

  const handleToggleSelect = (emp: Employee) => {
    if (selectedEmployees.some(e => e.id === emp.id)) {
      setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id));
    } else {
      setSelectedEmployees([...selectedEmployees, emp]);
    }
  };

  // Printing trigger
  const handlePrint = () => {
    setIsPrinting(true);
    // Let DOM update with printing-only view, then print
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  return (
    <>
      {/* 1. REGULAR WORKSPACE VIEW MODAL */}
      <div 
        id="employee-card-modal-container"
        className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={{ maxHeight: '90vh' }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-150 w-full max-w-4xl overflow-hidden flex flex-col font-sans text-slate-800"
        >
          {/* Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Users size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base leading-6">Cấp Thẻ Nhân Viên Sunhouse</h3>
                <p className="text-[11px] text-slate-500 font-medium font-sans">Chuẩn hóa giao diện in thẻ nhựa CR80 Nhà máy Bình Dương</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6" style={{ maxHeight: 'calc(90vh - 130px)' }}>
            {/* Left Options Panel */}
            <div className="md:col-span-5 space-y-4 font-sans text-xs">
              {/* Type Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('single')}
                  className={`flex-1 py-2 text-center rounded-lg font-bold transition-all text-xs cursor-pointer ${
                    activeTab === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Thẻ Đơn ({employee ? employee.fullName : 'Chưa chọn'})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bulk')}
                  className={`flex-1 py-2 text-center rounded-lg font-bold transition-all text-xs cursor-pointer ${
                    activeTab === 'bulk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  In Hàng Loạt ({selectedEmployees.length} thẻ)
                </button>
              </div>

              {/* Plant title Customization */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                <label className="block font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  ✍️ Tên nhà máy / Công ty trên thẻ:
                </label>
                <input
                  type="text"
                  value={plantTitle}
                  onChange={(e) => setPlantTitle(e.target.value.toUpperCase())}
                  className="w-full text-xs font-semibold p-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white rounded-lg text-slate-800 uppercase"
                  placeholder="MẶC ĐỊNH: NHÀ MÁY SUNHOUSE BÌNH DƯƠNG"
                />
              </div>

              {/* Display Bulk filters if tab is bulk */}
              {activeTab === 'bulk' ? (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Lọc nhân sự thẻ:</span>
                    <select
                      value={bulkFilter}
                      onChange={(e) => {
                        const filterVal = e.target.value as any;
                        setBulkFilter(filterVal);
                        // Auto-select filtered list
                        let currentFiltered = allEmployees;
                        if (filterVal === 'DCLR') currentFiltered = allEmployees.filter(e => e.line === 'DCLR');
                        else if (filterVal === 'DC_RMA_BG') currentFiltered = allEmployees.filter(e => e.line === 'DC RMA BG');
                        else if (filterVal === 'NEW') currentFiltered = allEmployees.filter(e => e.status === 'ONBOARDING' || e.notes?.toLowerCase().includes('excel') || e.code.startsWith('DCLR-'));
                        setSelectedEmployees(currentFiltered);
                      }}
                      className="text-[11px] font-bold py-1 px-2 border border-slate-200 roundedbg-white text-slate-700"
                    >
                      <option value="ALL">Tất cả nhân viên</option>
                      <option value="DCLR">Chuyền DCLR (Khiêm)</option>
                      <option value="DC_RMA_BG">Chuyền DC RMA BG (Thịnh)</option>
                      <option value="NEW">Nhân viên mới/Onboarding</option>
                    </select>
                  </div>

                  {/* Scrollable checklists */}
                  <div className="border border-slate-200 rounded-xl bg-white max-h-48 overflow-y-auto px-2 py-1.5 space-y-1">
                    {getFilteredEmployees().map((emp) => {
                      const isChecked = selectedEmployees.some(e => e.id === emp.id);
                      return (
                        <div 
                          key={`chk-${emp.id}`}
                          onClick={() => handleToggleSelect(emp)}
                          className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-[11px] font-semibold transition ${
                            isChecked ? 'bg-indigo-50/50 text-indigo-950' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by click of row
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <div className="truncate max-w-44">
                              <span className="font-bold text-slate-900">{emp.fullName}</span> 
                              <span className="text-[10px] text-slate-450 ml-1.5 font-mono">({emp.code})</span>
                            </div>
                          </div>
                          <span className={`text-[8.5px] px-1 py-0.5 rounded-sm font-bold uppercase ${
                            emp.line === 'DCLR' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {emp.line}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(getFilteredEmployees())}
                      className="flex-1 py-1.5 text-center bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700"
                    >
                      Chọn Tất Cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployees([])}
                      className="flex-1 py-1.5 text-center bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600"
                    >
                      Bỏ Chọn Hết
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-slate-600 space-y-2">
                  <span className="block font-bold text-slate-600 uppercase tracking-wider text-[10px]">Thông tin nhân sự in đơn:</span>
                  {resolvedSelectedEmployees.length > 0 ? (
                    <div className="space-y-1.5 font-sans">
                      <p className="flex justify-between border-b border-dashed border-slate-205 py-0.5"><span className="font-medium text-slate-450">Họ và tên:</span> <strong className="text-slate-800">{resolvedSelectedEmployees[0].fullName}</strong></p>
                      <p className="flex justify-between border-b border-dashed border-slate-205 py-0.5"><span className="font-medium text-slate-450">Mã nhân viên:</span> <strong className="text-slate-800 font-mono">{resolvedSelectedEmployees[0].code}</strong></p>
                      <p className="flex justify-between border-b border-dashed border-slate-205 py-0.5"><span className="font-medium text-slate-450">Giới tính:</span> <strong className="text-slate-800">{resolvedSelectedEmployees[0].gender}</strong></p>
                      <p className="flex justify-between border-b border-dashed border-slate-205 py-0.5"><span className="font-medium text-slate-450">Dây chuyền:</span> <strong className="text-slate-850 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{resolvedSelectedEmployees[0].line}</strong></p>
                      {/* Hidden photo file input for single personnel */}
                      <input 
                        type="file"
                        ref={generalFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64Str = event.target?.result as string;
                            if (base64Str && resolvedSelectedEmployees[0]) {
                              handleUploadPhoto(resolvedSelectedEmployees[0].id, base64Str);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      
                      {resolvedSelectedEmployees[0].avatar ? (
                        <div className="space-y-2 mt-2">
                          <p className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 leading-normal">
                            ✅ Đã có ảnh thẻ 3x4 (Tự động canh lề)
                          </p>
                          <button
                            type="button"
                            onClick={() => generalFileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg shadow-3xs transition"
                          >
                            <Camera size={13} className="text-slate-500" />
                            Thay đổi ảnh thẻ mới
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          <p className="text-[10.5px] text-amber-600 font-bold flex items-center gap-1 bg-amber-50 p-1.5 rounded-lg border border-amber-100 leading-normal">
                            ⚠️ Chưa có ảnh thẻ. Hệ thống sẽ in cùng khung ảnh mẫu hoặc Click "Tải ảnh thẻ" để thêm ảnh 3x4.
                          </p>
                          <button
                            type="button"
                            onClick={() => generalFileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg shadow-2xs transition"
                          >
                            <Camera size={13} />
                            Tải ảnh thẻ 3x4 ngay
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="italic text-slate-400">Không có cấu hình đơn lẻ nào được chọn.</p>
                  )}
                </div>
              )}

              {/* Instructions Guide */}
              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-blue-800 leading-normal">
                <h4 className="font-bold text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 text-blue-900">💡 HƯỚNG DẪN IN CHUẨN THẺ CR80:</h4>
                <ul className="list-disc pl-3.5 space-y-1 text-[10px] text-blue-750 font-medium">
                  <li>Chọn khổ in <strong>Portrait (Dọc)</strong> hoặc <strong>Landscape (Ngang)</strong> tùy phôi thẻ.</li>
                  <li>Bật tùy chọn <strong>"Background graphics" (Đồ họa nền)</strong> trong hộp thoại in của Chrome để hiển thị các thanh sọc và logo màu chuẩn xác.</li>
                  <li>Thiết lập margin bằng <strong>None (Không lề)</strong> để lề khớp tuyệt đối.</li>
                </ul>
              </div>
            </div>

            {/* Right Card Previews Area */}
            <div className="md:col-span-7 bg-slate-100 rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[350px] overflow-y-auto">
              <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-4">Mẫu thẻ in xem trước (Live Preview)</span>
              
              <div className="w-full flex flex-col items-center gap-6">
                {resolvedSelectedEmployees.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-400 font-bold">Vui lòng chọn nhân viên để hiển thị mẫu thẻ</p>
                  </div>
                ) : activeTab === 'single' ? (
                  /* Single Card Preview */
                  <div className="relative shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 select-none">
                    <EmployeeIDCard 
                      employee={resolvedSelectedEmployees[0]} 
                      plantTitle={plantTitle} 
                      interactive={true}
                      onPhotoUpload={(base64) => handleUploadPhoto(resolvedSelectedEmployees[0].id, base64)}
                    />
                  </div>
                ) : (
                  /* Bulk Cards preview list (scrollable rows of badges) */
                  <div className="w-full max-h-96 overflow-y-auto px-4 py-1.5 space-y-4 flex flex-col items-center">
                    {resolvedSelectedEmployees.slice(0, 4).map((emp) => (
                      <div key={`prev-${emp.id}`} className="shadow-lg relative select-none">
                        <EmployeeIDCard 
                          employee={emp} 
                          plantTitle={plantTitle} 
                          interactive={true}
                          onPhotoUpload={(base64) => handleUploadPhoto(emp.id, base64)}
                        />
                      </div>
                    ))}
                    {resolvedSelectedEmployees.length > 4 && (
                      <p className="text-[11px] text-slate-500 font-bold bg-slate-200/65 px-4 py-1.5 rounded-full text-center">
                        ... Và hiển thị {resolvedSelectedEmployees.length - 4} nhân sự tiếp theo khi ra lệnh in chính thức
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3.5">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handlePrint}
              type="button"
              disabled={selectedEmployees.length === 0}
              className={`px-5 py-2 text-sm font-extrabold text-white rounded-xl transition shadow flex items-center gap-2 cursor-pointer ${
                selectedEmployees.length === 0 ? 'bg-slate-350 cursor-not-allowed opacity-50' : 'bg-[#EC1B24] hover:bg-[#c1151c]'
              }`}
            >
              <Printer size={15} />
              In {selectedEmployees.length} Thẻ Nhân Viên
            </button>
          </div>
        </motion.div>
      </div>

      {/* 2. PRINT-READY DIRECT VIEWPORT OVERLAY (ONLY VISIBLE ON window.print() ) */}
      {isPrinting && createPortal(
        <div id="badge-printing-plane" className="absolute inset-0 bg-white z-9999 font-sans text-black">
          {(() => {
            const chunks: Employee[][] = [];
            for (let i = 0; i < resolvedSelectedEmployees.length; i += 10) {
              chunks.push(resolvedSelectedEmployees.slice(i, i + 10));
            }
            return chunks.map((chunk, chunkIndex) => (
              <div key={`print-page-${chunkIndex}`} className="print-page">
                {chunk.map((emp) => (
                  <div 
                    key={`print-badge-${emp.id}`}
                    className="print-card-wrapper inline-block"
                  >
                    <EmployeeIDCard employee={emp} plantTitle={plantTitle} />
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>,
        document.body
      )}
    </>
  );
}

/* HELPER BADGE VIEWPORT COMPONENT matching user design specs */
interface EmployeeIDCardProps {
  employee: Employee;
  plantTitle: string;
  interactive?: boolean;
  onPhotoUpload?: (base64: string) => void;
}

function EmployeeIDCard({ employee, plantTitle, interactive = false, onPhotoUpload }: EmployeeIDCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result && onPhotoUpload) {
        onPhotoUpload(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Use public safe qr code generator that returns precise size
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000000&bgcolor=ffffff&data=${encodeURIComponent(employee.code)}`;
  
  const isNewHire = employee.status === 'ONBOARDING' || 
                    employee.notes?.toLowerCase().includes('mới nhận việc') || 
                    employee.notes?.toLowerCase().includes('mới tuyển') ||
                    employee.notes?.toLowerCase().includes('mới vào') ||
                    employee.notes?.toLowerCase().includes('nhận việc mới');
  
  const isProbation = !isNewHire && (
                    employee.notes?.toLowerCase().includes('thử việc') ||
                    employee.notes?.toLowerCase().includes('probation') ||
                    employee.notes?.toLowerCase().includes('tv')
                  );
  
  // Custom backgrounds: Light pastel yellow for new hire, light pastel blue for probation, white for old staff
  const bgColor = isNewHire ? '#fffbeb' : (isProbation ? '#eef7ff' : '#ffffff');

  // Helper to dynamically adjust name size based on its length to support ultra-long names without overlap or truncating
  const getNameFontSize = (name: string) => {
    const len = name.trim().length;
    if (isNewHire) {
      if (len > 35) return 'text-[8.5px]';
      if (len > 30) return 'text-[9.5px]';
      if (len > 24) return 'text-[10px]';
      if (len > 18) return 'text-[11.5px]';
      return 'text-[13px]';
    } else {
      if (len > 35) return 'text-[9px]';
      if (len > 30) return 'text-[10px]';
      if (len > 24) return 'text-[12px]';
      if (len > 18) return 'text-[14px]';
      return 'text-[16.5px] font-black';
    }
  };

  return (
    <div 
      className="border border-slate-250 rounded-xl overflow-hidden relative shadow-sm font-sans flex flex-col text-black shrink-0 select-none"
      style={{
        width: '85mm',
        height: '55mm',
        boxSizing: 'border-box',
        backgroundColor: bgColor,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Red Header Bar (1/3 of the badge) */}
      <div 
        className="w-full bg-[#EC1B24] flex flex-col items-center justify-center relative flex-shrink-0"
        style={{
          boxSizing: 'border-box',
          height: '68px',
          paddingTop: '6px',
          paddingBottom: '4px',
          backgroundColor: '#EC1B24',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Sunhouse Logo Capsule */}
        <div 
          className="flex items-center justify-center border-[1.5px] border-white bg-[#007A87]"
          style={{
            boxSizing: 'border-box',
            borderRadius: '9999px',
            paddingLeft: '14px',
            paddingRight: '14px',
            paddingTop: '1.5px',
            paddingBottom: '1.5px',
            backgroundColor: '#007A87',
            borderColor: '#FFFFFF',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <span className="font-sans font-black text-[11.5px] uppercase tracking-[0.16em] text-white leading-none">
            SUNHOUSE<span className="text-[6.5px] align-super lowercase font-sans ml-0.5">®</span>
          </span>
        </div>

        {/* SUBTITLE LINE */}
        <span 
          className="text-[9px] font-extrabold tracking-[0.11em] text-center text-white mt-1.5 uppercase leading-none"
          style={{
            textShadow: '0.3px 0.3px 0.5px rgba(0,0,0,0.15)',
          }}
        >
          {plantTitle || 'NHÀ MÁY SUNHOUSE BÌNH DƯƠNG'}
        </span>
      </div>

      {/* Card Body Area */}
      <div 
        className="flex-1 w-full flex items-center relative p-3 pb-4"
        style={{
          backgroundColor: bgColor,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Profile Image Box (Vietnamese standard 3x4 layout ratio) */}
        <div 
          onClick={() => {
            if (interactive && fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          className={`w-[74px] h-[96px] border border-slate-300 bg-slate-100 flex-shrink-0 flex items-center justify-center relative overflow-hidden rounded shadow-3xs ${interactive ? 'cursor-pointer group hover:border-indigo-400 transition-colors duration-200' : ''}`}
          style={{
            borderColor: '#CBD5E1',
            boxSizing: 'border-box',
          }}
        >
          {interactive && (
            <input 
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          )}

          {employee.avatar ? (
            <img 
              src={employee.avatar} 
              alt="Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-1 text-slate-400">
              <Camera size={14} className="mb-0.5 text-slate-350" />
              <span className="text-[7.5px] font-black uppercase leading-tight tracking-wider">Ảnh Thẻ</span>
              <span className="text-[6px] text-slate-450 mt-0.5 font-sans leading-none">3x4</span>
            </div>
          )}

          {interactive && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 pointer-events-none">
              <Camera size={16} className="text-white mb-0.5" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-center leading-none">Tải ảnh 3x4</span>
            </div>
          )}
        </div>

        {/* Middle Area for Name and Info */}
        <div className="flex-1 pl-4 flex flex-col justify-center items-start pr-[115px] select-text">
          {isNewHire && (
            <div className="text-[19px] font-black text-amber-600 tracking-tight mb-1 leading-none uppercase">
              NHẬN VIỆC MỚI
            </div>
          )}
          <h4 className={`font-extrabold text-slate-950 font-sans tracking-tight mb-0.5 text-left leading-tight capitalize break-words w-full ${getNameFontSize(employee.fullName)}`}>
            {employee.fullName.toLowerCase()}
          </h4>
          <p className="text-[11px] font-black text-slate-850 tracking-wider font-mono uppercase text-left">
            ID: <span className="font-black font-mono text-[12px]">{employee.code}</span>
          </p>
          {isProbation && (
            <span className="mt-1 text-[8.5px] font-black text-blue-700 bg-blue-100/80 border border-blue-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Thử Việc
            </span>
          )}
          {isNewHire && (
            <span className="mt-1 text-[8.5px] font-black text-amber-700 bg-amber-100/85 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Nhận Việc Mới
            </span>
          )}
        </div>

        {/* QR Code Frame on the Right corner */}
        <div className="absolute right-3.5 top-0.5 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-[50px] h-[50px] p-0.5 bg-white border border-slate-200/90 rounded shadow-3xs">
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              className="w-full h-full"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* SLANTED BLUE BASE SHAPE AND RED BASE Accent LINE */}
      {/* Slanted blue shape overlay (exactly matching user visual specs) */}
      <div 
        className="absolute h-8 w-34 bg-[#0072bc]"
        style={{
          boxSizing: 'border-box',
          bottom: '10px',
          right: '0',
          backgroundColor: '#0072bc',
          clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
          WebkitClipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      />

      {/* Red bottom accent band */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{
          boxSizing: 'border-box',
          height: '10px',
          backgroundColor: '#EC1B24',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      />
    </div>
  );
}
