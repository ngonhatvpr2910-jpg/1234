import React from 'react';
import { Employee, DayProgress, AssemblyLine } from './types';
import { Calendar, Users, Target, Activity } from 'lucide-react';
import { format, parseISO, isBefore, isAfter, isEqual } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DailyManpowerReportProps {
  employees: Employee[];
  dayProgress: DayProgress[];
  selectedLine: AssemblyLine | 'ALL';
  onUpdateDayProgress?: (updated: DayProgress[]) => void;
}

export default function DailyManpowerReport({ employees, dayProgress, selectedLine, onUpdateDayProgress }: DailyManpowerReportProps) {
  
  const extractDate = (dateStr: string) => {
    // "2026-06-15"
    return new Date(dateStr);
  };

  const getDayFormatted = (dateStr: string) => {
    try {
      const d = extractDate(dateStr);
      const isSun = d.getDay() === 0;
      return `${isSun ? 'CN' : 'Thứ ' + (d.getDay() + 1)}-${format(d, 'dd/MM/yy')}`;
    } catch {
      return dateStr;
    }
  };

  const getWeekId = (d: Date) => {
    const dayOfWeek = d.getDay();
    const daysToThursday = (4 - dayOfWeek + 7) % 7;
    const thursday = new Date(d);
    thursday.setDate(d.getDate() + daysToThursday);
    const friday = new Date(thursday);
    friday.setDate(thursday.getDate() - 6);
    return `${format(friday, 'dd/MM')} - ${format(thursday, 'dd/MM')}`;
  };

  const renderTableRows = () => {
    let rows: React.ReactNode[] = [];

    // Pre-calculate weekly aggregates
    const weeklyAggregates: Record<string, Record<string, { working: number, manpower: number }>> = {};

    dayProgress.forEach(day => {
      const d = extractDate(day.fullDate);
      const weekId = getWeekId(d);
      
      const allLines: AssemblyLine[] = ['DCLR', 'DC RMA BG'];
      allLines.forEach(line => {
        const activeEmployees = employees.filter(emp => {
          if (emp.line !== line) return false;
          const join = extractDate(emp.joinDate);
          if (join > d) return false;
          if (emp.status === 'RESIGNED' && emp.resignDate) {
            const resign = extractDate(emp.resignDate);
            if (resign <= d) return false;
          }
          return true;
        });

        const leaveEmployees = activeEmployees.filter(emp => {
          if (emp.status === 'LEAVE' && emp.resignDate) {
             const leaveStart = extractDate(emp.resignDate);
             if (emp.leaveEndDate) {
               const leaveEnd = extractDate(emp.leaveEndDate);
               if (leaveStart <= d && d <= leaveEnd) return true;
             } else {
               if (leaveStart <= d) return true;
             }
          }
          return false;
        });

        const totalManpower = activeEmployees.length;
        const totalLeave = leaveEmployees.length;
        const officialWorking = totalManpower - totalLeave;

        if (!weeklyAggregates[weekId]) weeklyAggregates[weekId] = {};
        if (!weeklyAggregates[weekId][line]) weeklyAggregates[weekId][line] = { working: 0, manpower: 0 };
        
        weeklyAggregates[weekId][line].working += officialWorking;
        weeklyAggregates[weekId][line].manpower += totalManpower;
      });
    });

    const systemToday = new Date();
    const dayOfWeek = systemToday.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(systemToday);
    monday.setDate(systemToday.getDate() - distanceToMonday);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(format(d, 'yyyy-MM-dd'));
    }

    weekDates.forEach((dateStr) => {
      const d = extractDate(dateStr);
      const weekId = getWeekId(d);
      
      const dayIndex = dayProgress.findIndex(dp => dp.fullDate === dateStr);
      const day = dayIndex !== -1 ? dayProgress[dayIndex] : {
        date: format(d, 'dd-MMM'),
        fullDate: dateStr,
        targets: {
          'DCLR': { in: 0, out: 0, demand: 0, reception: 0 },
          'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
        }
      } as DayProgress;
      
      const lines: AssemblyLine[] = selectedLine === 'ALL' ? ['DCLR', 'DC RMA BG'] : [selectedLine];
      
      lines.forEach((line) => {
        const activeEmployees = employees.filter(emp => {
          if (emp.line !== line) return false;
          const join = extractDate(emp.joinDate);
          if (join > d) return false;
          if (emp.status === 'RESIGNED' && emp.resignDate) {
            const resign = extractDate(emp.resignDate);
            if (resign <= d) return false;
          }
          return true;
        });

        const leaveEmployees = activeEmployees.filter(emp => {
          if (emp.status === 'LEAVE' && emp.resignDate) {
             const leaveStart = extractDate(emp.resignDate);
             if (emp.leaveEndDate) {
               const leaveEnd = extractDate(emp.leaveEndDate);
               if (leaveStart <= d && d <= leaveEnd) return true;
             } else {
               if (leaveStart <= d) return true;
             }
          }
          return false;
        });

        const newHires = activeEmployees.filter(emp => emp.joinDate === dateStr);
        const latestResigns = employees.filter(emp => emp.line === line && emp.status === 'RESIGNED' && emp.resignDate === dateStr);

        const tempWorkers = day.targets[line]?.tempWorkers || 0;
        const totalManpower = activeEmployees.length;
        const totalLeave = leaveEmployees.length;
        const officialWorking = totalManpower - totalLeave;
        const totalWorkingIncludesTemp = officialWorking + tempWorkers;
        const rate = totalManpower > 0 ? ((officialWorking / totalManpower) * 100).toFixed(2) : '0.00';

        const weeklyAgg = weeklyAggregates[weekId]?.[line];
        const weeklyRate = weeklyAgg && weeklyAgg.manpower > 0 ? ((weeklyAgg.working / weeklyAgg.manpower) * 100).toFixed(2) : '0.00';

        const leaveReasons = leaveEmployees.map(emp => emp.resignReason);
        const uniqueReasons = Array.from(new Set(leaveReasons.filter(Boolean)));
        const reasonText = uniqueReasons.length > 0 ? uniqueReasons.join('; ') : '';

        const notes = [];
        if (leaveEmployees.length > 0) {
          const withoutPermission = leaveEmployees.filter(e => {
            const reason = (e.resignReason || '').toLowerCase().trim();
            return reason === 'nghỉ không phép' || reason === 'không phép' || reason.includes('không phép');
          });
          const withPermission = leaveEmployees.filter(e => {
            const reason = (e.resignReason || '').toLowerCase().trim();
            return !(reason === 'nghỉ không phép' || reason === 'không phép' || reason.includes('không phép'));
          });

          if (withPermission.length > 0) {
            notes.push(`Có phép (${withPermission.length}): ${withPermission.map(e => `${e.fullName} (${e.resignReason || 'Nghỉ phép'})`).join(', ')}`);
          }
          if (withoutPermission.length > 0) {
            notes.push(`Không phép (${withoutPermission.length}): ${withoutPermission.map(e => e.fullName).join(', ')}`);
          }
        }
        if (newHires.length > 0) {
          notes.push(`${newHires.length} NS mới: ${newHires.map(e => e.fullName).join(', ')}`);
        }
        if (latestResigns.length > 0) {
          notes.push(`${latestResigns.length} NS nghỉ hẳn: ${latestResigns.map(e => e.fullName).join(', ')}`);
        }
        const noteText = notes.length > 0 ? notes.join(' | ') : '';

        const handleTempWorkersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (!onUpdateDayProgress) return;
          const val = parseInt(e.target.value) || 0;
          const updated = [...dayProgress];
          const idx = updated.findIndex(dp => dp.fullDate === dateStr);
          if (idx !== -1) {
            if (!updated[idx].targets[line]) {
               updated[idx].targets[line] = { in: 0, out: 0, demand: 0 };
            }
            updated[idx].targets[line].tempWorkers = val;
          } else {
            const newDay: DayProgress = {
              date: format(d, 'dd-MMM'),
              fullDate: dateStr,
              targets: {
                'DCLR': { in: 0, out: 0, demand: 0, reception: 0 },
                'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
              }
            };
            newDay.targets[line] = { in: 0, out: 0, demand: 0, tempWorkers: val };
            updated.push(newDay);
          }
          onUpdateDayProgress(updated);
        };

        rows.push(
          <tr key={`${dateStr}-${line}`} className="hover:bg-slate-50 border-b border-slate-200 transition-colors">
            <td className="py-2 px-2 text-[11px] font-bold text-slate-700 whitespace-nowrap bg-white sticky left-0 z-10 border-r border-slate-200 shadow-[1px_0_0_0_#f1f5f9]">
              {getDayFormatted(dateStr)}
            </td>
            <td className="py-2 px-2 text-[11px] font-bold text-slate-700 whitespace-nowrap text-center border-r border-slate-200">
              <span className={`px-2 py-0.5 rounded-md text-[10px] ${line === 'DCLR' ? 'bg-indigo-50 text-indigo-700' : 'bg-fuchsia-50 text-fuchsia-700'}`}>
                {line}
              </span>
            </td>
            
            <td className="py-2 px-2 text-[11px] font-bold text-slate-800 text-center border-r border-slate-200 bg-slate-50/50">
              {totalManpower > 0 ? totalManpower : '-'}
            </td>

            <td className="py-2 px-2 text-center border-r border-slate-200 bg-orange-50/50">
              <input 
                type="number"
                min="0"
                value={tempWorkers || ''}
                onChange={handleTempWorkersChange}
                placeholder="0"
                className="w-12 text-[11px] text-center border border-slate-200 rounded p-1 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 hover:border-slate-300"
              />
            </td>

            <td className="py-2 px-2 text-[11px] font-bold text-amber-600 text-center border-r border-slate-200 bg-amber-50/30">
              {totalLeave > 0 ? totalLeave : '-'}
            </td>

            <td className="py-2 px-2 text-[11px] font-bold text-emerald-600 text-center border-r border-slate-200 bg-emerald-50/30">
              {totalWorkingIncludesTemp > 0 ? totalWorkingIncludesTemp : '-'}
            </td>

            <td className="py-2 px-2 text-[11px] text-slate-600 border-r border-slate-200 whitespace-normal break-words">
              {noteText}
            </td>

            <td className="py-2 px-2 text-[11px] font-bold text-center border-r border-slate-200">
              <span className={Number(rate) >= 95 ? 'text-emerald-600' : Number(rate) >= 90 ? 'text-amber-500' : 'text-rose-500'}>
                {totalManpower > 0 ? `${rate}%` : '-'}
              </span>
            </td>

          </tr>
        );
      });
    });

    if (rows.length === 0) {
      rows.push(
        <tr key="empty">
          <td colSpan={8} className="py-8 text-center text-slate-500 text-sm">
            Không có dữ liệu báo cáo cho khoảng thời gian này
          </td>
        </tr>
      );
    }
    
    return rows;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="text-indigo-600" size={24} />
            BÁO CÁO TÌNH TRẠNG NHÂN LỰC
          </h2>
          <p className="text-sm text-slate-500 mt-1">Báo cáo chi tiết điểm danh và thống kê quân số theo từng ngày</p>
        </div>
      </div>

      <div className="bg-white border text-left border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <th className="py-2 px-2 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 shadow-[1px_0_0_0_#f1f5f9] whitespace-nowrap">Ngày - Thứ</th>
                <th className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap">Dây chuyền</th>
                <th className="py-2 px-2 text-center border-r border-slate-200">Tổng nhân lực</th>
                <th className="py-2 px-2 text-center border-r border-slate-200 text-orange-700">Thời vụ</th>
                <th className="py-2 px-2 text-center border-r border-slate-200 text-amber-700">Tổng nghỉ</th>
                <th className="py-2 px-2 text-center border-r border-slate-200 text-emerald-700">Đi làm</th>
                <th className="py-2 px-2 border-r border-slate-200 min-w-[150px] max-w-[200px]">Ghi chú</th>
                <th className="py-2 px-2 text-center p-2 break-normal max-w-[60px]">Tỉ lệ chuyên cần</th>
              </tr>
            </thead>
            <tbody>
              {renderTableRows()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
