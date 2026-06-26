import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Employee, AssemblyLine, DayProgress } from './types';
import { Award, Target, HelpCircle, Activity, TrendingUp, TrendingDown, Users, AlertTriangle, Calendar, Info, Search, Trash2, X, Filter, FileSpreadsheet } from 'lucide-react';
import { RESIGNATION_REASONS, LEAVE_REASONS } from './mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import * as XLSX from 'xlsx';

interface AnalyticsSectionProps {
  employees: Employee[];
  selectedLine: AssemblyLine | 'ALL';
  dayProgress?: DayProgress[];
  onUpdateEmployees?: (employees: Employee[]) => void;
}

export default function AnalyticsSection({ employees, selectedLine, dayProgress = [], onUpdateEmployees }: AnalyticsSectionProps) {
  // Filters
  const filteredList = employees.filter(emp => selectedLine === 'ALL' || emp.line === selectedLine);

  // Get today's real date dynamically in YYYY-MM-DD format
  const todayISO = format(new Date(), 'yyyy-MM-dd');

  // --- CALCULATE ATTENDANCE RATES FOR DAY, WEEK, MONTH ---
  const rawDateOptions = dayProgress && dayProgress.length > 0 
    ? dayProgress.map(dp => dp.fullDate)
    : ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24'];
    
  // Ensure the dateOptions always dynamically includes the current date so that today is always present and selectable
  const dateOptions = Array.from(new Set([...rawDateOptions, todayISO])).sort();
    
  const defaultSelectedDate = dateOptions.includes(todayISO) ? todayISO : (dateOptions[dateOptions.length - 1] || todayISO);
  const [selectedDateStr, setSelectedDateStr] = useState(defaultSelectedDate);

  // Sync selectedDateStr with today's date on mount or when todayISO changes
  useEffect(() => {
    if (dateOptions.includes(todayISO)) {
      setSelectedDateStr(todayISO);
    }
  }, [todayISO, dayProgress]);

  const [chartViewMode, setChartViewMode] = useState<'WEEK_DAYS' | 'WEEKS' | 'MONTHS'>('WEEK_DAYS');

  // --- HISTORICAL & FUTURE TRACKING STATES AND CONTEXT ---
  const [activeHistoryTab, setActiveHistoryTab] = useState<'chart' | 'list'>('chart');
  const [reasonTimeScope, setReasonTimeScope] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH'>('ALL');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<'ALL' | 'PAST' | 'PRESENT' | 'FUTURE'>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');



  const extractDate = (dateStr: string) => new Date(dateStr);

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

  const getWeekRangeForDate = (dateStr: string) => {
    const d = extractDate(dateStr);
    const dayOfWeek = d.getDay(); 
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

  // 1. Day Stats
  const dayStats = getManpowerStatsForDate(selectedDateStr);
  const dayRate = dayStats.total > 0 ? (dayStats.working / dayStats.total) * 100 : 0;

  // 2. Week Stats (Friday to Next Thursday)
  const { friday, thursday } = getWeekRangeForDate(selectedDateStr);
  const weekDatesStr = getDatesInRange(friday, thursday);
  let totalWorkingWeek = 0;
  let totalManpowerWeek = 0;
  weekDatesStr.forEach(ds => {
    const dsStats = getManpowerStatsForDate(ds);
    totalWorkingWeek += dsStats.working;
    totalManpowerWeek += dsStats.total;
  });
  const weekRate = totalManpowerWeek > 0 ? (totalWorkingWeek / totalManpowerWeek) * 100 : 0;

  // 3. Month Stats (Entire Month of the selected Date)
  const dObj = extractDate(selectedDateStr);
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
  const monthRate = totalManpowerMonth > 0 ? (totalWorkingMonth / totalManpowerMonth) * 100 : 0;

  const chartData = [
    {
      name: `Ngày (${format(new Date(selectedDateStr), 'dd/MM')})`,
      'Tỉ lệ chuyên cần (%)': parseFloat(dayRate.toFixed(1)),
      rateRaw: dayRate,
      working: dayStats.working,
      total: dayStats.total,
      label: 'Tỷ lệ đi làm trong ngày',
      color: '#3b82f6' // Blue
    },
    {
      name: `Tuần (${format(friday, 'dd/MM')} - ${format(thursday, 'dd/MM')})`,
      'Tỉ lệ chuyên cần (%)': parseFloat(weekRate.toFixed(1)),
      rateRaw: weekRate,
      working: totalWorkingWeek,
      total: totalManpowerWeek,
      label: 'Tuần (Thứ 6 - Thứ 5 tiếp theo)',
      color: '#10b981' // Green
    },
    {
      name: `Tháng (Thg ${format(dObj, 'MM/yyyy')})`,
      'Tỉ lệ chuyên cần (%)': parseFloat(monthRate.toFixed(1)),
      rateRaw: monthRate,
      working: totalWorkingMonth,
      total: totalManpowerMonth,
      label: 'Toàn bộ ngày trong tháng',
      color: '#8b5cf6' // Purple
    }
  ];

  // --- CALCULATE MONTHLY STATS FOR EACH MONTH IN THE YEAR 2026 ---
  const getMonthlyStatsForMonth = (year: number, monthZeroBased: number) => {
    const lineFiltered = employees.filter(emp => selectedLine === 'ALL' || emp.line === selectedLine);
    const lastDay = new Date(year, monthZeroBased + 1, 0).getDate();
    let totalWorking = 0;
    let totalActive = 0;
    
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, monthZeroBased, day);
      
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

      totalWorking += (active.length - leave.length);
      totalActive += active.length;
    }

    return {
      total: totalActive,
      working: totalWorking,
      rate: totalActive > 0 ? (totalWorking / totalActive) * 100 : 0
    };
  };

  const currentMonthIdx = dObj.getMonth();
  const monthsData = [];
  for (let m = 0; m < 12; m++) {
    const stats = getMonthlyStatsForMonth(2026, m);
    // Determine colors: the currently active month has a specific highlight color, others are styled uniformly.
    // We can use beautifully styled colors:
    const isCurrent = m === currentMonthIdx;
    monthsData.push({
      name: `T${m + 1}`,
      'Tỉ lệ chuyên cần (%)': parseFloat(stats.rate.toFixed(1)),
      rateRaw: stats.rate,
      working: stats.working,
      total: stats.total,
      label: `Tháng ${m + 1}/2026`,
      color: isCurrent ? '#8b5cf6' : '#64748b' 
    });
  }

  // --- CALCULATE DAILY ATTENDANCE FOR ALL DAYS IN SELECTED WEEK ---
  const weekDaysData = weekDatesStr.map(ds => {
    const stats = getManpowerStatsForDate(ds);
    const dayRate = stats.total > 0 ? (stats.working / stats.total) * 100 : 0;
    const dateObj = extractDate(ds);
    const daysVietnamese = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayOfWeekStr = daysVietnamese[dateObj.getDay()];
    const isSelected = ds === selectedDateStr;

    return {
      name: dayOfWeekStr === 'Chủ Nhật' ? `CN\n(${format(dateObj, 'dd/MM')})` : `${dayOfWeekStr.replace('Thứ ', 'T')}\n(${format(dateObj, 'dd/MM')})`,
      'Tỉ lệ chuyên cần (%)': parseFloat(dayRate.toFixed(1)),
      rateRaw: dayRate,
      working: stats.working,
      total: stats.total,
      label: `${dayOfWeekStr} (${format(dateObj, 'dd/MM/yyyy')})`,
      color: isSelected ? '#f59e0b' : '#3b82f6' // Amber for selected date, Blue for other days
    };
  });

  // --- CALCULATE ATTENDANCE FOR RECENT 5 WEEKS ---
  const weeksCompareData = [];
  const currWeekRange = getWeekRangeForDate(selectedDateStr); // { friday, thursday }
  
  for (let i = 4; i >= 0; i--) {
    const fDate = new Date(currWeekRange.friday);
    fDate.setDate(currWeekRange.friday.getDate() - i * 7);
    
    const tDate = new Date(currWeekRange.thursday);
    tDate.setDate(currWeekRange.thursday.getDate() - i * 7);
    
    const rangeStr = getDatesInRange(fDate, tDate);
    let totalWorkingW = 0;
    let totalManpowerW = 0;
    
    rangeStr.forEach(ds => {
      const stats = getManpowerStatsForDate(ds);
      totalWorkingW += stats.working;
      totalManpowerW += stats.total;
    });
    
    const rateW = totalManpowerW > 0 ? (totalWorkingW / totalManpowerW) * 100 : 0;
    
    const weekLabel = `T. ${format(fDate, 'dd/MM')} - ${format(tDate, 'dd/MM')}`;
    const isSelectedWeek = i === 0;

    weeksCompareData.push({
      name: weekLabel,
      'Tỉ lệ chuyên cần (%)': parseFloat(rateW.toFixed(1)),
      rateRaw: rateW,
      working: totalWorkingW,
      total: totalManpowerW,
      label: `Tuần từ ${format(fDate, 'dd/MM/yyyy')} đến ${format(tDate, 'dd/MM/yyyy')}`,
      color: isSelectedWeek ? '#10b981' : '#34d399' // Emerald Green for active/current week, soft emerald for historical
    });
  }

  const activeChartData = chartViewMode === 'WEEK_DAYS' 
    ? weekDaysData 
    : chartViewMode === 'WEEKS'
      ? weeksCompareData
      : monthsData;

  const activeBarSize = chartViewMode === 'WEEK_DAYS' 
    ? 28 
    : chartViewMode === 'WEEKS'
      ? 34
      : 18;
  
  // --- COMPLETE PAST, PRESENT, FUTURE RETRIEVAL & HISTORICAL ARCHIVE ENGINE ---
  const rawHistoryRecords = filteredList.filter(emp => {
    return emp.status === 'RESIGNED' || emp.status === 'LEAVE' || (emp.resignDate && emp.resignDate !== '');
  }).map(emp => {
    const isResigned = emp.status === 'RESIGNED';
    const startStr = emp.resignDate || emp.joinDate || todayISO;
    const endStr = emp.status === 'LEAVE' ? emp.leaveEndDate || '' : '';
    
    // Compare dates to today's perspective dynamically
    const todayStr = todayISO;
    let timeCategory: 'PAST' | 'PRESENT' | 'FUTURE' = 'PRESENT';
    
    if (isResigned) {
      if (startStr < todayStr) {
        timeCategory = 'PAST';
      } else if (startStr === todayStr) {
        timeCategory = 'PRESENT';
      } else {
        timeCategory = 'FUTURE';
      }
    } else {
      const end = endStr || startStr;
      if (end < todayStr) {
        timeCategory = 'PAST';
      } else if (startStr > todayStr) {
        timeCategory = 'FUTURE';
      } else {
        timeCategory = 'PRESENT';
      }
    }

    return {
      id: emp.id,
      fullName: emp.fullName,
      code: emp.code,
      line: emp.line,
      type: (emp.status === 'RESIGNED' ? 'RESIGNED' : 'LEAVE') as 'RESIGNED' | 'LEAVE',
      startDate: startStr,
      endDate: endStr,
      reason: emp.resignReason || 'Không rõ lý do',
      timeCategory,
      employee: emp,
    };
  });

  const getFilteredByTimeScope = (records: typeof rawHistoryRecords) => {
    if (reasonTimeScope === 'ALL') return records;
    
    const dObj = extractDate(selectedDateStr);
    
    if (reasonTimeScope === 'DAY') {
      const targetDateStr = selectedDateStr;
      return records.filter(rec => {
        if (rec.type === 'RESIGNED') {
          return rec.startDate === targetDateStr;
        } else {
          const start = rec.startDate;
          const end = rec.endDate || start;
          return start <= targetDateStr && targetDateStr <= end;
        }
      });
    }
    
    if (reasonTimeScope === 'WEEK') {
      const { friday, thursday } = getWeekRangeForDate(selectedDateStr);
      const fStr = format(friday, 'yyyy-MM-dd');
      const tStr = format(thursday, 'yyyy-MM-dd');
      
      return records.filter(rec => {
        if (rec.type === 'RESIGNED') {
          return rec.startDate >= fStr && rec.startDate <= tStr;
        } else {
          const start = rec.startDate;
          const end = rec.endDate || start;
          return start <= tStr && end >= fStr;
        }
      });
    }
    
    if (reasonTimeScope === 'MONTH') {
      const start = new Date(dObj.getFullYear(), dObj.getMonth(), 1);
      const end = new Date(dObj.getFullYear(), dObj.getMonth() + 1, 0);
      const fStr = format(start, 'yyyy-MM-dd');
      const tStr = format(end, 'yyyy-MM-dd');
      
      return records.filter(rec => {
        if (rec.type === 'RESIGNED') {
          return rec.startDate >= fStr && rec.startDate <= tStr;
        } else {
          const start = rec.startDate;
          const end = rec.endDate || start;
          return start <= tStr && end >= fStr;
        }
      });
    }
    
    return records;
  };

  const scopeRecords = getFilteredByTimeScope(rawHistoryRecords);
  
  // Resigned list and Leave list calculated dynamically based on time scope
  const resignedList = scopeRecords.filter(r => r.type === 'RESIGNED').map(r => r.employee);
  const leaveList = scopeRecords.filter(r => r.type === 'LEAVE').map(r => r.employee);

  const activeList = filteredList.filter(emp => emp.status !== 'RESIGNED');
  const onboardingList = filteredList.filter(emp => emp.status === 'ONBOARDING');

  // Filter history records for display in the tab
  const displayHistoryRecords = rawHistoryRecords.filter(rec => {
    // Search filter
    if (historySearchQuery) {
      const q = historySearchQuery.toLowerCase();
      const matchName = rec.fullName.toLowerCase().includes(q);
      const matchCode = rec.code.toLowerCase().includes(q);
      const matchReason = rec.reason.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchReason) return false;
    }
    
    // Time category filter (Past, Present, Future)
    if (historyTimeFilter !== 'ALL' && rec.timeCategory !== historyTimeFilter) {
      return false;
    }
    
    return true;
  });
  
  // Recalculate reasons
  const reasonCounts: Record<string, number> = {};
  RESIGNATION_REASONS.forEach(r => {
    reasonCounts[r] = 0;
  });
  LEAVE_REASONS.forEach(r => {
    reasonCounts[r] = 0;
  });
  
  let otherReasonsCount = 0;
  resignedList.forEach(emp => {
    if (emp.resignReason) {
      if (reasonCounts[emp.resignReason] !== undefined) {
        reasonCounts[emp.resignReason]++;
      } else {
        otherReasonsCount++;
      }
    }
  });

  let otherLeaveReasonsCount = 0;
  leaveList.forEach(emp => {
    if (emp.resignReason) {
      if (reasonCounts[emp.resignReason] !== undefined) {
        reasonCounts[emp.resignReason]++;
      } else {
        otherLeaveReasonsCount++;
      }
    }
  });

  const sortedReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count, type: LEAVE_REASONS.includes(reason) ? 'LEAVE' : 'RESIGNED' }))
    .concat(otherReasonsCount > 0 ? [{ reason: 'Lý do thôi việc khác (Viết tay)', count: otherReasonsCount, type: 'RESIGNED' }] : [])
    .concat(otherLeaveReasonsCount > 0 ? [{ reason: 'Lý do nghỉ phép khác (Viết tay)', count: otherLeaveReasonsCount, type: 'LEAVE' }] : [])
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxReasonCount = sortedReasons.length > 0 ? Math.max(...sortedReasons.map(r => r.count)) : 1;

  // Gender demographics
  const maleCount = activeList.filter(emp => emp.gender === 'Nam').length;
  const femaleCount = activeList.filter(emp => emp.gender === 'Nữ').length;
  const totalGender = maleCount + femaleCount || 1;
  const malePercent = Math.round((maleCount / totalGender) * 100);
  const femalePercent = Math.round((femaleCount / totalGender) * 100);

  // Time Series Trend for June 2026
  // Days of June: 1 to 24
  const juneDays = Array.from({ length: 24 }, (_, i) => i + 1);
  const chronologicalIn = juneDays.map(day => {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    // Find how many joined in June
    return filteredList.filter(emp => emp.joinDate === `2026-06-${dayStr}`).length;
  });

  const chronologicalOut = juneDays.map(day => {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    return filteredList.filter(emp => emp.status === 'RESIGNED' && emp.resignDate === `2026-06-${dayStr}`).length;
  });

  // Scale calculations for trend line
  const maxChronologicalValue = Math.max(...chronologicalIn, ...chronologicalOut, 1);
  
  // SVG Canvas configuration
  const width = 600;
  const height = 180;
  const padding = 30;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Point generator
  const getCoordinates = (dayIndex: number, val: number) => {
    const x = padding + (dayIndex / (juneDays.length - 1)) * graphWidth;
    const y = height - padding - (val / maxChronologicalValue) * graphHeight;
    return `${x},${y}`;
  };

  const inPoints = juneDays.map((_, i) => getCoordinates(i, chronologicalIn[i])).join(' ');
  const outPoints = juneDays.map((_, i) => getCoordinates(i, chronologicalOut[i])).join(' ');

  // Excel Export feature using SheetJS (xlsx) for History records
  const handleExportChangesExcel = () => {
    if (displayHistoryRecords.length === 0) {
      alert('Không có dữ liệu biến động để xuất Excel.');
      return;
    }
    
    // Prepare rows for Excel sheet
    const dataRows = displayHistoryRecords.map((rec, index) => ({
      'STT': index + 1,
      'Mã Nhân Viên': rec.code,
      'Họ Và Tên': rec.fullName,
      'Dây chuyền (DC)': rec.line,
      'Hình thức biến động': rec.type === 'RESIGNED' ? 'Thôi việc chính thức' : 'Tạm nghỉ / Nghỉ phép',
      'Ngày bắt đầu': rec.startDate,
      'Ngày kết thúc': rec.endDate || 'Chưa xác định',
      'Lý do chi tiết': rec.reason,
      'Phân loại thời gian': rec.timeCategory === 'PAST' ? 'Quá khứ' : rec.timeCategory === 'PRESENT' ? 'Hiện tại' : 'Tương lai'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    
    // Add custom styling: broad column widths
    const colWidths = [
      { wch: 6 },  // STT
      { wch: 15 }, // Mã Nhân Viên
      { wch: 25 }, // Họ Và Tên
      { wch: 20 }, // Dây chuyền
      { wch: 22 }, // Hình thức
      { wch: 15 }, // Ngày bắt đầu
      { wch: 15 }, // Ngày kết thúc
      { wch: 40 }, // Lý do
      { wch: 18 }  // Phân loại
    ];
    worksheet['!cols'] = colWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Biến động nhân sự');

    // Write file and download
    const dateStr = format(new Date(), 'dd-MM-yyyy');
    XLSX.writeFile(workbook, `Nhat_ky_bien_dong_nhan_su_${dateStr}.xlsx`);
  };

  return (
    <div className="space-y-6" id="analytics-section">
      
      {/* 📊 BIỂU ĐỒ CỘT TỶ LỆ CHUYÊN CẦN NGÀY, TUẦN, THÁNG (GĐ 3) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 pb-5 mb-5">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="text-blue-500" size={20} />
              Tỉ Lệ Chuyên Cần Bình Quân Chuyền
            </h3>
            <p className="text-slate-500 text-[11px] font-medium">
              Phân tích chỉ số đi làm thực tế theo các ngày trong Tuần, so sánh giữa các Tuần & các Tháng của chuyền <span className="font-extrabold text-slate-700">{selectedLine === 'ALL' ? 'Tất cả' : selectedLine}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-end">
            {/* Bộ chọn Chế độ hiển thị */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setChartViewMode('WEEK_DAYS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                  chartViewMode === 'WEEK_DAYS'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tỷ lệ đi làm cả Tuần (7 ngày)
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('WEEKS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                  chartViewMode === 'WEEKS'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                So sánh các Tuần
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('MONTHS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                  chartViewMode === 'MONTHS'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                So sánh 12 Tháng
              </button>
            </div>

            {/* Chọn Ngày Đối Chiếu */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Ngày đối chiếu:</span>
              <select
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="text-xs font-extrabold bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs transition"
              >
                {dateOptions.map(ds => {
                  try {
                    const d = new Date(ds);
                    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                    return (
                      <option key={ds} value={ds}>
                        {days[d.getDay()]} ({format(d, 'dd/MM/yyyy')})
                      </option>
                    );
                  } catch {
                    return <option key={ds} value={ds}>{ds}</option>;
                  }
                })}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          
          {/* Left panel: Detailed Stats cards & Bold Summary for the Report */}
          <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
            
            <div className="space-y-4">
              <div className="pb-1">
                <span className="text-xs font-black text-blue-600 tracking-wider uppercase bg-blue-50 px-2.5 py-1 rounded-lg">Bản xem tóm tắt số liệu</span>
              </div>
              {chartData.map((item, idx) => (
                <div key={`stat-${idx}`} className="p-4 rounded-xl border border-slate-100 bg-white shadow-xs flex items-center justify-between gap-4 transition hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                      {idx === 0 ? <Activity size={20} /> : idx === 1 ? <TrendingUp size={20} /> : <Calendar size={20} />}
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-400 tracking-wider block">
                        {idx === 0 ? 'Báo cáo Hôm nay' : idx === 1 ? 'Bình Quân Tuần' : 'Bình Quân Tháng'}
                      </span>
                      <span className="text-xs sm:text-[13px] font-extrabold text-slate-755 block mt-0.5 truncate max-w-[140px] sm:max-w-[200px]" title={item.name}>
                        {idx === 0 ? `Hôm nay (${format(new Date(selectedDateStr), 'dd/MM')})` : idx === 1 ? `Từ ${format(friday, 'dd/MM')} - ${format(thursday, 'dd/MM')}` : `Tháng ${format(dObj, 'MM/yyyy')}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl sm:text-3xl font-black block tracking-tight" style={{ color: item.color }}>
                      {item.total > 0 ? `${item['Tỉ lệ chuyên cần (%)']}%` : '-'}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-500 font-extrabold block mt-0.5">
                      {item.working} / {item.total} nhân sự
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <p className="text-[11px] text-slate-400 font-bold italic">
                * Dữ liệu chuyên cần được tính toán trực tiếp từ thời gian đi làm thực tế và các phép nghỉ của nhân viên.
              </p>
            </div>

          </div>

          {/* Right panel: Bar chart using Recharts */}
          <div className="lg:col-span-3 bg-slate-50/30 rounded-2xl border border-slate-100 p-4">
            <div className="h-76 sm:h-84 md:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeChartData}
                  margin={{ top: 35, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                    unit="%"
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1.5 min-w-[200px]">
                            <p className="font-extrabold text-slate-200 border-b border-slate-800 pb-1 text-[13px]">{data.label || data.name}</p>
                            <div className="font-medium text-slate-300">
                              <p>• Trực thuộc: <span className="text-white font-extrabold">{selectedLine === 'ALL' ? 'Tất cả chuyền' : selectedLine}</span></p>
                              <p>• Đi làm thực tế: <span className="text-emerald-400 font-extrabold">{data.working} nhân sự</span></p>
                              <p>• Tổng nhân lực: <span className="text-blue-400 font-extrabold">{data.total} nhân sự</span></p>
                              <p className="border-t border-slate-800 pt-1 mt-1 text-[13px] text-yellow-400 font-black">
                                 Tỉ lệ đi làm: {data['Tỉ lệ chuyên cần (%)']}%
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="Tỉ lệ chuyên cần (%)" 
                    radius={[8, 8, 0, 0]}
                    barSize={activeBarSize}
                  >
                    {activeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList 
                      dataKey="Tỉ lệ chuyên cần (%)" 
                      position="top" 
                      formatter={(val: number) => typeof val === 'number' && val > 0 ? `${val}%` : ''} 
                      style={{ fill: '#0f172a', fontSize: 13, fontWeight: 900 }} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="analytics-section-inner">
      
      {/* COLUMN 1: INTERACTIVE PAST-PRESENT-FUTURE HISTORY LOG & REASON ANALYTICS (Answers user prompt on data repository!) */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          {/* Header Title section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle size={17} className="text-rose-500" /> Phân Tích Nguyên Nhân Thôi & Tạm Nghỉ
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Kho lưu trữ dữ liệu & phân tích biến động nhân sự (Quá khứ - Hiện tại - Tương lai)</p>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 shadow-3xs">
                {resignedList.length} thôi việc
              </span>
              <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shadow-3xs">
                {leaveList.length} nghỉ phép
              </span>
            </div>
          </div>

          {/* Action Tabs and Scope Selectors */}
          <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between bg-slate-50 p-2.5 rounded-xl mb-5 border border-slate-100">
            {/* Left: Interactive Tab Buttons */}
            <div className="inline-flex bg-slate-200/60 p-1 rounded-xl w-full xl:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveHistoryTab('chart')}
                className={`flex-1 xl:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeHistoryTab === 'chart'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp size={14} className="shrink-0" /> Xếp hạng Nguyên nhân
              </button>
              <button
                type="button"
                onClick={() => setActiveHistoryTab('list')}
                className={`flex-1 xl:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeHistoryTab === 'list'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={14} className="shrink-0" /> Nhật ký Biến động ({rawHistoryRecords.length})
              </button>
            </div>

            {/* Right: Data Scope Selector & Export Excel */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto shrink-0">
              <select
                value={reasonTimeScope}
                onChange={(e) => setReasonTimeScope(e.target.value as any)}
                className="flex-1 xl:flex-none text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-3xs transition"
              >
                <option value="ALL">Toàn Bộ Thời Gian</option>
                <option value="DAY">Lọc Ngày Đang Chọn ({format(new Date(selectedDateStr), 'dd/MM/yyyy')})</option>
                <option value="WEEK">Lọc Tuần ({format(getWeekRangeForDate(selectedDateStr).friday, 'dd/MM')} - {format(getWeekRangeForDate(selectedDateStr).thursday, 'dd/MM')})</option>
                <option value="MONTH">Lọc Tháng ({format(new Date(selectedDateStr), 'MM/yyyy')})</option>
              </select>

              <button
                type="button"
                onClick={handleExportChangesExcel}
                className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-3xs whitespace-nowrap"
                title="Xuất danh sách biến động đang hiển thị ra file Excel (.xlsx)"
              >
                <FileSpreadsheet size={14} className="shrink-0" />
                <span>Xuất File Excel</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: RANKING CHART */}
          {activeHistoryTab === 'chart' && (
            <div>
              {sortedReasons.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  Chưa ghi nhận ca thôi việc / tạm nghỉ nào tương ứng với bộ lọc.
                </div>
              ) : (
                <div className="space-y-4 my-2">
                  {sortedReasons.map((item, idx) => {
                    const totalRelevantListLength = item.type === 'LEAVE' ? Math.max(leaveList.length, 1) : Math.max(resignedList.length, 1);
                    const percentOfReason = Math.round((item.count / totalRelevantListLength) * 100);
                    const barWidthPercent = Math.round((item.count / maxReasonCount) * 100);
                    const colorCode = item.type === 'LEAVE' ? 'amber' : 'rose';
                    const labelType = item.type === 'LEAVE' ? 'Nghỉ vắng' : 'Thôi việc';
                    
                    return (
                      <div key={`reason-${idx}`} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-800 max-w-sm truncate" title={item.reason}>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] bg-${colorCode}-50 text-${colorCode}-700 mr-1.5 align-middle border border-${colorCode}-200 sm:inline-block uppercase tracking-wider font-bold`}>{labelType}</span>
                            <span className="align-middle text-[13px] font-bold text-slate-700">{idx + 1}. {item.reason}</span>
                          </span>
                          <span className="text-slate-500 font-bold whitespace-nowrap">
                            {item.count} NS <span className={item.type === 'LEAVE' ? 'text-amber-600 font-black' : 'text-rose-600 font-black'}>({percentOfReason}%)</span>
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${item.type === 'LEAVE' ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${barWidthPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Suggestion note card */}
              <div className="mt-5 p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
                <span className="text-base text-amber-500">💡</span>
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">Lời khuyên đề xuất Giữ chân lao động:</span>
                  <p className="leading-relaxed font-medium text-slate-600">
                    {sortedReasons.length > 0 && sortedReasons[0].reason.includes('Lương') && 'Phản hồi cao nhất liên quan đến Thu Nhập. Quản lý cần đề xuất cải tiến tăng phụ cấp chuyên cần và thâm niên cho lao động DCLR.'}
                    {sortedReasons.length > 0 && sortedReasons[0].reason.includes('áp lực') && 'Áp lực công việc chiếm tỉ lệ lớn. Cần cân đối lại định hướng và gia tăng nghỉ giải lao ngắn khoảng 5 phút giữa ca để tổ trưởng tương tác điều độ.'}
                    {sortedReasons.length === 0 && 'Chưa phát sinh biến động nghỉ việc đột biến trong phạm vi lọc. Hãy tiếp tục duy trì chế độ hỏi thăm, động viên đầu ca làm việc của các Tổ trưởng.'}
                    {sortedReasons.length > 0 && !sortedReasons[0].reason.includes('Lương') && !sortedReasons[0].reason.includes('áp lực') && 'Hãy chú trọng đào tạo hội nhập ban đầu để tránh hao hụt lao động mới trong 30 ngày tập sự.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: DATA STORE TABLE / logs HISTORY */}
          {activeHistoryTab === 'list' && (
            <div className="space-y-4">
              {/* Form trigger and Search toolbar */}
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search box */}
                <div className="relative w-full md:w-72">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm theo Mã NV, Họ tên, Lý do..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 text-xs rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                  {historySearchQuery && (
                    <button onClick={() => setHistorySearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Sub-filters for Past, Present, Future */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none py-1">
                  <button
                    onClick={() => setHistoryTimeFilter('ALL')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition uppercase border ${
                      historyTimeFilter === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Tất cả ({rawHistoryRecords.length})
                  </button>
                  <button
                    onClick={() => setHistoryTimeFilter('PAST')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition uppercase border ${
                      historyTimeFilter === 'PAST'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Quá khứ ({rawHistoryRecords.filter(r => r.timeCategory === 'PAST').length})
                  </button>
                  <button
                    onClick={() => setHistoryTimeFilter('PRESENT')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition uppercase border ${
                      historyTimeFilter === 'PRESENT'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Hiện tại ({rawHistoryRecords.filter(r => r.timeCategory === 'PRESENT').length})
                  </button>
                  <button
                    onClick={() => setHistoryTimeFilter('FUTURE')}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition uppercase border ${
                      historyTimeFilter === 'FUTURE'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Tương lai ({rawHistoryRecords.filter(r => r.timeCategory === 'FUTURE').length})
                  </button>
                </div>
              </div>

              {/* Data list view */}
              {displayHistoryRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  Không tìm thấy lịch sử biến động nào khớp bộ lọc.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-96 overflow-y-auto shadow-3xs">
                  <table className="min-w-full divide-y divide-slate-100 text-left">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-2.5">Họ tên & Mã NV</th>
                        <th className="px-3.5 py-2.5">DC</th>
                        <th className="px-3.5 py-2.5">Loại</th>
                        <th className="px-3.5 py-2.5">Thời hạn</th>
                        <th className="px-3.5 py-2.5">Lý do</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-700">
                      {displayHistoryRecords.map((rec) => {
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-3.5 py-2.5">
                              <span className="font-extrabold block text-slate-800">{rec.fullName}</span>
                              <span className="text-[10px] text-slate-400 font-mono tracking-wide">{rec.code}</span>
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-slate-500">{rec.line}</td>
                            <td className="px-3.5 py-2.5">
                              {rec.type === 'RESIGNED' ? (
                                <span className="inline-block px-1.5 py-0.5 text-[9px] bg-rose-50 text-rose-700 font-extrabold rounded border border-rose-100 uppercase tracking-widest">Thôi việc</span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 text-[9px] bg-amber-50 text-amber-700 font-extrabold rounded border border-amber-100 uppercase tracking-widest">Nghỉ phép</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono text-[10.5px]">
                              {rec.type === 'RESIGNED' ? (
                                <span className="text-rose-600 font-medium">{format(new Date(rec.startDate), 'dd/MM/yyyy')}</span>
                              ) : (
                                <span className="text-amber-600 font-medium">
                                  {format(new Date(rec.startDate), 'dd/MM')} ➔ {rec.endDate ? format(new Date(rec.endDate), 'dd/MM/yy') : 'vô thời hạn'}
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600 max-w-[130px] truncate" title={rec.reason}>
                              {rec.reason}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DIALOG SHEET / DRAWER FORM FOR DATABASE WRITING - REMOVED */}



      </div>

      {/* COLUMN 2: GENDER & LINE DISTRIBUTIONS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5 mb-4">
            <Users size={17} className="text-blue-500" /> Cơ Cấu Nhân Sự Đang Làm Việc
          </h4>

          {/* Line distribution */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phân bổ theo Dây chuyền</p>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-blue-600 block mb-0.5">Dây chuyền DCLR</span>
                  <span className="text-xl font-extrabold text-blue-800">
                    {employees.filter(e => e.line === 'DCLR' && e.status !== 'RESIGNED').length} <span className="text-xs font-semibold text-slate-500">NS</span>
                  </span>
                </div>
                <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                  <span className="text-[10px] uppercase font-bold text-teal-600 block mb-0.5">DC RMA BG</span>
                  <span className="text-xl font-extrabold text-teal-800">
                    {employees.filter(e => e.line === 'DC RMA BG' && e.status !== 'RESIGNED').length} <span className="text-xs font-semibold text-slate-500">NS</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Gender demographics bar */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cơ cấu Giới Tính</p>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-600">
                <span>🕺 Nam: {maleCount} ({malePercent}%)</span>
                <span>💃 Nữ: {femaleCount} ({femalePercent}%)</span>
              </div>
              <div className="w-full flex h-3.5 rounded-full overflow-hidden bg-slate-150">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: `${malePercent}%` }}
                  title={`Nam: ${malePercent}%`}
                ></div>
                <div 
                  className="bg-rose-450 bg-rose-400 h-full transition-all duration-500" 
                  style={{ width: `${femalePercent}%` }}
                  title={`Nữ: ${femalePercent}%`}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium italic">
                <span>* Chỉ tính nhân viên đang làm việc</span>
                <span>Tổng cộng: {activeList.length} NS</span>
              </div>
            </div>
          </div>
        </div>

        {/* General health score indicators */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-semibold">Tình trạng nhân sự:</span>
          {resignedList.length <= activeList.length * 0.1 ? (
            <span className="bg-emerald-150 bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full border border-emerald-200">
              Ổn định tối ưu (Xanh)
            </span>
          ) : (
            <span className="bg-amber-150 bg-amber-50 text-amber-800 font-extrabold px-2.5 py-1 rounded-full border border-amber-200">
              Có hao hụt cần ổn định
            </span>
          )}
        </div>
      </div>


      {/* COLUMN 3: TIME-LINE TRENDS JUN 2026 */}
      <div className="col-span-1 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <Activity size={17} className="text-blue-600" /> Tiến Trình Biến Động Nhân Sự
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Bản đồ theo dõi lịch sử số lượng Nhận việc (IN) và Nghỉ việc (OUT) trong Tháng 6/2026</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <span className="inline-block w-2.5 h-1 bg-emerald-500 rounded-full"></span>
              Tuyển mới (IN)
            </div>
            <div className="flex items-center gap-1.5 text-rose-600">
              <span className="inline-block w-2.5 h-1 bg-rose-500 rounded-full"></span>
              Thôi việc (OUT)
            </div>
          </div>
        </div>

        {/* TIME SERIES SVG CANVAS */}
        <div className="mt-4 flex justify-center">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-slate-50/50 rounded-xl border border-slate-100 overflow-visible">
            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
            <line x1={padding} y1={height - padding - graphHeight * 0.5} x2={width - padding} y2={height - padding - graphHeight * 0.5} stroke="#f1f5f9" strokeWidth="1" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1" />

            {/* Vertical grid lines for key dates (1, 5, 10, 15, 20, 24) */}
            {[1, 5, 10, 15, 20, 24].map((day) => {
              const xIdx = day - 1;
              const xValue = padding + (xIdx / (juneDays.length - 1)) * graphWidth;
              return (
                <g key={`v-grid-${day}`}>
                  <line x1={xValue} y1={padding} x2={xValue} y2={height - padding} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <text x={xValue} y={height - 12} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#64748b">
                    {day < 10 ? `0${day}` : `${day}`}-Jun
                  </text>
                </g>
              );
            })}

            {/* Y Axis Legend values */}
            <text x={padding - 5} y={padding + 4} fontSize="8" fontWeight="bold" textAnchor="end" fill="#94a3b8">
              {maxChronologicalValue}
            </text>
            <text x={padding - 5} y={height - padding + 3} fontSize="8" fontWeight="bold" textAnchor="end" fill="#94a3b8">
              0
            </text>

            {/* In Line Path */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={inPoints}
            />

            {/* Out Line Path */}
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={outPoints}
            />

            {/* Circles for key data points (e.g. 15-Jun where values are higher) */}
            {juneDays.map((day, idx) => {
              const inVal = chronologicalIn[idx];
              const outVal = chronologicalOut[idx];
              const x = padding + (idx / (juneDays.length - 1)) * graphWidth;
              
              const nodes = [];
              if (inVal > 0) {
                const yIn = height - padding - (inVal / maxChronologicalValue) * graphHeight;
                nodes.push(
                  <g key={`in-node-${day}`}>
                    <circle cx={x} cy={yIn} r="4" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
                    {inVal > 1 && (
                      <text x={x} y={yIn - 7} fontSize="8" fontWeight="extrabold" fill="#047857" textAnchor="middle">
                        +{inVal}
                      </text>
                    )}
                  </g>
                );
              }
              if (outVal > 0) {
                const yOut = height - padding - (outVal / maxChronologicalValue) * graphHeight;
                nodes.push(
                  <g key={`out-node-${day}`}>
                    <circle cx={x} cy={yOut} r="4" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                    <text x={x} y={yOut + 11} fontSize="8" fontWeight="extrabold" fill="#be123c" textAnchor="middle">
                      -{outVal}
                    </text>
                  </g>
                );
              }
              return nodes;
            })}
          </svg>
        </div>
      </div>

    </div>

  </div>
  );
}
