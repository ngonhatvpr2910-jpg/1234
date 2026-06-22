import React, { useState, useEffect } from 'react';
import { Employee, AssemblyLine, EmployeeStatus } from './types';
import { Search, UserPlus, FileSpreadsheet, Edit3, Trash2, UserMinus, Settings, MapPin, Calendar, HelpCircle, Filter, Check, AlertTriangle, Printer, Contact } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelImporter from './ExcelImporter';

interface EmployeeTableProps {
  employees: Employee[];
  onAddClick: () => void;
  onEditClick: (employee: Employee) => void;
  onResignClick: (employee: Employee) => void;
  onDeleteClick: (id: string) => void;
  onImportEmployees: (newEmployees: Employee[]) => void;
  onUpdateJoinDate?: (id: string, newDate: string) => void;
  onUpdateLine?: (id: string, newLine: AssemblyLine) => void;
  onUpdateField?: (id: string, field: keyof Employee, value: any) => void;
  onPrintCardClick?: (employee: Employee | null) => void;
}

// Helper to parse manually inputted date formats and return standard YYYY-MM-DD
const normalizeDateToISO = (val: string): string => {
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

  return str;
};



interface InlineLineSelectorProps {
  employeeId: string;
  initialValue: AssemblyLine;
  onSave?: (id: string, newValue: AssemblyLine) => void;
}

function InlineLineSelector({ employeeId, initialValue, onSave }: InlineLineSelectorProps) {
  const [val, setVal] = useState<AssemblyLine>(initialValue);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value as AssemblyLine;
    setVal(newVal);
    if (onSave && newVal !== initialValue) {
      onSave(employeeId, newVal);
    }
  };

  return (
    <select
      value={val}
      onChange={handleChange}
      title="Nhấn để thay đổi dây chuyền trực tiếp"
      className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg px-2 py-1.5 focus:outline-none transition-all cursor-pointer font-sans"
    >
      <option value="DCLR">DCLR (Khiêm)</option>
      <option value="DC RMA BG">DC RMA BG (Thịnh)</option>
    </select>
  );
}



export default function EmployeeTable({
  employees,
  onAddClick,
  onEditClick,
  onResignClick,
  onDeleteClick,
  onImportEmployees,
  onUpdateJoinDate,
  onUpdateLine,
  onUpdateField,
  onPrintCardClick
}: EmployeeTableProps) {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lineFilter, setLineFilter] = useState<AssemblyLine | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'ALL' | 'NEW_HIRE'>('ALL');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [restoreConfirmationEmp, setRestoreConfirmationEmp] = useState<Employee | null>(null);
  
  // Column visibility configuration state
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('dclr_employee_table_cols');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      code: true,
      gender: true,
      birthday: true,
      phone: true,
      line: true,
      joinDate: true,
      status: true,
      resignDetails: true,
    };
  });

  // Dynamic visible columns count for proper colSpan on empty table states
  const visibleColsCount = 3 + Object.values(visibleCols).filter(Boolean).length;
  
  // Sorting state
  const [sortField, setSortField] = useState<'code' | 'fullName' | 'joinDate' | 'status'>('joinDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Helper to check if join date is under 30 days from today
  const isNewHire = (joinDateStr: string): boolean => {
    if (!joinDateStr) return false;
    let year = 0, month = 0, day = 0;
    
    if (joinDateStr.includes('-')) {
      const parts = joinDateStr.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      }
    } else if (joinDateStr.includes('/')) {
      const parts = joinDateStr.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      }
    }
    
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return false;
    
    const joinDate = new Date(year, month - 1, day);
    const today = new Date();
    // Use simulated date of 2026-06-18 as today if system date is before 2026 so that calculation is correct
    if (today.getFullYear() < 2026) {
      today.setFullYear(2026);
      today.setMonth(5); // June
      today.setDate(18);
    }
    joinDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - joinDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < 30;
  };

  // Filter logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm) ||
      (emp.birthplace && emp.birthplace.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.birthday && emp.birthday.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.resignReason && emp.resignReason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.notes && emp.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLine = lineFilter === 'ALL' ? true : emp.line === lineFilter;
    const matchesStatus = statusFilter === 'ALL' 
      ? true 
      : statusFilter === 'NEW_HIRE'
        ? isNewHire(emp.joinDate)
        : emp.status === statusFilter;

    // Filter by Month and Year
    let matchesMonth = true;
    let matchesYear = true;

    // Target date is the event date of leaving/resigning for RESIGNED/LEAVE, or joinDate for ACTIVE/ONBOARDING
    const targetDate = (emp.status === 'RESIGNED' || emp.status === 'LEAVE') 
      ? emp.resignDate 
      : emp.joinDate;

    if (targetDate) {
      let normYear = '';
      let normMonth = ''; // '01' to '12'

      // Clean format checking
      if (targetDate.includes('-')) {
        const parts = targetDate.split('-');
        if (parts[0].length === 4) {
          normYear = parts[0];
          normMonth = parts[1].padStart(2, '0');
        } else {
          normYear = parts[2];
          normMonth = parts[1].padStart(2, '0');
        }
      } else if (targetDate.includes('/')) {
        const parts = targetDate.split('/');
        if (parts[2].length === 4) {
          normYear = parts[2];
          normMonth = parts[1].padStart(2, '0');
        } else {
          normYear = parts[0];
          normMonth = parts[1].padStart(2, '0');
        }
      }

      if (monthFilter !== 'ALL') {
        matchesMonth = normMonth === monthFilter;
      }
      if (yearFilter !== 'ALL') {
        matchesYear = normYear === yearFilter;
      }
    } else {
      if (monthFilter !== 'ALL' || yearFilter !== 'ALL') {
        matchesMonth = false;
        matchesYear = false;
      }
    }

    return matchesSearch && matchesLine && matchesStatus && matchesMonth && matchesYear;
  });

  // Sort logic
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let fieldA = a[sortField] || '';
    let fieldB = b[sortField] || '';
    
    if (sortOrder === 'asc') {
      return fieldA > fieldB ? 1 : -1;
    } else {
      return fieldA < fieldB ? 1 : -1;
    }
  });

  const handleSort = (field: 'code' | 'fullName' | 'joinDate' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Safe CSV export with UTF-8 BOM so Vietnamese loads perfectly in Excel
  const handleExportCSV = () => {
    const headers = [
      'STT',
      'Mã Nhân Viên',
      'Họ và Tên',
      'Giới tính',
      'Ngày sinh',
      'Nơi sinh',
      'Số điện thoại',
      'Dây chuyền',
      'Quản lý tiếp nhận',
      'Ngày nhận việc',
      'Trạng thái',
      'Phòng ban/Nhà máy',
      'Phòng ban/Chuyền',
      'Bộ phận/Tổ',
      'HĐ 1 Pháp nhân',
      'HĐ 1 Bắt đầu',
      'HĐ 1 Kết thúc',
      'Mã HĐ',
      'Loại HĐ 2',
      'HĐ 2 Pháp nhân',
      'HĐ 2 Bắt đầu',
      'HĐ 2 Kết thúc',
      'Ngày nghỉ việc',
      'Lý do nghỉ việc',
      'Ghi chú'
    ];

    const rows = sortedEmployees.map((emp, index) => [
      index + 1,
      emp.code,
      emp.fullName,
      emp.gender,
      emp.birthday || '',
      emp.birthplace || '',
      emp.phone,
      emp.line,
      emp.manager,
      emp.joinDate,
      emp.status === 'WORKING' ? 'Đang làm việc' : emp.status === 'RESIGNED' ? 'Thôi việc (Nghỉ hẳn)' : emp.status === 'LEAVE' ? 'Nghỉ phép / Tạm nghỉ' : 'Chờ nhận việc',
      emp.department || 'NM Bình Dương',
      emp.assemblyGroup || 'Lắp ráp',
      emp.section || 'Lắp ráp RO',
      emp.contract1Legal || '',
      emp.contract1Start || '',
      emp.contract1End || '',
      emp.contractCode || '',
      emp.contractType2 || '',
      emp.contract2Legal || '',
      emp.contract2Start || '',
      emp.contract2End || '',
      emp.resignDate || '',
      emp.resignReason || '',
      emp.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Name the file cleanly with date stamp
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Báo_cáo_Nhân_sự_DCLR_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="employee-directory">
      
      {/* EXCEL IMPORTER DRAWER PANEL */}
      {isImporterOpen && (
        <div className="p-6 border-b border-slate-100 bg-slate-50/10">
          <ExcelImporter 
            onImport={onImportEmployees}
            onClose={() => setIsImporterOpen(false)}
            existingEmployees={employees}
          />
        </div>
      )}

      {/* FILTER PANEL */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Danh Sách Quản Lý Chi Tiết</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tìm kiếm, lọc bộ phận, xem lý do nghỉ việc chi tiết và vận hành nhân viên</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Add Employee Button (Primary Action) */}
            <button
              onClick={onAddClick}
              id="btn-add-employee"
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-100 hover:shadow-blue-250 transition-all cursor-pointer active:scale-98"
            >
              <UserPlus size={16} />
              <span>Thêm Nhân Sự Mới</span>
            </button>

            {/* Bulk Badge Printing Button */}
            <button
              type="button"
              onClick={() => onPrintCardClick && onPrintCardClick(null)}
              id="btn-bulk-badge-print"
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 bg-[#EC1B24] hover:bg-[#c1151c] text-white px-4.5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>In Thẻ Hàng Loạt</span>
            </button>

            {/* Export CSV Button (Secondary) */}
            <button
              onClick={handleExportCSV}
              id="btn-export-csv"
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:text-slate-950 transition-all border border-slate-200"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              <span>Xuất File Excel/CSV</span>
            </button>

            {/* Import Excel Button (Auxiliary/Low-key) */}
            <button
              onClick={() => setIsImporterOpen(!isImporterOpen)}
              id="btn-import-excel"
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition border ${isImporterOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'}`}
            >
              <FileSpreadsheet size={16} className={isImporterOpen ? 'text-emerald-700' : 'text-slate-400'} />
              <span>{isImporterOpen ? 'Đóng Bảng Nhập Excel' : 'Hòa Nhập File Excel Cũ'}</span>
            </button>

            {/* Column Visibility Configuration Dropdown */}
            <div className="relative inline-block text-left" id="col-toggle-dropdown-container">
              <button
                type="button"
                onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                id="btn-toggle-columns"
                className={`w-full flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl text-sm font-semibold transition border bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer shadow-3xs ${isColMenuOpen ? 'border-indigo-300 ring-2 ring-indigo-50/50' : ''}`}
                title="Ẩn hoặc hiện các cột trong bảng danh sách nhân sự"
              >
                <Settings size={16} className={`text-indigo-600 ${isColMenuOpen ? 'animate-spin' : ''}`} />
                <span>Ẩn/Hiện Cột</span>
              </button>

              {isColMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsColMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-150 ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden font-sans normal-case text-xs text-slate-700">
                    <div className="px-4 py-3 bg-slate-50 font-bold text-slate-605 border-b border-slate-100 text-[11px] uppercase tracking-wider flex items-center justify-between">
                      <span>Cấu hình cột hiển thị</span>
                      <button 
                        onClick={() => {
                          const allTrue = {
                            code: true,
                            gender: true,
                            birthday: true,
                            phone: true,
                            line: true,
                            joinDate: true,
                            status: true,
                            resignDetails: true
                          };
                          setVisibleCols(allTrue);
                          try { localStorage.setItem('dclr_employee_table_cols', JSON.stringify(allTrue)); } catch(_) {}
                        }}
                        className="text-[10px] text-blue-650 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                      >
                        Khôi phục
                      </button>
                    </div>
                    <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
                      {[
                        { key: 'code', label: 'Mã Nhân Viên' },
                        { key: 'gender', label: 'Phái / Giới tính' },
                        { key: 'birthday', label: 'Ngày thôi nôi / Ngày sinh' },
                        { key: 'phone', label: 'Số điện thoại liên lạc' },
                        { key: 'line', label: 'Dây chuyền làm việc' },
                        { key: 'joinDate', label: 'Ngày nhận việc / Thử việc' },
                        { key: 'status', label: 'Trạng thái hoạt động' },
                        { key: 'resignDetails', label: 'Chi tiết thôi việc / Nghỉ phép' }
                      ].map((col) => {
                        const isChecked = visibleCols[col.key];
                        return (
                          <label 
                            key={`col-check-${col.key}`}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition select-none text-xs font-semibold text-slate-700 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const updated = { ...visibleCols, [col.key]: !isChecked };
                                setVisibleCols(updated);
                                try {
                                  localStorage.setItem('dclr_employee_table_cols', JSON.stringify(updated));
                                } catch (_) {}
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* INPUT FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Tên, Mã NV, SĐT, lý do..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-800 placeholder-slate-400 transition"
            />
          </div>

          {/* Line Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">Chuyền:</span>
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value as AssemblyLine | 'ALL')}
              className="w-full py-2 px-3 border border-slate-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-semibold"
            >
              <option value="ALL">Tất cả chuyền</option>
              <option value="DCLR">Chuyền DCLR</option>
              <option value="DC RMA BG">Chuyền RMA BG</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2 px-3 border border-slate-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-bold text-blue-800"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="WORKING">Đang làm việc</option>
              <option value="ONBOARDING">Chờ nhận việc (Staged)</option>
              <option value="NEW_HIRE">Nhận việc mới (&lt; 30 ngày)</option>
              <option value="RESIGNED">Thôi việc hẳn</option>
              <option value="LEAVE">Nghỉ phép / Tạm nghỉ</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">Tháng:</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full py-2 px-3 border border-slate-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-semibold"
            >
              <option value="ALL">Tất cả tháng</option>
              {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, '0');
                return (
                  <option key={`filter-month-${m}`} value={m}>Tháng {i + 1}</option>
                );
              })}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">Năm:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full py-2 px-3 border border-slate-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-semibold"
            >
              <option value="ALL">Tất cả năm</option>
              <option value="2023">Năm 2023</option>
              <option value="2024">Năm 2024</option>
              <option value="2025">Năm 2025</option>
              <option value="2026">Năm 2026</option>
              <option value="2027">Năm 2027</option>
            </select>
          </div>

          {/* Metrics summary bubble */}
          <div className="bg-slate-100 border border-slate-250 rounded-xl px-3.5 py-1.5 flex items-center justify-between text-xs text-slate-600 font-extrabold">
            <span>Tìm thấy:</span>
            <span className="bg-indigo-650 bg-blue-600 text-white font-black px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap">
              {filteredEmployees.length} NS
            </span>
          </div>
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse" id="tbl-employees-list">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-100 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4 w-12 text-center">STT</th>
              {visibleCols.code && (
                <th className="py-3 px-4 cursor-pointer select-none" onClick={() => handleSort('code')}>
                  Mã NV {sortField === 'code' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
              )}
              <th className="py-3 px-4 cursor-pointer select-none min-w-[200px]" onClick={() => handleSort('fullName')}>
                Họ và Tên {sortField === 'fullName' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              {visibleCols.gender && (
                <th className="py-3 px-3 text-center">Phái</th>
              )}
              {visibleCols.birthday && (
                <th className="py-3 px-4 text-center min-w-[100px]">Ngày sinh</th>
              )}
              {visibleCols.phone && (
                <th className="py-3 px-4">Điện thoại</th>
              )}
              {visibleCols.line && (
                <th className="py-3 px-4">Dây chuyền</th>
              )}
              {visibleCols.joinDate && (
                <th className="py-3 px-4 cursor-pointer select-none" onClick={() => handleSort('joinDate')}>
                  Ngày nhận việc {sortField === 'joinDate' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
              )}
              {visibleCols.status && (
                <th className="py-3 px-4 relative select-none text-[10px] uppercase font-bold tracking-wider text-slate-600">
                  <div className="flex items-center justify-between gap-1.5">
                    <span 
                      className="cursor-pointer hover:text-slate-900 transition flex items-center gap-1"
                      onClick={() => handleSort('status')}
                      title="Sắp xếp trạng thái"
                    >
                      Trạng thái {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    
                    {/* Floating Filter trigger button inside the column header */}
                    <div className="relative inline-block text-left" id="status-header-filter">
                      <button
                        type="button"
                        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                        className={`p-1 rounded-md hover:bg-slate-200 transition-colors ${statusFilter !== 'ALL' ? 'text-indigo-600 bg-indigo-50 font-extrabold border border-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Lọc nhanh trạng thái"
                      >
                        <Filter size={11} />
                      </button>

                      {isStatusMenuOpen && (
                        <>
                          {/* Overlay backdrop to close the menu on clicking outside */}
                          <div className="fixed inset-0 z-40" onClick={() => setIsStatusMenuOpen(false)}></div>
                          
                          {/* Status options dropdown list */}
                          <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-xl border border-slate-100 ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden font-sans normal-case text-xs text-slate-700">
                            <div className="px-3 py-2 bg-slate-50 font-bold text-slate-500 border-b border-slate-100 text-[10px] uppercase tracking-wider">
                              Lọc nhanh trạng thái
                            </div>
                            <div className="p-1 space-y-0.5">
                              <button
                                onClick={() => { setStatusFilter('ALL'); setIsStatusMenuOpen(false); }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition text-xs font-semibold ${statusFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                <span>Tất cả trạng thái</span>
                                {statusFilter === 'ALL' && <Check size={13} className="text-indigo-600" />}
                              </button>
                              <button
                                onClick={() => { setStatusFilter('WORKING'); setIsStatusMenuOpen(false); }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition text-xs font-semibold ${statusFilter === 'WORKING' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                  Đang làm việc
                                </span>
                                {statusFilter === 'WORKING' && <Check size={13} className="text-indigo-600" />}
                              </button>
                              <button
                                onClick={() => { setStatusFilter('ONBOARDING'); setIsStatusMenuOpen(false); }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition text-xs font-semibold ${statusFilter === 'ONBOARDING' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                  Chờ nhận việc
                                </span>
                                {statusFilter === 'ONBOARDING' && <Check size={13} className="text-indigo-600" />}
                              </button>
                              <button
                                onClick={() => { setStatusFilter('NEW_HIRE'); setIsStatusMenuOpen(false); }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition text-xs font-semibold ${statusFilter === 'NEW_HIRE' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                  Nhận việc mới
                                </span>
                                {statusFilter === 'NEW_HIRE' && <Check size={13} className="text-indigo-600" />}
                              </button>
                              <button
                                onClick={() => { setStatusFilter('RESIGNED'); setIsStatusMenuOpen(false); }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition text-xs font-semibold ${statusFilter === 'RESIGNED' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                  Đã nghỉ việc
                                </span>
                                {statusFilter === 'RESIGNED' && <Check size={13} className="text-indigo-600" />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </th>
              )}
              {visibleCols.resignDetails && (
                <th className="py-3 px-5 text-slate-705 bg-rose-50/20 font-bold min-w-[200px]">Chi tiết Nghỉ việc (Nếu có)</th>
              )}
              <th className="py-3 px-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={visibleColsCount} className="py-16 text-center">
                  <div className="max-w-md mx-auto flex flex-col items-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-3 border border-emerald-100">
                      <FileSpreadsheet size={36} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Chưa Có Nhân Sự Nào Trong Hệ Thống</h4>
                    <p className="text-xs text-slate-500 mt-2 text-center max-w-sm">
                      Do bạn đã xóa dữ liệu giả lập, vui lòng nhấn nút <strong className="text-emerald-600 font-extrabold">"Nhập Từ File Excel"</strong> ở góc phải phía trên hoặc nút dưới đây để bắt đầu.
                    </p>
                    <button
                      onClick={() => setIsImporterOpen(true)}
                      className="mt-4 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Nhập file Excel ngay</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : sortedEmployees.length === 0 ? (
              <tr>
                <td colSpan={visibleColsCount} className="py-12 text-center">
                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-3">
                      <Search size={32} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">Không tìm thấy nhân sự phù hợp</h4>
                    <p className="text-xs text-slate-500 mt-1">Vui lòng điều chỉnh từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedEmployees.map((emp, index) => {
                const isWorking = emp.status === 'WORKING';
                const isResigned = emp.status === 'RESIGNED';
                const isOnboarding = emp.status === 'ONBOARDING';

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-400 text-xs">
                      {index + 1}
                    </td>

                    {/* Member Code */}
                    {visibleCols.code && (
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 text-xs text-center">
                        {emp.code}
                      </td>
                    )}

                    {/* Name */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-bold text-slate-900 text-sm tracking-tight whitespace-nowrap">{emp.fullName}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {emp.section && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                              {emp.section}
                            </span>
                          )}
                          {emp.notes && <span className="text-[10px] text-slate-500 font-medium">{emp.notes}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Gender */}
                    {visibleCols.gender && (
                      <td className="py-3 px-3 text-slate-600 text-xs text-center font-medium">
                        {emp.gender}
                      </td>
                    )}

                    {/* Birthday */}
                    {visibleCols.birthday && (
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs text-center whitespace-nowrap min-w-[100px]">
                        {emp.birthday || '-'}
                      </td>
                    )}

                    {/* Phone */}
                    {visibleCols.phone && (
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs text-center whitespace-nowrap">
                        {emp.phone || '-'}
                      </td>
                    )}

                    {/* Line */}
                    {visibleCols.line && (
                      <td className="py-2.5 px-4 min-w-[140px]">
                        <div className="flex flex-col gap-1 items-start">
                          <InlineLineSelector employeeId={emp.id} initialValue={emp.line} onSave={onUpdateLine} />
                          <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">QL: {emp.manager}</div>
                        </div>
                      </td>
                    )}

                    {/* Onboarding Date */}
                    {visibleCols.joinDate && (
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs text-center whitespace-nowrap">
                        {emp.joinDate ? emp.joinDate.split('-').reverse().join('/') : '-'}
                      </td>
                    )}

                    {/* Status Badge */}
                    {visibleCols.status && (
                      <td className="py-3.5 px-4">
                        {isWorking && (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                              Đang làm việc
                            </span>
                            {isNewHire(emp.joinDate) && (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wide">
                                Nhận việc mới
                              </span>
                            )}
                          </div>
                        )}
                        {isResigned && (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                            Thôi việc (Nghỉ hẳn)
                          </span>
                        )}
                        {emp.status === 'LEAVE' && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse-gentle"></span>
                            Nghỉ phép / Tạm nghỉ
                          </span>
                        )}
                        {isOnboarding && (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 animate-pulse-gentle">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                              Chờ nhận việc
                            </span>
                            {isNewHire(emp.joinDate) && (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wide">
                                Nhận việc mới
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Resignation Details Columns */}
                    {visibleCols.resignDetails && (
                      <td className={`py-4 px-5 text-xs border-l border-slate-100 ${isResigned ? 'bg-rose-50/10' : emp.status === 'LEAVE' ? 'bg-amber-50/10' : ''}`}>
                        {isResigned ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-slate-600 font-medium">
                              <Calendar size={12} className="text-slate-400" />
                              Ngày thôi việc: <span className="font-bold text-rose-700">{emp.resignDate}</span>
                            </div>
                            {emp.resignReason && (
                              <div className="text-rose-600 bg-rose-50/50 p-1 rounded font-semibold border-l-2 border-rose-400 max-w-sm whitespace-normal leading-relaxed text-[11px]">
                                {emp.resignReason}
                              </div>
                            )}
                          </div>
                        ) : emp.status === 'LEAVE' ? (
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-1 text-slate-600 font-medium">
                              <Calendar size={12} className="text-slate-400" />
                              Nghỉ từ ngày: <span className="font-bold text-amber-700">{emp.resignDate}</span>
                            </div>
                            {emp.resignReason && (
                              <div className="text-amber-800 bg-amber-50/50 p-1 rounded font-semibold border-l-2 border-amber-400 max-w-sm whitespace-normal leading-relaxed text-[11px]">
                                {emp.resignReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">- Đang hoạt động -</span>
                        )}
                      </td>
                    )}

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Terminate trigger */}
                        {!isResigned && (
                          <button
                            onClick={() => onResignClick(emp)}
                            title="Xử lý nghỉ việc"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <UserMinus size={15} />
                          </button>
                        )}

                         {/* Restore button (hủy thôi việc, quay lại làm việc) */}
                         {isResigned && (
                           <button
                             onClick={() => setRestoreConfirmationEmp(emp)}
                             title="Hủy thôi việc & Khôi phục làm việc"
                             className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition animate-pulse"
                           >
                             <UserPlus size={15} />
                           </button>
                         )}
 
                         {/* Return to work button for Leave status */}
                         {emp.status === 'LEAVE' && (
                           <button
                             onClick={() => setRestoreConfirmationEmp(emp)}
                             title="Quay lại làm việc"
                             className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                           >
                             <UserPlus size={15} />
                           </button>
                         )}
                        
                        {/* Edit button */}
                        <button
                          onClick={() => onEditClick(emp)}
                          title="Sửa thông tin"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit3 size={15} />
                        </button>

                        {/* Print ID Card Button */}
                        <button
                          onClick={() => onPrintCardClick && onPrintCardClick(emp)}
                          title="In thẻ nhân viên Sunhouse"
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        >
                          <Printer size={15} />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => onDeleteClick(emp.id)}
                          title="Xóa nhân viên khỏi hệ thống"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CUSTOM BEAUTIFUL RESTORE/CANCEL RESIGNATION CONFIRMATION MODAL */}
      <AnimatePresence>
        {restoreConfirmationEmp && (() => {
          const emp = restoreConfirmationEmp;
          const isResigned = emp.status === 'RESIGNED';
          
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-2xl shadow-xl border border-slate-150 max-w-md w-full overflow-hidden"
              >
                {/* Header info */}
                <div className="p-6 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex-shrink-0">
                      <UserPlus size={24} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-950 text-base leading-6">
                        {isResigned ? "Hủy quyết định thôi việc" : "Hủy kỳ nghỉ phép & Đi học lại"}
                      </h3>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        {isResigned 
                          ? "Nhân viên đã thay đổi ý định và muốn tiếp tục đồng hành cùng công ty. Toàn bộ thông tin thôi việc liên quan sẽ được gỡ bỏ."
                          : "Nhân viên kết thúc thời gian nghỉ phép hoặc nghỉ tạm thời trước thời hạn và quay lại làm việc bình thường."
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main content body showing targeted employee details */}
                <div className="bg-slate-50/70 border-y border-slate-100 px-6 py-4 space-y-3">
                  <div className="grid grid-cols-3 gap-y-2 text-xs">
                    <span className="text-slate-400 font-medium col-span-1">Mã nhân sự:</span>
                    <span className="font-mono font-bold text-slate-700 col-span-2">{emp.code}</span>

                    <span className="text-slate-400 font-medium col-span-1">Họ và Tên:</span>
                    <span className="font-bold text-slate-900 col-span-2">{emp.fullName}</span>

                    <span className="text-slate-400 font-medium col-span-1">Dây chuyền:</span>
                    <span className="font-semibold text-slate-800 col-span-2">{emp.line}</span>

                    {emp.resignDate && (
                      <>
                        <span className="text-slate-400 font-medium col-span-1">Ngày {isResigned ? "thôi" : "bắt đầu"} nghỉ:</span>
                        <span className="font-semibold text-rose-600 col-span-2">{emp.resignDate}</span>
                      </>
                    )}

                    {emp.resignReason && (
                      <>
                        <span className="text-slate-400 font-medium col-span-1">Lý do ghi nhận:</span>
                        <span className="italic text-slate-600 col-span-2 font-medium bg-white/85 px-2 py-1 rounded border border-slate-100">{emp.resignReason}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Call-to-action warning */}
                <div className="px-6 py-3 bg-emerald-50/40 text-emerald-800 text-[11px] font-semibold border-b border-slate-100 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-emerald-600 flex-shrink-0" />
                  <span>Xác nhận khôi phục lại trạng thái <strong>ĐANG LÀM VIỆC</strong> cho nhân sự này?</span>
                </div>

                {/* Action controls */}
                <div className="px-6 py-4 flex items-center justify-end gap-3 bg-white">
                  <button
                    onClick={() => setRestoreConfirmationEmp(null)}
                    type="button"
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    onClick={() => {
                      if (onUpdateField) {
                        onUpdateField(emp.id, 'status', 'WORKING');
                      }
                      setRestoreConfirmationEmp(null);
                    }}
                    type="button"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm hover:shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Hủy thôi việc & Khôi phục</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
