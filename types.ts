/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EmployeeStatus = 'WORKING' | 'RESIGNED' | 'ONBOARDING' | 'LEAVE';

export type AssemblyLine = 'DCLR' | 'DC RMA BG';

export interface Employee {
  id: string;
  code: string;       // Employee Code (Mã nhân viên)
  fullName: string;   // Full Name (Họ tên)
  gender: 'Nam' | 'Nữ';
  phone: string;
  line: AssemblyLine; // Assembly line (Dây chuyền)
  manager: string;    // Quản lý tiếp nhận (Khiêm, Thịnh)
  joinDate: string;   // Onboarding date (Ngày nhận việc)
  resignDate?: string;// Resignation date (Ngày bắt đầu nghỉ / Ngày nghỉ việc)
  leaveEndDate?: string; // Tới Ngày (Ngày kết thúc nghỉ)
  resignReason?: string; // Reason for leaving (Lý do nghỉ việc)
  status: EmployeeStatus;
  notes?: string;
  
  // Custom spreadsheet fields
  department?: string;   // Phòng ban/Nhà máy
  assemblyGroup?: string; // Phòng ban/Dây chuyền (e.g. Lắp ráp)
  section?: string;      // Bộ phận/Tổ (e.g. Lắp ráp RO, Hàn)
  birthday?: string;     // Ngày sinh (e.g. DD/MM/YYYY)
  birthplace?: string;   // Nơi sinh
  contract1Legal?: string; // Quá trình HD thứ 1 - Pháp nhân
  contract1Start?: string; // Quá trình HD thứ 1 - Ngày bắt đầu
  contract1End?: string;   // Quá trình HD thứ 1 - Ngày kết thúc
  contractCode?: string;   // Mã HĐ
  contractType2?: string;  // Loại HĐ 2
  contract2Legal?: string; // Quá trình HD thứ 2 - Pháp nhân
  contract2Start?: string; // Quá trình HD thứ 2 - Ngày bắt đầu
  contract2End?: string;   // Quá trình HD thứ 2 - Ngày kết thúc
  avatar?: string;         // Base64 profile picture string for ID cards
}

export interface DailyTargets {
  in: number;
  out: number;
  demand?: number;    // Nhu cầu tuyển dụng theo ngày
  reception?: number; // Kế hoạch tiếp nhận nhân sự theo ngày
  actualIn?: number;  // Thực tế nhận việc (nhập tay/thực tế)
  actualOut?: number; // Thực tế nghỉ việc (nhập tay/nghỉ việc)
  tempWorkers?: number; // Nhân sự thời vụ
}

export interface DayProgress {
  date: string;       // e.g., "15-Jun"
  fullDate: string;   // e.g., "2026-06-15"
  targets: Record<AssemblyLine, DailyTargets>;
}
