import { Employee, AssemblyLine, DayProgress } from './types';
import { Users, UserCheck, UserMinus, Percent, Award, AlertTriangle } from 'lucide-react';
import { LINE_CAPACITIES } from './mockData';

interface StatsSectionProps {
  employees: Employee[];
  selectedLine: AssemblyLine | 'ALL';
  lineCapacities?: Record<AssemblyLine, { target: number; currentBase: number }>;
  dayProgress?: DayProgress[];
}

export default function StatsSection({ employees, selectedLine, lineCapacities, dayProgress }: StatsSectionProps) {
  const capacities = lineCapacities || LINE_CAPACITIES;
  // Filters
  const filteredList = employees.filter(emp => selectedLine === 'ALL' || emp.line === selectedLine);
  
  // Total Active
  const totalActive = filteredList.filter(emp => emp.status === 'WORKING').length;
  
  // Deduce Month/Year of each employee event for monitoring
  const getEventMonthYear = (targetDate?: string) => {
    if (!targetDate) return { month: '', year: '' };
    let year = '';
    let month = '';
    if (targetDate.includes('-')) {
      const parts = targetDate.split('-');
      if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1];
      } else {
        year = parts[2];
        month = parts[1];
      }
    } else if (targetDate.includes('/')) {
      const parts = targetDate.split('/');
      if (parts[2].length === 4) {
        year = parts[2];
        month = parts[1];
      } else {
        year = parts[0];
        month = parts[1];
      }
    }
    return { month: month.padStart(2, '0'), year };
  };

  const curMonth = '06'; 
  const curYear = '2026';

  let resignedThisMonth = 0;
  let resignedThisYear = 0;
  let leaveThisMonth = 0;
  let leaveThisYear = 0;

  filteredList.forEach(emp => {
    if (emp.status === 'RESIGNED') {
      const { month, year } = getEventMonthYear(emp.resignDate);
      if (year === curYear) {
        resignedThisYear++;
        if (month === curMonth) {
          resignedThisMonth++;
        }
      }
    } else if (emp.status === 'LEAVE') {
      const { month, year } = getEventMonthYear(emp.resignDate);
      if (year === curYear) {
        leaveThisYear++;
        if (month === curMonth) {
          leaveThisMonth++;
        }
      }
    }
  });

  // Total Resigned in June 2026
  const resignedInJune = resignedThisMonth;

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

  // Total New Hires under 30 days (Ngày nhận việc dưới 30 ngày)
  const newHiresWorkingCount = filteredList.filter(emp => 
    emp.status === 'WORKING' && isNewHire(emp.joinDate)
  ).length;

  const newHiresOnboardingCount = filteredList.filter(emp => 
    emp.status === 'ONBOARDING' && isNewHire(emp.joinDate)
  ).length;

  const newHiresResignedCount = filteredList.filter(emp => 
    emp.status === 'RESIGNED' && isNewHire(emp.joinDate)
  ).length;

  const totalNewHiresCount = newHiresWorkingCount + newHiresOnboardingCount;

  // Staged Onboarding (Chờ nhận việc)
  const waitingOnboard = filteredList.filter(emp => emp.status === 'ONBOARDING').length;

  // Turn-over rate or Resignation description
  const totalHistorically = filteredList.length;
  const turnoverRate = totalHistorically > 0 
    ? Math.round((filteredList.filter(emp => emp.status === 'RESIGNED').length / totalHistorically) * 100) 
    : 0;

  // Compute Headcount / Capacity details specifically
  let capacityText = "";
  let targetNum = 0;
  if (selectedLine === 'ALL') {
    const totalTarget = capacities['DCLR'].target + capacities['DC RMA BG'].target;
    targetNum = totalTarget;
    capacityText = `${totalActive} / ${totalTarget}`;
  } else {
    const target = capacities[selectedLine].target;
    targetNum = target;
    capacityText = `${totalActive} / ${target}`;
  }

  // Headcount Percentage
  const headcountPercentage = targetNum > 0 ? Math.round((totalActive / targetNum) * 100) : 0;

  // Recruitment Efficiency (Hiệu quả tuyển dụng)
  // Calculate as retention rate of recently hired candidates (Working / (Working + Resigned))
  // If there are no new recruits, fallback cleanly to standard capacity fulfillment rate.
  const totalNewRecruits = newHiresWorkingCount + newHiresResignedCount;
  const recruitmentEfficiency = totalNewRecruits > 0
    ? Math.round((newHiresWorkingCount / totalNewRecruits) * 100)
    : headcountPercentage;

  const efficiencySubtext = totalNewRecruits > 0
    ? "Tỷ lệ giữ chân nhân sự mới"
    : "Tỉ lệ hoàn thành định biên";

  // --- REAL ACCURATE ATTENDANCE CALCULATIONS ---
  const extractDate = (dateStr: string) => new Date(dateStr);

  const getWeekRangeForDate = (dateStr: string) => {
    const d = extractDate(dateStr);
    const dayOfWeek = d.getDay(); 
    // Week runs Friday to next Thursday as per company formula
    const daysToThursday = (4 - dayOfWeek + 7) % 7;
    const thursday = new Date(d);
    thursday.setDate(d.getDate() + daysToThursday);
    const friday = new Date(thursday);
    friday.setDate(thursday.getDate() - 6);
    return { friday, thursday };
  };

  const getDatesInRange = (start: Date, end: Date) => {
    const dates: string[] = [];
    let current = new Date(start);
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getManpowerStatsForDate = (dateStr: string) => {
    const d = extractDate(dateStr);
    const lineFiltered = employees.filter(emp => selectedLine === 'ALL' || emp.line === selectedLine);
    
    const active = lineFiltered.filter(emp => {
      const join = extractDate(emp.joinDate);
      if (join > d) return false;
      if (emp.status === 'RESIGNED' && emp.resignDate) {
        const resign = extractDate(emp.resignDate);
        if (resign <= d) return false;
      }
      return true;
    });

    const leave = active.filter(emp => {
      if (emp.status === 'LEAVE' && emp.resignDate) {
         const leaveStart = extractDate(emp.resignDate);
         if (emp.leaveEndDate) {
           const leaveEnd = extractDate(emp.leaveEndDate);
           return leaveStart <= d && d <= leaveEnd;
         } else {
           return leaveStart <= d;
         }
      }
      return false;
    });

    return {
      total: active.length,
      leave: leave.length,
      working: active.length - leave.length
    };
  };

  const dateOptions = dayProgress && dayProgress.length > 0 
    ? dayProgress.map(dp => dp.fullDate)
    : ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24'];
    
  const defaultSelectedDate = dateOptions.includes('2026-06-23') ? '2026-06-23' : (dateOptions[dateOptions.length - 1] || '2026-06-23');

  // 1. Day Stats
  const dayStats = getManpowerStatsForDate(defaultSelectedDate);
  const attendanceToday = dayStats.total > 0 ? parseFloat(((dayStats.working / dayStats.total) * 100).toFixed(1)) : 0;

  // 2. Week Stats
  const weekRange = getWeekRangeForDate(defaultSelectedDate);
  const weekDatesStr = getDatesInRange(weekRange.friday, weekRange.thursday);
  let totalWorkingWeek = 0;
  let totalManpowerWeek = 0;
  weekDatesStr.forEach(ds => {
    const dsStats = getManpowerStatsForDate(ds);
    totalWorkingWeek += dsStats.working;
    totalManpowerWeek += dsStats.total;
  });
  const attendanceWeek = totalManpowerWeek > 0 ? parseFloat(((totalWorkingWeek / totalManpowerWeek) * 100).toFixed(1)) : 0;

  // 3. Month Stats
  const dObj = extractDate(defaultSelectedDate);
  const monthStart = new Date(dObj.getFullYear(), dObj.getMonth(), 1);
  const monthEnd = new Date(dObj.getFullYear(), dObj.getMonth() + 1, 0);
  const monthDatesStr = getDatesInRange(monthStart, monthEnd);
  let totalWorkingMonth = 0;
  let totalManpowerMonth = 0;
  monthDatesStr.forEach(ds => {
    const dsStats = getManpowerStatsForDate(ds);
    totalWorkingMonth += dsStats.working;
    totalManpowerMonth += dsStats.total;
  });
  const attendanceMonth = totalManpowerMonth > 0 ? parseFloat(((totalWorkingMonth / totalManpowerMonth) * 100).toFixed(1)) : 0;

  return (
    <div id="stats-section" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Tổng nhân sự đang làm việc */}
      <div id="stat-card-active" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 transition-all duration-300 hover:shadow-md hover:border-blue-100 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">HQ Nhân sự Đang làm việc</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{totalActive} <span className="text-sm font-bold text-slate-500">NS</span></h3>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Đang hoạt động dây chuyền
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors shrink-0">
            <Users size={18} />
          </div>
        </div>
      </div>

      {/* 2. Tổng Nhân sự định biên */}
      <div id="stat-card-capacity" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 transition-all duration-300 hover:shadow-md hover:border-amber-100 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng Nhân sự Định biên</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{targetNum} <span className="text-sm font-bold text-slate-500">CT</span></h3>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(headcountPercentage, 100)}%` }}
                ></div>
              </div>
              <span className="text-[11px] font-bold text-amber-600">{headcountPercentage}% đạt</span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors shrink-0">
            <Award size={18} />
          </div>
        </div>
      </div>

      {/* 3. Nhân sự mới */}
      <div id="stat-card-onboarding" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 transition-all duration-300 hover:shadow-md hover:border-emerald-100 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div className="flex justify-between items-start">
          <div className="w-full">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tỉ Lệ Nhận Việc</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">+{totalNewHiresCount} <span className="text-sm font-bold text-slate-500">NS</span></h3>
            
            <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap gap-x-2 font-bold select-none truncate">
               <span className="text-emerald-600">Đã đi làm: +{newHiresWorkingCount}</span> 
               <span className="text-slate-400">|</span> 
               <span className="text-amber-500">Đang chờ: +{newHiresOnboardingCount}</span>
            </div>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors shrink-0">
            <UserCheck size={16} />
          </div>
        </div>
      </div>

      {/* 4. Thôi việc (Tháng và Cả năm) */}
      <div id="stat-card-resign" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 transition-all duration-300 hover:shadow-md hover:border-rose-100 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
        <div className="flex flex-col h-full justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Giám Sát Thôi Việc (<span className="text-rose-500">Thôi Việc</span>)</p>
            </div>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-150 transition-colors shrink-0">
              <UserMinus size={14} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-auto">
            {/* Tháng này */}
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider block">Tháng 6</span>
              <div className="text-lg font-black text-rose-700 leading-none">-{resignedThisMonth} <span className="text-[9px] text-slate-500 font-bold">NS</span></div>
            </div>

            {/* Cả năm */}
            <div className="space-y-0.5 border-l border-slate-100 pl-2">
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">Năm 2026</span>
              <div className="text-lg font-black text-slate-800 leading-none">-{resignedThisYear} <span className="text-[9px] text-slate-500 font-bold">NS</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Hiệu quả tuyển dụng */}
      <div id="stat-card-efficiency" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 transition-all duration-300 hover:shadow-md hover:border-indigo-100 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        <div className="flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hiệu quả Tuyển Dụng</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">{recruitmentEfficiency}%</h3>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors shrink-0">
              <Percent size={16} />
            </div>
          </div>
          <p className="text-[10px] text-indigo-600 font-semibold mt-2 leading-tight">
            Tỉ lệ giữ chân NS nhận việc mới
          </p>
        </div>
      </div>

      {/* 6. Tỉ lệ đi làm */}
      <div id="stat-card-attendance" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 transition-all duration-300 hover:shadow-md hover:border-teal-100 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
        <div className="flex flex-col h-full justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tỉ lệ đi làm bình quân</p>
            </div>
            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-150 transition-colors shrink-0">
              <Users size={14} />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1 mt-auto text-center divide-x divide-slate-100">
            {/* Ngày */}
            <div className="px-1">
              <span className="text-[9px] font-bold text-teal-600 uppercase tracking-wider block mb-0.5">H.Nay</span>
              <div className="text-sm font-black text-teal-700 leading-none">{attendanceToday}%</div>
            </div>

            {/* Tuần */}
            <div className="px-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Tuần</span>
              <div className="text-sm font-black text-slate-700 leading-none">{attendanceWeek}%</div>
            </div>

            {/* Tháng */}
            <div className="px-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Tháng</span>
              <div className="text-sm font-black text-slate-700 leading-none">{attendanceMonth}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple internal icon trend indicator helper
function TrendingDown({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 16} 
      height={size || 16} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
      <polyline points="17 18 23 18 23 12"></polyline>
    </svg>
  );
}
