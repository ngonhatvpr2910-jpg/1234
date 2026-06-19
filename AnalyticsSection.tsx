import { Employee, AssemblyLine } from './types';
import { Award, Target, HelpCircle, Activity, TrendingUp, TrendingDown, Users, AlertTriangle } from 'lucide-react';
import { RESIGNATION_REASONS } from './mockData';

interface AnalyticsSectionProps {
  employees: Employee[];
  selectedLine: AssemblyLine | 'ALL';
}

export default function AnalyticsSection({ employees, selectedLine }: AnalyticsSectionProps) {
  // Filters
  const filteredList = employees.filter(emp => selectedLine === 'ALL' || emp.line === selectedLine);
  
  // Resigned list
  const resignedList = filteredList.filter(emp => emp.status === 'RESIGNED');
  const activeList = filteredList.filter(emp => emp.status === 'WORKING');
  const onboardingList = filteredList.filter(emp => emp.status === 'ONBOARDING');
  
  // Recalculate reasons
  const reasonCounts: Record<string, number> = {};
  RESIGNATION_REASONS.forEach(r => {
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

  const sortedReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .concat(otherReasonsCount > 0 ? [{ reason: 'Lý do cá nhân khác viết tay', count: otherReasonsCount }] : [])
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="analytics-section">
      
      {/* COLUMN 1: REASONS FOR LEAVING (Answers user's prompt directly on why they resign!) */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle size={17} className="text-rose-500" /> Phân Tích Nguyên Nhân Thôi Việc
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Xếp hạng lý do nghỉ việc chính thức của nhân viên tại chuyền</p>
            </div>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              {resignedList.length} lượt thôi việc
            </span>
          </div>

          {sortedReasons.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Chưa ghi nhận ca thôi việc nào tương ứng với bộ lọc.
            </div>
          ) : (
            <div className="space-y-4 my-2">
              {sortedReasons.map((item, idx) => {
                const percentOfReason = Math.round((item.count / resignedList.length) * 100);
                const barWidthPercent = Math.round((item.count / maxReasonCount) * 100);
                
                return (
                  <div key={`reason-${idx}`} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 max-w-sm truncate" title={item.reason}>
                        {idx + 1}. {item.reason}
                      </span>
                      <span className="text-slate-500 font-bold whitespace-nowrap">
                        {item.count} NS <span className="text-rose-600">({percentOfReason}%)</span>
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-rose-600' : idx === 1 ? 'bg-rose-500' : 'bg-rose-450 bg-amber-450 border-r bg-rose-400'}`}
                        style={{ width: `${barWidthPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Suggestion note card */}
        <div className="mt-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
          <span className="text-base">💡</span>
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">Lời khuyên đề xuất Giữ chân lao động:</span>
            <p className="leading-relaxed font-medium text-slate-600">
              {sortedReasons.length > 0 && sortedReasons[0].reason.includes('Lương') && 'Phản hồi cao nhất liên quan đến Thu Nhập. Quản lý cần đề xuất cải tiến tăng phụ cấp chuyên cần và thâm niên cho lao động DCLR.'}
              {sortedReasons.length > 0 && sortedReasons[0].reason.includes('áp lực') && 'Áp lực công việc chiếm tỉ lệ lớn. Cần cân đối lại định hướng và gia tăng nghỉ giải lao ngắn khoảng 5 phút giữa ca để tổ trưởng tương tác điều độ.'}
              {sortedReasons.length === 0 && 'Chưa phát sinh biến động nghỉ việc đột biến. Hãy tiếp tục duy trì chế độ hỏi thăm, động viên đầu ca làm việc của các Tổ trưởng.'}
              {sortedReasons.length > 0 && !sortedReasons[0].reason.includes('Lương') && !sortedReasons[0].reason.includes('áp lực') && 'Hãy chú trọng đào tạo hội nhập ban đầu để tránh hao hụt lao động mới trong 30 ngày tập sự.'}
            </p>
          </div>
        </div>
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
                    {employees.filter(e => e.line === 'DCLR' && e.status === 'WORKING').length} <span className="text-xs font-semibold text-slate-500">NS</span>
                  </span>
                </div>
                <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                  <span className="text-[10px] uppercase font-bold text-teal-600 block mb-0.5">DC RMA BG</span>
                  <span className="text-xl font-extrabold text-teal-800">
                    {employees.filter(e => e.line === 'DC RMA BG' && e.status === 'WORKING').length} <span className="text-xs font-semibold text-slate-500">NS</span>
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
  );
}
