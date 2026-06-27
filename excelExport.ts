import * as XLSX from 'xlsx';
import { DowntimeReport } from './types';
import { calculateDowntimeCost } from './timeHelpers';

/**
 * Xuất danh sách báo cáo dừng Line ra file Excel chuyên nghiệp
 * @param reports Danh sách báo cáo cần xuất
 * @param filtersDescription Chuỗi mô tả điều kiện lọc hiện tại để ghi vào báo cáo
 */
export function exportDowntimeReportsToExcel(reports: DowntimeReport[], filtersDescription: string) {
  // 1. Chuẩn bị dữ liệu thô dạng bảng phẳng
  const rawData = reports.map((r, index) => ({
    'STT': index + 1,
    'Ngày báo cáo': r.date,
    'Ca làm việc': r.shift,
    'Line sản xuất': r.line,
    'Thiết bị/Công đoạn': r.equipment,
    'Sản phẩm đang sản xuất': r.productName || 'N/A',
    'Đơn giá sản phẩm (VNĐ)': r.productUnitPrice || 0,
    'Năng suất định mức (Sp/giờ)': r.standardRate || 0,
    'Giờ bắt đầu': r.startTime,
    'Giờ kết thúc': r.endTime || 'Chưa khắc phục',
    'Thời gian dừng (phút)': r.duration,
    'Chi phí dừng Line (VNĐ)': r.status === 'Đang xử lý' ? 0 : calculateDowntimeCost(r.duration),
    'Tổn thất Doanh thu (VNĐ)': r.status === 'Đang xử lý' ? 0 : Math.round((r.duration / 60) * (r.standardRate || 0) * (r.productUnitPrice || 0)),
    'Nhóm nguyên nhân': r.reasonCategory,
    'Chi tiết sự cố': r.details,
    'Biện pháp khắc phục': r.solution || 'Đang xử lý',
    'Người báo cáo/PIC': r.pic,
    'Trạng thái': r.status,
  }));

  // 2. Tạo workbook và worksheet trống
  const wb = XLSX.utils.book_new();
  
  // 3. Tạo tiêu đề và thông tin chung trước bảng dữ liệu chính
  const titleRows = [
    ['CÔNG TY CỔ PHẦN TẬP ĐOÀN SUNHOUSE'],
    ['BÁO CÁO THỜI GIAN DỪNG LINE SẢN XUẤT (LINE DOWNTIME REPORT)'],
    [`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`],
    [`Điều kiện lọc: ${filtersDescription}`],
    [], // Dòng trống cách biệt
  ];

  // 4. Tạo worksheet từ mảng tiêu đề trước
  const ws = XLSX.utils.aoa_to_sheet(titleRows);

  // 5. Thêm bảng dữ liệu chính tiếp nối vào dòng thứ 6 (index 5)
  XLSX.utils.sheet_add_json(ws, rawData, {
    origin: 'A6',
    skipHeader: false,
  });

  // 6. Tính toán các thông số tổng hợp để thêm vào cuối bảng
  const totalDowntime = reports.reduce((sum, r) => sum + r.duration, 0);
  const totalIncidents = reports.length;
  const avgDuration = totalIncidents > 0 ? Math.round(totalDowntime / totalIncidents) : 0;
  const activeIncidents = reports.filter(r => r.status === 'Đang xử lý').length;
  const totalCost = reports.reduce((sum, r) => sum + (r.status === 'Đang xử lý' ? 0 : calculateDowntimeCost(r.duration)), 0);
  const totalRevenueLoss = reports.reduce((sum, r) => sum + (r.status === 'Đang xử lý' ? 0 : Math.round((r.duration / 60) * (r.standardRate || 0) * (r.productUnitPrice || 0))), 0);

  const startSummaryRow = 6 + rawData.length + 2; // Cách bảng chính 2 dòng
  
  const summaryRows = [
    [],
    ['TỔNG HỢP THỐNG KÊ (SUMMARY REPORT)'],
    ['Tổng số vụ dừng Line:', totalIncidents, 'vụ'],
    ['Tổng thời gian dừng Line:', totalDowntime, 'phút'],
    ['Tổng chi phí dừng Line ước tính:', totalCost, 'VNĐ'],
    ['Tổng tổn thất doanh thu ước tính:', totalRevenueLoss, 'VNĐ'],
    ['Thời gian dừng trung bình (MTTR):', avgDuration, 'phút/vụ'],
    ['Sự cố chưa khắc phục (Đang xử lý):', activeIncidents, 'vụ'],
  ];

  XLSX.utils.sheet_add_aoa(ws, summaryRows, {
    origin: `A${startSummaryRow}`,
  });

  // 7. Cấu hình độ rộng các cột (Column Widths) tự động dựa trên nội dung
  const colWidths = [
    { wch: 6 },   // STT
    { wch: 15 },  // Ngày báo cáo
    { wch: 12 },  // Ca làm việc
    { wch: 20 },  // Line sản xuất
    { wch: 25 },  // Thiết bị/Công đoạn
    { wch: 35 },  // Sản phẩm đang sản xuất
    { wch: 22 },  // Đơn giá sản phẩm (VNĐ)
    { wch: 25 },  // Năng suất định mức (Sp/giờ)
    { wch: 12 },  // Giờ bắt đầu
    { wch: 15 },  // Giờ kết thúc
    { wch: 22 },  // Thời gian dừng (phút)
    { wch: 25 },  // Chi phí dừng Line (VNĐ)
    { wch: 25 },  // Tổn thất Doanh thu (VNĐ)
    { wch: 25 },  // Nhóm nguyên nhân
    { wch: 45 },  // Chi tiết sự cố
    { wch: 45 },  // Biện pháp khắc phục
    { wch: 25 },  // Người báo cáo/PIC
    { wch: 15 },  // Trạng thái
  ];
  ws['!cols'] = colWidths;

  // 8. Đính worksheet vào workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo Dừng Line');

  // 9. Xuất file và tải xuống trực tiếp ở trình duyệt
  const fileName = `Bao_cao_dung_line_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
