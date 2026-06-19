/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Employee, DayProgress, AssemblyLine } from './types';
import { INITIAL_EMPLOYEES, DRILL_DATES } from './mockData';
import StatsSection from './StatsSection';
import PlanProgressTable from './PlanProgressTable';
import EmployeeTable from './EmployeeTable';
import EmployeeModal from './EmployeeModal';
import AnalyticsSection from './AnalyticsSection';
import { ClipboardList, BarChart3, Users, Settings, Briefcase, Sparkles, RefreshCw, Layers, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- STATE PERSISTENCE CLIENT-SIDE ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dayProgress, setDayProgress] = useState<DayProgress[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const storedEmployees = localStorage.getItem('dclr_employees_v1');
      const storedProgress = localStorage.getItem('dclr_progress_v1');

      if (storedEmployees) {
        let parsed = JSON.parse(storedEmployees) as Employee[];
        // Purge any residual 6000200 test items we seeded in the last turn
        const beforePurgeCount = parsed.length;
        parsed = parsed.filter(e => !e.code.startsWith('6000200'));
        if (parsed.length !== beforePurgeCount) {
          localStorage.setItem('dclr_employees_v1', JSON.stringify(parsed));
        }
        setEmployees(parsed);
      } else {
        // Since we are changing to manual data entry, seed with INITIAL_EMPLOYEES so they have the baseline to start editing.
        const cleanedInitial = INITIAL_EMPLOYEES.filter(e => !e.code.startsWith('6000200'));
        setEmployees(cleanedInitial);
        localStorage.setItem('dclr_employees_v1', JSON.stringify(cleanedInitial));
      }

      if (storedProgress) {
        const parsed = JSON.parse(storedProgress) as DayProgress[];
        const migrated = parsed.map(dp => {
          const updatedTargets = { ...dp.targets };
          for (const key of Object.keys(updatedTargets)) {
            const lineKey = key as AssemblyLine;
            if (updatedTargets[lineKey].demand === undefined) {
              updatedTargets[lineKey].demand = updatedTargets[lineKey].in || 0;
            }
            if (updatedTargets[lineKey].reception === undefined) {
              updatedTargets[lineKey].reception = updatedTargets[lineKey].in || 0;
            }
          }
          return {
            ...dp,
            targets: updatedTargets
          };
        });
        setDayProgress(migrated);
      } else {
        setDayProgress(DRILL_DATES);
        localStorage.setItem('dclr_progress_v1', JSON.stringify(DRILL_DATES));
      }
    } catch (e) {
      console.warn('LocalStorage load failed, starting with empty list:', e);
      setEmployees([]);
      setDayProgress(DRILL_DATES);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // Save changes helper
  const saveEmployeesToStorage = (updatedEmployees: Employee[]) => {
    setEmployees(updatedEmployees);
    try {
      localStorage.setItem('dclr_employees_v1', JSON.stringify(updatedEmployees));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  };

  const saveProgressToStorage = (updatedProgress: DayProgress[]) => {
    setDayProgress(updatedProgress);
    try {
      localStorage.setItem('dclr_progress_v1', JSON.stringify(updatedProgress));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  };

  // Reset to default data
  const handleResetData = () => {
    if (window.confirm('Bạn có chắc chắn muốn XÓA SẠCH toàn bộ danh sách nhân sự hiện tại để làm việc từ đầu không?')) {
      saveEmployeesToStorage([]);
      saveProgressToStorage(DRILL_DATES);
    }
  };

  // --- FILTERS & INTERACTIVE STATE ---
  const [selectedLine, setSelectedLine] = useState<AssemblyLine | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'monitors' | 'recruitments' | 'analytics'>('monitors');

  // Modal controller
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT' | 'RESIGN'>('ADD');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Custom delete confirmation modal state
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // --- EMPLOYEE OPERATION HANDLERS ---
  const handleAddEmployeeClick = () => {
    setSelectedEmployee(null);
    setModalMode('ADD');
    setIsModalOpen(true);
  };

  const handleEditEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalMode('EDIT');
    setIsModalOpen(true);
  };

  const handleResignEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalMode('RESIGN');
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmationId) return;
    const updated = employees.filter(e => e.id !== deleteConfirmationId);
    saveEmployeesToStorage(updated);
    setDeleteConfirmationId(null);
  };

  const handleSaveEmployee = (employeeData: Partial<Employee>) => {
    let updated: Employee[] = [];

    if (modalMode === 'ADD') {
      // Add new employee
      const newEmp: Employee = {
        id: `emp-new-${Date.now()}`,
        code: employeeData.code || `DCLR-${Math.floor(100 + Math.random() * 900)}`,
        fullName: employeeData.fullName || 'Nhân sự mới',
        gender: employeeData.gender || 'Nam',
        phone: employeeData.phone || '',
        line: employeeData.line || 'DCLR',
        manager: employeeData.manager || 'KHIÊM',
        joinDate: employeeData.joinDate || '2026-06-15',
        status: employeeData.status || 'WORKING',
        notes: employeeData.notes || '',
        resignDate: employeeData.resignDate,
        resignReason: employeeData.resignReason
      };
      updated = [...employees, newEmp];
    } else {
      // Edit or Resign employee
      updated = employees.map(emp => {
        if (emp.id === employeeData.id) {
          return {
            ...emp,
            ...employeeData
          } as Employee;
        }
        return emp;
      });
    }

    saveEmployeesToStorage(updated);
    setIsModalOpen(false);
  };

  const handleImportEmployees = (newEmployees: Employee[]) => {
    const updated = [...employees];
    newEmployees.forEach(newEmp => {
      const idx = updated.findIndex(e => e.code === newEmp.code);
      if (idx > -1) {
        updated[idx] = {
          ...updated[idx],
          ...newEmp,
          id: updated[idx].id
        };
      } else {
        updated.push(newEmp);
      }
    });
    saveEmployeesToStorage(updated);
  };

  const handleUpdateJoinDate = (id: string, newDate: string) => {
    const updated = employees.map(emp => {
      if (emp.id === id) {
        return {
          ...emp,
          joinDate: newDate
        };
      }
      return emp;
    });
    saveEmployeesToStorage(updated);
  };

  const handleUpdateLine = (id: string, newLine: AssemblyLine) => {
    const updated = employees.map(emp => {
      if (emp.id === id) {
        return {
          ...emp,
          line: newLine,
          manager: newLine === 'DCLR' ? 'KHIÊM' : 'THỊNH'
        };
      }
      return emp;
    });
    saveEmployeesToStorage(updated);
  };

  const handleUpdateField = (id: string, field: keyof Employee, value: any) => {
    const updated = employees.map(emp => {
      if (emp.id === id) {
        const updatedEmp = {
          ...emp,
          [field]: value
        };
        // Auto update manager if line is changed
        if (field === 'line') {
          updatedEmp.manager = value === 'DCLR' ? 'KHIÊM' : 'THỊNH';
        }
        return updatedEmp;
      }
      return emp;
    });
    saveEmployeesToStorage(updated);
  };

  const handleUpdateTargets = (updatedProgress: DayProgress[]) => {
    saveProgressToStorage(updatedProgress);
  };

  const getTodayString = () => {
    const today = new Date();
    if (today.getFullYear() < 2026) {
      today.setFullYear(2026);
      today.setMonth(5); // June
      today.setDate(18);
    }
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dd = String(today.getDate()).padStart(2, '0');
    const mmm = monthNames[today.getMonth()];
    const yyyy = today.getFullYear();
    const dayName = days[today.getDay()];
    
    return `${dd}-${mmm}-${yyyy} (${dayName})`;
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={40} className="text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Đang khởi tạo hệ thống quản lý...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      
      {/* DECORATION TOP BAR */}
      <header className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md relative overflow-hidden" id="app-header">
        
        {/* Subtle geometric lines */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              QUẢN LÝ NHÂN SỰ DCLR
            </h1>
          </div>

          <div className="flex items-center gap-3 w-auto">
            {/* Clock Widget / simulated time indicator */}
            <div className="bg-slate-800/80 backdrop-blur-xs border border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-4">
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Thời gian Chuyền</span>
                <span className="text-xs font-extrabold text-blue-400">{getTodayString()}</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        </div>
      </header>


      {/* INTERPRETATIVE QUICK CONTROL PANEL */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-stretch md:items-center py-3 gap-4">
          
          {/* TAB CHANGER NAVIGATION */}
          <nav className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto" id="app-tabs">
            <button
              onClick={() => setActiveTab('monitors')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${activeTab === 'monitors' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <Users size={14} />
              <span>GĐ 1: Giám Sát & Danh Sách</span>
            </button>
            <button
              onClick={() => setActiveTab('recruitments')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${activeTab === 'recruitments' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <ClipboardList size={14} />
              <span>GĐ 2: Theo dõi Tiến độ Tuyển dụng</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${activeTab === 'analytics' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <BarChart3 size={14} />
              <span>GĐ 3: Biểu Đồ & Lý do Nghỉ việc</span>
            </button>
          </nav>

          {/* TEAM CHANGER SELECT LINKED DIRECTLY TO DCLR IN IMAGE */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1 rounded-xl">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Phạm vi Chuyền:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedLine('ALL')}
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition ${selectedLine === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                TẤT CẢ
              </button>
              <button
                onClick={() => setSelectedLine('DCLR')}
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition ${selectedLine === 'DCLR' ? 'bg-indigo-650 bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                DCLR (Khiêm)
              </button>
              <button
                onClick={() => setSelectedLine('DC RMA BG')}
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition ${selectedLine === 'DC RMA BG' ? 'bg-indigo-650 bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                RMA BG (Thịnh)
              </button>
            </div>
          </div>

        </div>
      </div>


      {/* MAIN CONTAINER CONTENT BODY */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* STATS OVERVIEW IS CONSTANTLY VISIBLE TO REDUCE BLIND SPOTS */}
        <StatsSection employees={employees} selectedLine={selectedLine} />

        {/* TRANSITIONAL TAB STATES ANIMATED WITH MOTION */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: OVERVIEW DIRECTORY */}
            {activeTab === 'monitors' && (
              <motion.div
                key="monitors-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <EmployeeTable
                  employees={employees}
                  onAddClick={handleAddEmployeeClick}
                  onEditClick={handleEditEmployeeClick}
                  onResignClick={handleResignEmployeeClick}
                  onDeleteClick={handleDeleteEmployee}
                  onImportEmployees={handleImportEmployees}
                  onUpdateJoinDate={handleUpdateJoinDate}
                  onUpdateLine={handleUpdateLine}
                  onUpdateField={handleUpdateField}
                />
              </motion.div>
            )}

            {/* TAB 2: EXCEL RECRUIMENT BOARD */}
            {activeTab === 'recruitments' && (
              <motion.div
                key="recruitments-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <PlanProgressTable
                  employees={employees}
                  dayProgress={dayProgress}
                  onUpdateTargets={handleUpdateTargets}
                />
              </motion.div>
            )}

            {/* TAB 3: HR ANALYTICS CHARTS */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <AnalyticsSection 
                  employees={employees} 
                  selectedLine={selectedLine} 
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>


      {/* CENTRALIZED MODAL ENGINE */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={selectedEmployee}
        mode={modalMode}
      />

      {/* CUSTOM BEAUTIFUL DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmationId && (() => {
          const emp = employees.find(e => e.id === deleteConfirmationId);
          if (!emp) return null;
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
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex-shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-950 text-base leading-6">Xác nhận xóa nhân sự</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        Hành động này sẽ xóa vĩnh viễn dữ liệu của nhân sự khỏi hệ thống và không thể khôi phục lại.
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
                  </div>
                </div>

                {/* Action controls */}
                <div className="px-6 py-4 flex items-center justify-end gap-3 bg-white">
                  <button
                    onClick={() => setDeleteConfirmationId(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm hover:shadow transition cursor-pointer"
                  >
                    Đồng ý xóa
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
