import React, { useState } from 'react';
import { Employee, DayProgress, AssemblyLine } from './types';
import { HelpCircle, RefreshCw, Pencil, Check, X, ClipboardList, Target, TrendingUp, Sparkles, UserCheck, Plus, Trash2, Calendar, EyeOff } from 'lucide-react';
import { LINE_CAPACITIES } from './mockData';

interface PlanProgressTableProps {
  employees: Employee[];
  dayProgress: DayProgress[];
  onUpdateTargets: (updatedProgress: DayProgress[]) => void;
  lineCapacities?: Record<AssemblyLine, { target: number; currentBase: number }>;
  onUpdateLineCapacities?: (updatedCapacities: Record<AssemblyLine, { target: number; currentBase: number }>) => void;
}

// Helper to parse manually inputted date formats and return standard YYYY-MM-DD
export const normalizeDateToISO = (val: string): string => {
  if (!val) return '';
  const str = val.trim();

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

// Helper to convert standard YYYY-MM-DD input date to string like '15-Jun'
export const formatToShortDate = (yyyyMmDd: string): string => {
  if (!yyyyMmDd) return '';
  const parts = yyyyMmDd.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthsNames[month - 1] || 'Jun';
    return `${day}-${monthName}`;
  }
  return yyyyMmDd;
};

// Helper to get today's date in YYYY-MM-DD format
export const getTodayISO = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  if (y >= 2026) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${month}-${day}`;
  }
  return '2026-06-17';
};


export default function PlanProgressTable({ 
  employees, 
  dayProgress, 
  onUpdateTargets,
  lineCapacities,
  onUpdateLineCapacities
}: PlanProgressTableProps) {
  const capacities = lineCapacities || LINE_CAPACITIES;
  const todayISO = getTodayISO();

  const handleCapacityChange = (line: AssemblyLine, value: number) => {
    if (onUpdateLineCapacities) {
      onUpdateLineCapacities({
        ...capacities,
        [line]: {
          ...capacities[line],
          target: value
        }
      });
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempProgress, setTempProgress] = useState<DayProgress[]>([]);
  
  // Custom states for hiding/unhiding and removing column choices
  const [hiddenDays, setHiddenDays] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dclr_plan_progress_hidden_days');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });
  const [activeChoiceColumn, setActiveChoiceColumn] = useState<number | null>(null);
  const [isHiddenMenuOpen, setIsHiddenMenuOpen] = useState(false);
  
  // Toggle for automated syncing from Employee list vs Manual inputting
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dclr_autosync_v1') !== 'false';
    } catch {
      return true;
    }
  });

  // Toggle edit state
  const startEditing = () => {
    // Clone dayProgress deeply to avoid mutating state directly
    setTempProgress(
      dayProgress.map(dp => ({
        ...dp,
        targets: Object.keys(dp.targets).reduce((acc, line) => {
          const lKey = line as AssemblyLine;
          const demandVal = dp.targets[lKey].demand ?? (dp.targets[lKey].in || 0);
          acc[lKey] = {
            in: dp.targets[lKey].in || 0,
            out: dp.targets[lKey].out || 0,
            demand: demandVal,
            reception: dp.targets[lKey].reception ?? demandVal,
            actualIn: dp.targets[lKey].actualIn ?? 0,
            actualOut: dp.targets[lKey].actualOut ?? 0,
          };
          return acc;
        }, {} as Record<AssemblyLine, any>)
      }))
    );
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEditing = () => {
    onUpdateTargets(tempProgress);
    setIsEditing(false);
  };

  const handleCellChange = (
    dayIndex: number, 
    line: AssemblyLine, 
    field: 'demand' | 'reception' | 'actualIn' | 'actualOut', 
    val: string
  ) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const updated = [...tempProgress];
    
    if (!updated[dayIndex].targets[line]) {
      updated[dayIndex].targets[line] = { 
        in: 0, 
        out: 0, 
        demand: 0, 
        reception: 0,
        actualIn: 0,
        actualOut: 0
      };
    }
    
    updated[dayIndex].targets[line][field] = num;
    
    // Automatically link: if Demand is changed, Reception Plan follows it automatically
    if (field === 'demand') {
      updated[dayIndex].targets[line].reception = num;
    }
    
    setTempProgress(updated);
  };

  // Generate automatically calculated consecutive next date column
  const handleAddDayColumn = () => {
    let nextDateStr = '2026-06-25';
    if (tempProgress.length > 0) {
      const lastDay = tempProgress[tempProgress.length - 1];
      if (lastDay && lastDay.fullDate) {
        const lastDateObj = new Date(lastDay.fullDate);
        if (!isNaN(lastDateObj.getTime())) {
          lastDateObj.setDate(lastDateObj.getDate() + 1);
          const yyyy = lastDateObj.getFullYear();
          const mm = String(lastDateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(lastDateObj.getDate()).padStart(2, '0');
          nextDateStr = `${yyyy}-${mm}-${dd}`;
        }
      }
    }

    const shortDate = formatToShortDate(nextDateStr);
    const newDay: DayProgress = {
      date: shortDate,
      fullDate: nextDateStr,
      targets: {
        DCLR: { in: 0, out: 0, demand: 0, reception: 0, actualIn: 0, actualOut: 0 },
        'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0, actualIn: 0, actualOut: 0 }
      }
    };
    setTempProgress([...tempProgress, newDay]);
  };

  // Remove a date column from the draft list
  const handleDeleteDayColumn = (indexToDelete: number) => {
    const updated = tempProgress.filter((_, idx) => idx !== indexToDelete);
    setTempProgress(updated);
  };

  // Dynamic helper to compute actual onboarding arrivals from list
  const getActualReceivedCount = (line: AssemblyLine, dateStr: string) => {
    const targetISO = normalizeDateToISO(dateStr);
    return employees.filter(emp => {
      const isLineMatch = emp.line === line;
      const empDateISO = normalizeDateToISO(emp.joinDate || '');
      const isDateMatch = empDateISO === targetISO;
      const isStatusMatch = emp.status === 'WORKING' || emp.status === 'ONBOARDING';
      return isLineMatch && isDateMatch && isStatusMatch;
    }).length;
  };

  // Dynamic helper to compute actual resignations from list
  const getActualResignedCount = (line: AssemblyLine, dateStr: string) => {
    const targetISO = normalizeDateToISO(dateStr);
    return employees.filter(emp => {
      const isLineMatch = emp.line === line;
      const empDateISO = normalizeDateToISO(emp.resignDate || '');
      const isDateMatch = empDateISO === targetISO;
      const isStatusMatch = emp.status === 'RESIGNED' || emp.status === 'LEAVE';
      return isLineMatch && isDateMatch && isStatusMatch;
    }).length;
  };

  // Resolve counts depending on autoSync toggle
  const getReceivedCount = (line: AssemblyLine, day: DayProgress) => {
    if (autoSync) {
      return getActualReceivedCount(line, day.fullDate);
    } else {
      return day.targets[line].actualIn ?? 0;
    }
  };

  const getResignedCount = (line: AssemblyLine, day: DayProgress) => {
    if (autoSync) {
      return getActualResignedCount(line, day.fullDate);
    } else {
      return day.targets[line].actualOut ?? 0;
    }
  };

  const getDemandCount = (line: AssemblyLine, day: DayProgress) => {
    if (autoSync) {
      const iso = normalizeDateToISO(day.fullDate);
      if (iso >= todayISO) {
        const resigns = getActualResignedCount(line, day.fullDate);
        const onboardings = getActualReceivedCount(line, day.fullDate);
        return Math.max(resigns, onboardings);
      }
    }
    return day.targets[line].demand ?? 0;
  };

  // Active dates for stats computations
  const baseDaysList = isEditing ? tempProgress : dayProgress;

  const currentDaysList = React.useMemo(() => {
    if (!autoSync) return baseDaysList;

    const extraDatesSet = new Set<string>();
    employees.forEach(emp => {
      if (emp.resignDate && (emp.status === 'RESIGNED' || emp.status === 'LEAVE')) {
        const iso = normalizeDateToISO(emp.resignDate);
        if (iso && iso >= todayISO) extraDatesSet.add(iso);
      }
      if (emp.joinDate && (emp.status === 'WORKING' || emp.status === 'ONBOARDING')) {
        const iso = normalizeDateToISO(emp.joinDate);
        if (iso && iso >= todayISO) extraDatesSet.add(iso);
      }
    });

    const existingDates = new Set<string>();
    baseDaysList.forEach(day => {
      const iso = normalizeDateToISO(day.fullDate);
      if (iso) existingDates.add(iso);
    });

    const mergedList = [...baseDaysList];

    // Filter to find sorted missing dates
    const missingDates = Array.from(extraDatesSet)
      .filter(iso => !existingDates.has(iso))
      .sort((a, b) => a.localeCompare(b));

    // For each missing date, map it to a DayProgress structure
    missingDates.forEach(isoDate => {
      const short = formatToShortDate(isoDate);
      mergedList.push({
        date: short,
        fullDate: isoDate,
        targets: {
          DCLR: { in: 0, out: 0, demand: 0, reception: 0, actualIn: 0, actualOut: 0 },
          'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0, actualIn: 0, actualOut: 0 }
        }
      });
    });

    // Sort chronologically
    return mergedList.sort((a, b) => {
      const d1 = normalizeDateToISO(a.fullDate);
      const d2 = normalizeDateToISO(b.fullDate);
      return d1.localeCompare(d2);
    });
  }, [baseDaysList, autoSync, employees, todayISO]);

  // Filtered list of days excluding the hidden ones
  const visibleDaysList = React.useMemo(() => {
    return currentDaysList.filter(day => !hiddenDays.includes(day.fullDate));
  }, [currentDaysList, hiddenDays]);

  // --- STATS COMPUTING ---
  const lineDetails = {
    DCLR: {
      manager: 'KHIÊM',
      demandTotal: visibleDaysList.reduce((sum, day) => sum + getDemandCount('DCLR', day), 0),
      receptionPlanTotal: visibleDaysList.reduce((sum, day) => {
        const isPastOrToday = normalizeDateToISO(day.fullDate) <= todayISO;
        return isPastOrToday ? sum + getDemandCount('DCLR', day) : sum;
      }, 0),
      actualReceivedTotal: visibleDaysList.reduce((sum, day) => sum + getReceivedCount('DCLR', day), 0),
      actualResignedTotal: visibleDaysList.reduce((sum, day) => sum + getResignedCount('DCLR', day), 0),
    },
    RMA: {
      manager: 'THỊNH',
      demandTotal: visibleDaysList.reduce((sum, day) => sum + getDemandCount('DC RMA BG', day), 0),
      receptionPlanTotal: visibleDaysList.reduce((sum, day) => {
        const isPastOrToday = normalizeDateToISO(day.fullDate) <= todayISO;
        return isPastOrToday ? sum + getDemandCount('DC RMA BG', day) : sum;
      }, 0),
      actualReceivedTotal: visibleDaysList.reduce((sum, day) => sum + getReceivedCount('DC RMA BG', day), 0),
      actualResignedTotal: visibleDaysList.reduce((sum, day) => sum + getResignedCount('DC RMA BG', day), 0),
    }
  };

  const overall = {
    demandTotal: lineDetails.DCLR.demandTotal + lineDetails.RMA.demandTotal,
    receptionPlanTotal: lineDetails.DCLR.receptionPlanTotal + lineDetails.RMA.receptionPlanTotal,
    actualReceivedTotal: lineDetails.DCLR.actualReceivedTotal + lineDetails.RMA.actualReceivedTotal,
    actualResignedTotal: lineDetails.DCLR.actualResignedTotal + lineDetails.RMA.actualResignedTotal,
  };

  // Efficiency/Complete rates
  const receptionFulfillmentRate = overall.receptionPlanTotal > 0
    ? Math.round(((overall.actualReceivedTotal - overall.actualResignedTotal) / overall.receptionPlanTotal) * 100)
    : 0;

  const demandFulfillmentRate = overall.demandTotal > 0
    ? Math.round(((overall.actualReceivedTotal - overall.actualResignedTotal) / overall.demandTotal) * 100)
    : 0;

  return (
    <div className="space-y-8" id="recruitment-phase-2-dashboard">
      
      {/* ACTION HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-indigo-600 shrink-0" size={24} />
            KẾ HOẠCH & CHỈ TIÊU TUYỂN DỤNG THEO NGÀY/THÁNG
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chủ động điều phối & chỉnh sửa chỉ tiêu tuyển dụng sản xuất của DCLR (Khiêm) và RMA BG (Thịnh) cho bất kỳ ngày/tháng nào.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5" id="plan-progress-actions-container">
          {/* List of Hidden Columns Restorer Dropdown */}
          {hiddenDays.length > 0 && (
            <div className="relative inline-block text-left" id="hidden-days-toggle-container">
              <button
                type="button"
                onClick={() => setIsHiddenMenuOpen(!isHiddenMenuOpen)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <EyeOff size={13} className="text-indigo-600" />
                <span>Cột Đã Ẩn ({hiddenDays.length})</span>
              </button>
              {isHiddenMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsHiddenMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-150 ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden text-xs text-slate-750">
                    <div className="px-4 py-3 bg-slate-50 font-bold text-slate-600 border-b border-slate-100 text-[10px] uppercase tracking-wider flex items-center justify-between">
                      <span>Cột đang ẩn ({hiddenDays.length})</span>
                      <button
                        onClick={() => {
                          setHiddenDays([]);
                          try { localStorage.removeItem('dclr_plan_progress_hidden_days'); } catch (_) {}
                          setIsHiddenMenuOpen(false);
                        }}
                        className="text-[10px] text-blue-650 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                      >
                        Hiện tất cả
                      </button>
                    </div>
                    <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                      {hiddenDays.map((hDay) => (
                        <div key={hDay} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 rounded-xl transition">
                          <span className="font-mono font-bold text-slate-700">
                            {hDay.split('-').reverse().join('/')} ({formatToShortDate(hDay)})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = hiddenDays.filter(d => d !== hDay);
                              setHiddenDays(updated);
                              try {
                                localStorage.setItem('dclr_plan_progress_hidden_days', JSON.stringify(updated));
                              } catch (_) {}
                              if (updated.length === 0) {
                                setIsHiddenMenuOpen(false);
                              }
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-850 font-bold hover:underline cursor-pointer"
                          >
                            Hiện lại
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleAddDayColumn}
                className="bg-sky-50 text-sky-700 hover:bg-sky-100 active:scale-98 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-sky-200 cursor-pointer"
              >
                <Plus size={14} /> Thêm cột ngày
              </button>
              <button
                type="button"
                onClick={saveEditing}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check size={14} /> Lưu tất cả
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              >
                <X size={14} /> Hủy bỏ
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-100/60 cursor-pointer"
            >
              <Pencil size={13} /> Chỉnh sửa Chỉ tiêu & Tiến độ thực tế
            </button>
          )}
        </div>
      </div>



      {/* TABLE 1: NHU CẦU TUYỂN DỤNG THEO NGÀY */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-indigo-50/50 to-blue-50/20 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Target size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                1. Nhu Cầu Tuyển Dụng Theo Ngày & Tháng
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Số lượng nhân lực cần tiếp ứng - Bạn có thể đổi lịch, sửa ngày, thêm ngày mới</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-between md:justify-end">
            <button
              type="button"
              onClick={() => {
                const newVal = !autoSync;
                setAutoSync(newVal);
                try {
                  localStorage.setItem('dclr_autosync_v1', String(newVal));
                } catch (_) {}
              }}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                autoSync 
                  ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 animate-pulse' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Tự động nhảy số lượng cần tuyển dựa trên số lượng nhân sự đã thôi việc/xin nghỉ của GĐ 1"
            >
              <RefreshCw size={11} className={`${autoSync ? 'animate-spin-slow text-rose-600' : 'text-slate-400'} shrink-0`} />
              LIÊN THÔNG TỰ ĐỘNG (GĐ 1): {autoSync ? 'BẬT (TỰ ĐỘNG THEO NS THÔI VIỆC)' : 'TẮT (NHẬP TAY THỦ CÔNG)'}
            </button>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider hidden sm:inline-block">
              KH Nhu Cầu
            </span>
          </div>
        </div>

        {autoSync && (
          <div className="bg-rose-50/50 border-b border-rose-100/65 px-5 py-3 text-xs text-rose-800 flex items-start sm:items-center gap-2.5 font-medium transition-all">
            <span className="flex h-2.5 w-2.5 relative mt-0.5 sm:mt-0 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="leading-normal">
              <strong>Liên thông tự động (Giai đoạn 1 ➡️ Giai đoạn 2):</strong> Nhu cầu tuyển dụng hôm nay sẽ được <strong>tự động tạo lập bổ sung</strong> tương ứng khi Giám sát (DCLR/RMA-BG) ghi nhận ngày nghỉ phép hoặc thôi việc của nhân sự tại Giai đoạn 1.
            </span>
          </div>
        )}

        {/* Demand grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-150 text-xs">
                <th className="py-3 px-3 border-r border-slate-200 text-center font-bold w-12">STT</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left font-bold w-40">DÂY CHUYỀN MALIK</th>
                <th className="py-3 px-4 border-r border-slate-200 text-center font-bold w-24 text-indigo-900 bg-indigo-50/40">ĐỊNH BIÊN</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left font-bold w-32">QUẢN LÝ T.N</th>
                
                {/* Columns representing days */}
                {visibleDaysList.map((day, dIdx) => {
                  const matchedIdx = tempProgress.findIndex(tp => tp.fullDate === day.fullDate);
                  const isDynamic = autoSync && (matchedIdx === -1);
                  
                  return (
                    <th 
                      key={`demand-header-${dIdx}`} 
                      className={`py-3 px-1.5 border-r border-slate-200 text-center font-bold text-xs ${isEditing ? 'bg-amber-100/30' : 'min-w-[70px]'}`}
                      style={isEditing ? { minWidth: isDynamic ? '125px' : (activeChoiceColumn === matchedIdx ? '175px' : '155px') } : undefined}
                    >
                      {isEditing ? (
                        isDynamic ? (
                          <div className="flex flex-col items-center gap-1 p-1.5 rounded bg-rose-50 border border-rose-100/80">
                            <span className="font-extrabold text-[12px] text-rose-800 leading-normal flex items-center gap-0.5 whitespace-nowrap">
                              🔄 {day.date}
                            </span>
                            <span className="text-[8px] text-rose-500 font-bold block bg-white px-1.5 py-0.5 rounded border border-rose-100 shadow-3xs">
                              {day.fullDate}
                            </span>
                            <span className="text-[8px] text-rose-600 font-semibold p-0.5 leading-tight text-center" title="Được tự động liên thông khi đi làm hoặc thôi việc ở Giai đoạn 1">
                              Sự kiện liên thông
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 p-1 rounded bg-amber-50 border border-amber-200">
                            {/* Interactive Calendar Date Picker */}
                            <div className="flex items-center gap-1 w-full bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-800">
                              <Calendar size={11} className="text-slate-400 shrink-0" />
                              <input 
                                type="date" 
                                value={day.fullDate} 
                                onChange={(e) => {
                                  const newFullDate = e.target.value;
                                  const newDateShort = formatToShortDate(newFullDate);
                                  if (matchedIdx !== -1) {
                                    const updated = [...tempProgress];
                                    updated[matchedIdx] = {
                                      ...updated[matchedIdx],
                                      fullDate: newFullDate,
                                      date: newDateShort
                                    };
                                    setTempProgress(updated);
                                  }
                                }}
                                className="bg-transparent font-black text-[10px] w-full border-none focus:ring-0 focus:outline-none focus:border-none p-0 cursor-pointer text-center uppercase"
                              />
                            </div>
                            {/* Display day-month label with visual feedback */}
                            <span className="text-[9px] text-indigo-700 tracking-wider font-extrabold uppercase">
                              ({day.date})
                            </span>
                            {/* Remove date column with interactive choice */}
                            {activeChoiceColumn === matchedIdx ? (
                              <div className="flex flex-col gap-1 w-full bg-slate-50 p-1 rounded border border-slate-200 mt-1">
                                <span className="text-[8px] text-slate-550 font-bold uppercase tracking-wider block text-center">Lựa chọn:</span>
                                <div className="grid grid-cols-2 gap-1 w-full">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedHidden = [...hiddenDays, day.fullDate];
                                      setHiddenDays(updatedHidden);
                                      try {
                                        localStorage.setItem('dclr_plan_progress_hidden_days', JSON.stringify(updatedHidden));
                                      } catch (_) {}
                                      setActiveChoiceColumn(null);
                                    }}
                                    className="px-1 py-0.5 font-bold text-[8px] text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-250 transition cursor-pointer text-center whitespace-nowrap"
                                    title="Ẩn tạm thời cột này khỏi bảng"
                                  >
                                    Ẩn cột
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteDayColumn(matchedIdx);
                                      setActiveChoiceColumn(null);
                                    }}
                                    className="px-1 py-0.5 font-bold text-[8px] text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-250 transition cursor-pointer text-center whitespace-nowrap"
                                    title="Gỡ bỏ vĩnh viễn cột ngày này"
                                  >
                                    Gỡ bỏ
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveChoiceColumn(null)}
                                  className="w-full text-center text-[8px] text-slate-400 hover:text-slate-650 font-bold cursor-pointer hover:underline mt-0.5"
                                >
                                  Hủy bỏ
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                title="Xóa hoặc ẩn cột lịch này"
                                onClick={() => {
                                  if (matchedIdx !== -1) {
                                    setActiveChoiceColumn(matchedIdx);
                                  }
                                }}
                                className="flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded text-[9px] gap-0.5 transition font-medium cursor-pointer w-full"
                              >
                                <Trash2 size={9} /> Gỡ bỏ
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center select-none py-1">
                          <span className="text-slate-900 font-extrabold text-[13px] tracking-tight">{day.date}</span>
                          <span className="text-[9px] mt-0.5 text-slate-400 font-medium block">{day.fullDate}</span>
                        </div>
                      )}
                    </th>
                  );
                })}
                
                <th className="py-3 px-4 text-center font-bold text-slate-900 w-24 bg-slate-100/80">TỔNG</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: DCLR */}
              <tr className="hover:bg-slate-50/50 border-b border-slate-150">
                <td className="py-3.5 px-3 text-center text-slate-500 font-medium border-r border-slate-150">1</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 border-r border-slate-150">
                  DCLR
                </td>
                <td className="py-3.5 px-4 text-center font-extrabold text-slate-705 border-r border-slate-150 bg-indigo-50/10">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={capacities['DCLR'].target}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleCapacityChange('DCLR', isNaN(val) ? 0 : val);
                      }}
                      className="w-14 px-1 py-0.5 text-center font-extrabold text-slate-800 bg-white border border-slate-350 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs"
                      min="0"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">NS</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-indigo-700 font-semibold border-r border-slate-150 text-[13px]">
                  {lineDetails.DCLR.manager}
                </td>
                
                {visibleDaysList.map((day, dIdx) => {
                  const dayIso = normalizeDateToISO(day.fullDate);
                  const isPast = dayIso < todayISO;
                  const useAuto = autoSync && !isPast;
                  const matchedIdx = tempProgress.findIndex(tp => tp.fullDate === day.fullDate);

                  const baseVal = useAuto
                    ? getActualResignedCount('DCLR', day.fullDate)
                    : (isEditing && matchedIdx !== -1
                        ? tempProgress[matchedIdx].targets['DCLR'].demand ?? 0 
                        : day.targets['DCLR'].demand ?? 0);
                  const _unusedDclrVal = isEditing 

                  return (
                    <td key={`demand-dclr-cell-${dIdx}`} className="py-2 px-1 border-r border-slate-150 text-center">
                      {isEditing && !useAuto ? (
                        <input 
                          type="number" 
                          value={baseVal || ''} 
                          placeholder="0"
                          onChange={(e) => {
                            if (matchedIdx !== -1) {
                              handleCellChange(matchedIdx, 'DCLR', 'demand', e.target.value);
                            }
                          }}
                          className="w-16 text-center font-black text-slate-900 bg-amber-50 rounded border border-amber-300 py-1 shadow-xs focus:ring-1 focus:ring-amber-400 focus:outline-none text-xs"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className={`font-bold text-[15px] ${baseVal > 0 ? 'text-slate-800 font-black' : 'text-slate-330'}`}>
                            {baseVal || '-'}
                          </span>
                          {useAuto && baseVal > 0 && (
                            <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1 flex items-center justify-center gap-0.5 mt-0.5 whitespace-nowrap scale-90" title="Tự động tính theo NS thôi việc">
                              🔄 Tự động
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                
                <td className="py-3.5 px-4 text-center font-black text-indigo-600 bg-indigo-50/20 text-[15px]">
                  {lineDetails.DCLR.demandTotal}
                </td>
              </tr>

              {/* Row 2: RMA BG */}
              <tr className="hover:bg-slate-50/50 border-b border-slate-150">
                <td className="py-3.5 px-3 text-center text-slate-500 font-medium border-r border-slate-150">2</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 border-r border-slate-150">
                  DC RMA BG
                </td>
                <td className="py-3.5 px-4 text-center font-extrabold text-slate-705 border-r border-slate-150 bg-indigo-50/10">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={capacities['DC RMA BG'].target}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleCapacityChange('DC RMA BG', isNaN(val) ? 0 : val);
                      }}
                      className="w-14 px-1 py-0.5 text-center font-extrabold text-slate-800 bg-white border border-slate-350 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs"
                      min="0"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">NS</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-indigo-700 font-semibold border-r border-slate-150 text-[13px]">
                  {lineDetails.RMA.manager}
                </td>
                
                {visibleDaysList.map((day, dIdx) => {
                  const dayIso = normalizeDateToISO(day.fullDate);
                  const isPast = dayIso < todayISO;
                  const useAuto = autoSync && !isPast;
                  const matchedIdx = tempProgress.findIndex(tp => tp.fullDate === day.fullDate);

                  const baseVal = useAuto
                    ? getActualResignedCount('DC RMA BG', day.fullDate)
                    : (isEditing && matchedIdx !== -1
                        ? tempProgress[matchedIdx].targets['DC RMA BG'].demand ?? 0 
                        : day.targets['DC RMA BG'].demand ?? 0);
                  const _unusedRmaVal = isEditing 

                  return (
                    <td key={`demand-rma-cell-${dIdx}`} className="py-2 px-1 border-r border-slate-150 text-center">
                      {isEditing && !useAuto ? (
                        <input 
                          type="number" 
                          value={baseVal || ''} 
                          placeholder="0"
                          onChange={(e) => {
                            if (matchedIdx !== -1) {
                              handleCellChange(matchedIdx, 'DC RMA BG', 'demand', e.target.value);
                            }
                          }}
                          className="w-16 text-center font-black text-slate-900 bg-amber-50 rounded border border-amber-300 py-1 shadow-xs focus:ring-1 focus:ring-amber-400 focus:outline-none text-xs"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className={`font-bold text-[15px] ${baseVal > 0 ? 'text-slate-800 font-black' : 'text-slate-330'}`}>
                            {baseVal || '-'}
                          </span>
                          {useAuto && baseVal > 0 && (
                            <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1 flex items-center justify-center gap-0.5 mt-0.5 whitespace-nowrap scale-90" title="Tự động tính theo NS thôi việc">
                              🔄 Tự động
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                
                <td className="py-3.5 px-4 text-center font-black text-indigo-600 bg-indigo-50/20 text-[15px]">
                  {lineDetails.RMA.demandTotal}
                </td>
              </tr>

              {/* Row 3: Total Row */}
              <tr className="bg-slate-50 font-bold border-t border-t-slate-300">
                <td className="py-3 px-3 text-center border-r border-slate-150 text-slate-400 text-xs font-semibold" colSpan={4}>
                  TỔNG CỘNG NHU CẦU ĐỀ XUẤT (Tổng định biên {capacities['DCLR'].target + capacities['DC RMA BG'].target} NS)
                </td>
                {visibleDaysList.map((day, dIdx) => {
                  const sumValue = getDemandCount('DCLR', day) + getDemandCount('DC RMA BG', day);

                  return (
                    <td key={`demand-total-cell-${dIdx}`} className="py-3 px-1 text-center border-r border-slate-150">
                      {sumValue > 0 ? (
                        <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-bold leading-none inline-block">
                          {sumValue}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-3 px-4 text-center font-black text-white bg-slate-800 text-[16px]">
                  {overall.demandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {isEditing && (
          <div className="bg-amber-50/50 p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-amber-800/80 font-semibold italic">
              * Mẹo: Nhấp vào biểu tượng lịch ở tiêu đề cột để thay đổi ngày và tháng bất kỳ. Nhấn "Thêm cột ngày" ở góc phải để mở rộng.
            </span>
            <button
              type="button"
              onClick={handleAddDayColumn}
              className="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} /> Thêm cột ngày
            </button>
          </div>
        )}
      </div>

      {/* TABLE 2: KẾ HOẠCH & TIẾN ĐỘ TIẾP NHẬN NHÂN SỰ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-emerald-50/50 to-teal-50/20 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                2. Kế Hoạch Tiếp Nhận & Tiến Độ Đạt Được
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Số lượng bàn giao theo kế hoạch (KH) phối hợp với tình hình thực tế nhận việc (+) và nghỉ việc (-)</p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => {
              const newVal = !autoSync;
              setAutoSync(newVal);
              try {
                localStorage.setItem('dclr_autosync_v1', String(newVal));
              } catch (_) {}
            }}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
              autoSync 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 select-none' 
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 select-none'
            }`}
          >
            <RefreshCw size={11} className={`${autoSync ? 'animate-spin-slow text-emerald-600' : 'text-amber-600'} shrink-0`} />
            LIÊN THÔNG TỰ ĐỘNG: {autoSync ? 'BẬT (TỰ ĐỘNG DỮ LIỆU NS)' : 'TẮT (NHẬP TAY THỦ CÔNG)'}
          </button>
        </div>

        {/* Reception grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-150 text-xs">
                <th className="py-3 px-3 border-r border-slate-200 text-center font-bold w-12" rowSpan={2}>STT</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left font-bold w-40" rowSpan={2}>DÂY CHUYỀN THỰC TẾ</th>
                <th className="py-3 px-4 border-r border-slate-200 text-center font-bold w-24 text-indigo-900 bg-indigo-50/40" rowSpan={2}>ĐỊNH BIÊN</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left font-bold w-32" rowSpan={2}>QUẢN LÝ T.N</th>
                
                {visibleDaysList.map((day, dIdx) => (
                  <th 
                    key={`reception-header-${dIdx}`} 
                    className={`py-1.5 px-1 border-r border-slate-200 text-center font-extrabold text-xs text-slate-700 ${isEditing ? 'min-w-[155px]' : 'min-w-[95px]'}`}
                    colSpan={1}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-extrabold text-[12px]">{day.date}</span>
                      <span className="text-[8px] text-slate-400 font-medium">{day.fullDate}</span>
                    </div>
                  </th>
                ))}
                
                <th className="py-3 px-3 text-center font-bold text-slate-800 min-w-[70px] bg-slate-50/80" rowSpan={2}>
                  <div className="flex flex-col items-center select-none">
                    <span>Kế Hoạch</span>
                    <span className="text-[9px] text-indigo-600 font-extrabold bg-indigo-50 px-1 py-0.5 rounded-sm mt-0.5" title={`Lũy kế kế hoạch tiếp nhận chỉ tính đến ngày hôm nay (${formatToShortDate(todayISO)})`}>
                      Lũy kế ≤ {formatToShortDate(todayISO)}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center font-bold text-emerald-800 min-w-[75px] bg-emerald-50" rowSpan={2}>T.T Nhận (+)</th>
                <th className="py-3 px-3 text-center font-bold text-rose-800 min-w-[75px] bg-rose-50" rowSpan={2}>Nghỉ Việc (-)</th>
                <th className="py-3 px-3 text-center font-bold text-sky-900 min-w-[85px] bg-sky-50" rowSpan={2}>Còn lại</th>
              </tr>
              <tr className="bg-slate-100/50 text-slate-500 border-b border-slate-150 text-[10px]">
                {visibleDaysList.map((day, dIdx) => (
                  <th key={`reception-sub-header-${dIdx}`} className="py-1 px-1 border-r border-slate-200 text-center font-bold text-slate-450 bg-slate-50/50 uppercase select-none">
                    KH / + / -
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Row 1: DCLR */}
              <tr className="hover:bg-slate-50/50 border-b border-slate-150">
                <td className="py-4 px-3 text-center text-slate-500 font-medium border-r border-slate-150">1</td>
                <td className="py-4 px-4 font-bold text-slate-800 border-r border-slate-150">
                  DCLR <span className="text-[11px] font-normal text-slate-500">({employees.filter(e => e.line === 'DCLR' && e.status === 'WORKING').length} hiện hữu)</span>
                </td>
                <td className="py-4 px-4 text-center font-extrabold text-slate-705 border-r border-slate-150 bg-indigo-50/10">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={capacities['DCLR'].target}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleCapacityChange('DCLR', isNaN(val) ? 0 : val);
                      }}
                      className="w-14 px-1 py-0.5 text-center font-extrabold text-slate-800 bg-white border border-slate-350 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs"
                      min="0"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">NS</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-indigo-700 font-semibold border-r border-slate-150 text-[13px]">
                  {lineDetails.DCLR.manager}
                </td>
                
                {visibleDaysList.map((day, dIdx) => {
                  const planVal = getDemandCount('DCLR', day);
                  const matchedIdx = tempProgress.findIndex(tp => tp.fullDate === day.fullDate);
                  
                  const actIn = isEditing && matchedIdx !== -1
                    ? (tempProgress[matchedIdx].targets['DCLR'].actualIn ?? 0)
                    : getReceivedCount('DCLR', day);

                  const actOut = isEditing && matchedIdx !== -1
                    ? (tempProgress[matchedIdx].targets['DCLR'].actualOut ?? 0)
                    : getResignedCount('DCLR', day);

                  return (
                    <td key={`reception-dclr-cell-${dIdx}`} className="py-2.5 px-1 border-r border-slate-150 text-center">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 px-1 py-1 rounded bg-amber-50/40 border border-amber-200/60 font-semibold">
                          {/* target */}
                          <div className="flex items-center justify-between gap-1 w-full text-[11px] select-none">
                            <span className="text-[9px] text-slate-500 font-bold" title="Đồng bộ tự động từ nhu cầu tuyển dụng">KH:</span>
                            <span className="font-extrabold text-slate-900 bg-slate-100 rounded px-1.5 py-0.5 text-[11px] border border-slate-200 min-w-[28px] text-center" title="Kế hoạch tự động bằng Nhu cầu tuyển dụng">
                              {planVal}
                            </span>
                          </div>
                          {/* in */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] text-emerald-700">Nhận:</span>
                            <input 
                              type="number" 
                              value={actIn || ''} 
                              placeholder="0"
                              disabled={autoSync}
                              onChange={(e) => {
                                if (matchedIdx !== -1) {
                                  handleCellChange(matchedIdx, 'DCLR', 'actualIn', e.target.value);
                                }
                              }}
                              className={`w-11 text-center font-black rounded border py-0.5 text-[11px] focus:outline-none ${autoSync ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-emerald-900 border-amber-300 focus:ring-1 focus:ring-amber-400'}`}
                            />
                          </div>
                          {/* out */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] text-rose-700">Nghỉ:</span>
                            <input 
                              type="number" 
                              value={actOut || ''} 
                              placeholder="0"
                              disabled={autoSync}
                              onChange={(e) => {
                                if (matchedIdx !== -1) {
                                  handleCellChange(matchedIdx, 'DCLR', 'actualOut', e.target.value);
                                }
                              }}
                              className={`w-11 text-center font-black rounded border py-0.5 text-[11px] focus:outline-none ${autoSync ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-rose-900 border-amber-300 focus:ring-1 focus:ring-amber-400'}`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={`font-bold text-[13px] ${planVal > 0 ? 'text-slate-800 font-bold' : 'text-slate-300'}`}>
                            {planVal || '0'}
                          </span>
                          <div className="flex items-center gap-1.5 justify-center">
                            <span 
                              className={`text-[10px] font-black px-1.5 py-0.2 rounded-sm select-none border ${
                                actIn > 0 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                                  : 'bg-slate-50 text-slate-450 border-slate-100'
                              }`}
                              title="Thực tế nhận việc"
                            >
                              +{actIn}
                            </span>
                            <span 
                              className={`text-[10px] font-black px-1.5 py-0.2 rounded-sm select-none border ${
                                actOut > 0 
                                  ? 'bg-rose-50 text-rose-700 border-rose-250' 
                                  : 'bg-slate-50 text-slate-450 border-slate-100'
                              }`}
                              title="Thực từ chức/Nghỉ việc"
                            >
                              -{actOut}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
                
                <td className="py-4 px-3 text-center font-bold text-slate-700 bg-slate-50/50 text-[14px] border-r border-slate-150">
                  {lineDetails.DCLR.receptionPlanTotal}
                </td>
                <td className="py-4 px-3 text-center font-black text-emerald-700 bg-emerald-50/30 text-[15px] border-r border-slate-150">
                  {lineDetails.DCLR.actualReceivedTotal}
                </td>
                <td className="py-4 px-3 text-center font-black text-rose-700 bg-rose-50/30 text-[15px] border-r border-slate-150">
                  {lineDetails.DCLR.actualResignedTotal}
                </td>
                <td className="py-4 px-3 text-center font-black text-sky-850 bg-sky-50/45 text-[15px]">
                  {lineDetails.DCLR.actualReceivedTotal - lineDetails.DCLR.actualResignedTotal}
                </td>
              </tr>

              {/* Row 2: RMA BG */}
              <tr className="hover:bg-slate-50/50 border-b border-slate-150">
                <td className="py-4 px-3 text-center text-slate-500 font-medium border-r border-slate-150">2</td>
                <td className="py-4 px-4 font-bold text-slate-800 border-r border-slate-150">
                  DC RMA BG <span className="text-[11px] font-normal text-slate-500">({employees.filter(e => e.line === 'DC RMA BG' && e.status === 'WORKING').length} hiện hữu)</span>
                </td>
                <td className="py-4 px-4 text-center font-extrabold text-slate-750 border-r border-slate-150 bg-indigo-50/10">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={capacities['DC RMA BG'].target}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleCapacityChange('DC RMA BG', isNaN(val) ? 0 : val);
                      }}
                      className="w-14 px-1 py-0.5 text-center font-extrabold text-slate-800 bg-white border border-slate-350 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs"
                      min="0"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">NS</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-indigo-700 font-semibold border-r border-slate-150 text-[13px]">
                  {lineDetails.RMA.manager}
                </td>
                
                {visibleDaysList.map((day, dIdx) => {
                  const planVal = getDemandCount('DC RMA BG', day);
                  const matchedIdx = tempProgress.findIndex(tp => tp.fullDate === day.fullDate);
                  
                  const actIn = isEditing && matchedIdx !== -1
                    ? (tempProgress[matchedIdx].targets['DC RMA BG'].actualIn ?? 0)
                    : getReceivedCount('DC RMA BG', day);

                  const actOut = isEditing && matchedIdx !== -1
                    ? (tempProgress[matchedIdx].targets['DC RMA BG'].actualOut ?? 0)
                    : getResignedCount('DC RMA BG', day);

                  return (
                    <td key={`reception-rma-cell-${dIdx}`} className="py-2.5 px-1 border-r border-slate-150 text-center">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 px-1 py-1 rounded bg-amber-50/40 border border-amber-200/60 font-semibold">
                          {/* target */}
                          <div className="flex items-center justify-between gap-1 w-full text-[11px] select-none">
                            <span className="text-[9px] text-slate-500 font-bold" title="Đồng bộ tự động từ nhu cầu tuyển dụng">KH:</span>
                            <span className="font-extrabold text-slate-900 bg-slate-100 rounded px-1.5 py-0.5 text-[11px] border border-slate-200 min-w-[28px] text-center" title="Kế hoạch tự động bằng Nhu cầu tuyển dụng">
                              {planVal}
                            </span>
                          </div>
                          {/* in */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] text-emerald-700">Nhận:</span>
                            <input 
                              type="number" 
                              value={actIn || ''} 
                              placeholder="0"
                              disabled={autoSync}
                              onChange={(e) => {
                                if (matchedIdx !== -1) {
                                  handleCellChange(matchedIdx, 'DC RMA BG', 'actualIn', e.target.value);
                                }
                              }}
                              className={`w-11 text-center font-black rounded border py-0.5 text-[11px] focus:outline-none ${autoSync ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-emerald-950 border-amber-300 focus:ring-1 focus:ring-amber-400'}`}
                            />
                          </div>
                          {/* out */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] text-rose-700">Nghỉ:</span>
                            <input 
                              type="number" 
                              value={actOut || ''} 
                              placeholder="0"
                              disabled={autoSync}
                              onChange={(e) => {
                                if (matchedIdx !== -1) {
                                  handleCellChange(matchedIdx, 'DC RMA BG', 'actualOut', e.target.value);
                                }
                              }}
                              className={`w-11 text-center font-black rounded border py-0.5 text-[11px] focus:outline-none ${autoSync ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-rose-950 border-amber-300 focus:ring-1 focus:ring-amber-400'}`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={`font-bold text-[13px] ${planVal > 0 ? 'text-slate-800 font-bold' : 'text-slate-300'}`}>
                            {planVal || '0'}
                          </span>
                          <div className="flex items-center gap-1.5 justify-center">
                            <span 
                              className={`text-[10px] font-black px-1.5 py-0.2 rounded-sm select-none border ${
                                actIn > 0 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                                  : 'bg-slate-50 text-slate-450 border-slate-100'
                              }`}
                              title="Thực tế nhận việc"
                            >
                              +{actIn}
                            </span>
                            <span 
                              className={`text-[10px] font-black px-1.5 py-0.2 rounded-sm select-none border ${
                                actOut > 0 
                                  ? 'bg-rose-50 text-rose-700 border-rose-250' 
                                  : 'bg-slate-50 text-slate-450 border-slate-100'
                              }`}
                              title="Thực từ chức/Nghỉ việc"
                            >
                              -{actOut}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
                
                <td className="py-4 px-3 text-center font-bold text-slate-700 bg-slate-50/50 text-[14px] border-r border-slate-150">
                  {lineDetails.RMA.receptionPlanTotal}
                </td>
                <td className="py-4 px-3 text-center font-black text-emerald-700 bg-emerald-50/30 text-[15px] border-r border-slate-150">
                  {lineDetails.RMA.actualReceivedTotal}
                </td>
                <td className="py-4 px-3 text-center font-black text-rose-700 bg-rose-50/30 text-[15px] border-r border-slate-150">
                  {lineDetails.RMA.actualResignedTotal}
                </td>
                <td className="py-4 px-3 text-center font-black text-sky-850 bg-sky-50/45 text-[15px]">
                  {lineDetails.RMA.actualReceivedTotal - lineDetails.RMA.actualResignedTotal}
                </td>
              </tr>

              {/* Row 3: Total Row */}
              <tr className="bg-slate-50 font-bold border-t border-t-slate-300">
                <td className="py-3 px-3 text-center border-r border-slate-150 text-slate-400 text-xs font-semibold" colSpan={4}>
                  TỔNG CỘNG KH & THỰC TIẾP NHẬN (Tổng định biên {capacities['DCLR'].target + capacities['DC RMA BG'].target} NS - Hiện hữu {employees.filter(e => e.status === 'WORKING').length} NS)
                </td>
                {visibleDaysList.map((day, dIdx) => {
                  const dayPlanned = getDemandCount('DCLR', day) + getDemandCount('DC RMA BG', day);
                  const matchedIdx = tempProgress.findIndex(tp => tp.fullDate === day.fullDate);
                  
                  const dayActIn = isEditing && matchedIdx !== -1
                    ? ((tempProgress[matchedIdx].targets['DCLR'].actualIn ?? 0) + (tempProgress[matchedIdx].targets['DC RMA BG'].actualIn ?? 0))
                    : (getReceivedCount('DCLR', day) + getReceivedCount('DC RMA BG', day));

                  const dayActOut = isEditing && matchedIdx !== -1
                    ? ((tempProgress[matchedIdx].targets['DCLR'].actualOut ?? 0) + (tempProgress[matchedIdx].targets['DC RMA BG'].actualOut ?? 0))
                    : (getResignedCount('DCLR', day) + getResignedCount('DC RMA BG', day));
                  
                  return (
                    <td key={`reception-total-cell-${dIdx}`} className="py-3 px-1 text-center border-r border-slate-150">
                      <div className="flex flex-col items-center justify-center select-none">
                        <span className="text-slate-700 text-xs font-extrabold">{dayPlanned}</span>
                        <div className="flex items-center gap-1 mt-0.5 justify-center">
                          <span className={`text-[9px] px-1 py-0.2 font-bold rounded-sm border ${dayActIn > 0 ? 'bg-emerald-600 text-white' : 'text-slate-300 bg-slate-50'}`}>
                            +{dayActIn}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 font-bold rounded-sm border ${dayActOut > 0 ? 'bg-rose-650 text-white' : 'text-slate-300 bg-slate-50'}`}>
                            -{dayActOut}
                          </span>
                        </div>
                      </div>
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-center font-extrabold text-slate-800 bg-slate-150 text-[15px] border-r border-slate-150">
                  {overall.receptionPlanTotal}
                </td>
                <td className="py-3 px-3 text-center font-black text-white bg-emerald-600 text-[16px] border-r border-slate-150">
                  {overall.actualReceivedTotal}
                </td>
                <td className="py-3 px-3 text-center font-black text-white bg-rose-600 text-[16px] border-r border-slate-150">
                  {overall.actualResignedTotal}
                </td>
                <td className="py-3 px-4 text-center font-black text-white bg-sky-600 text-[16px]">
                  {overall.actualReceivedTotal - overall.actualResignedTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* RECRUITMENT PERFORMANCE METRIC BOARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-bold">
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
          <div className="flex justify-between items-start mb-2 animate-fade-in">
            <div>
              <span className="text-[10px] text-indigo-600 uppercase font-black tracking-wider block">
                TỈ LỆ HOÀN THÀNH TIẾP NHẬN THEO KẾ HOẠCH
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div className="w-full mr-4 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(Math.max(receptionFulfillmentRate, 0), 100)}%` }}
              ></div>
            </div>
            <span className="text-3xl font-black text-indigo-900 shrink-0">
              {receptionFulfillmentRate}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] text-emerald-600 uppercase font-black tracking-wider block">
                TỈ LỆ HOÀN THÀNH ĐÁP ỨNG THEO NHU CẦU SẢN XUẤT
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div className="w-full mr-4 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(demandFulfillmentRate, 100)}%` }}
              ></div>
            </div>
            <span className="text-3xl font-black text-emerald-950 shrink-0">
              {demandFulfillmentRate}%
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
