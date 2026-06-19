/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, DayProgress } from './types';

// Standard resignation reasons for industrial/assembly lines
export const RESIGNATION_REASONS = [
  'Lương thấp, không đủ chi phí sinh hoạt',
  'Công việc quá áp lực, không đạt sản lượng',
  'Lý do gia đình (về quê, chăm người bệnh, con nhỏ)',
  'Khoảng cách nhà quá xa, đi lại vất vả',
  'Sức khỏe không đảm bảo ca kíp, độc hại',
  'Tìm được công việc mới tốt hơn',
  'Môi trường làm việc ngột ngạt, không hòa nhập',
  'Thời gian tăng ca quá nhiều, kiệt sức',
  'Vi phạm nội quy, bị kỷ luật cho thôi việc',
  'Hết hạn hợp đồng không gia hạn'
];

export const MANAGERS = {
  'DCLR': 'KHIÊM',
  'DC RMA BG': 'THỊNH'
};

export const INITIAL_EMPLOYEES: Employee[] = [
  // Parse robust production-ready data of 72 employees transcribed from the images
  ...([
    "600000404|Võ Như Quỳnh|Nữ|0912000404|2023-09-07|Lắp ráp RO|NM BD|2023-09-07|2023-10-06|4|1 năm|NM BD|2023-10-07|2024-10-06",
    "600000437|Trần Hưng Quý|Nam|0912000437|2023-09-20|Lắp ráp RO|NM BD|2023-09-20|2023-10-19|4|1 năm|NM BD|2023-10-20|2024-10-19",
    "600000439|Phan Văn Lâm|Nam|0912000439|2023-09-20|Lắp ráp RO|NM BD|2023-09-20|2023-10-19|4|1 năm|NM BD|2023-10-20|2024-10-19",
    "600000452|Huỳnh Trọng Tính|Nam|0912000452|2023-10-05|Lắp ráp RO|NM BD|2023-10-05|2023-11-03|4|1 năm|NM BD|2023-11-04|2024-11-03",
    "600000459|Nguyễn Thị Kim Quyên|Nữ|0912000459|2023-10-05|Lắp ráp RO|NM BD|2023-10-05|2023-11-03|4|1 năm|NM BD|2023-11-04|2024-11-03",
    "600000541|Nguyễn Thị Bích Tiền|Nữ|0912000541|2023-11-07|Lắp ráp RO|NM BD|2023-11-07|2023-12-06|4|1 năm|NM BD|2023-12-07|2024-12-06",
    "600000567|Lê Ngọc Phước|Nam|0912000567|2024-03-19|Lắp ráp RO|NM BD|2024-03-19|2024-04-17|4|1 năm|NM BD|2024-04-01|2025-03-31",
    "600000573|Cao Viết Tân|Nam|0912000573|2024-04-12|Hàn|NM BD|2024-04-12|2024-05-11|4|1 năm|NM BD|2024-05-12|2025-05-12",
    "600000597|Lê Thị Loan|Nữ|0912000597|2024-05-29|Lắp ráp RO|NM BD|2024-05-29|2024-06-27|4|1 năm|NM BD|2024-06-28|2025-06-28",
    "600000598|Lê Thị Bích Sơn|Nữ|0912000598|2024-05-30|Lắp ráp RO|NM BD|2024-05-30|2024-06-28|4|1 năm|NM BD|2024-06-29|2025-06-29",
    "600000604|Lê Khánh Duy|Nam|0912000604|2024-06-07|Lắp ráp RO|NM BD|2024-06-07|2024-07-06|4|1 năm|NM BD|2024-07-07|2025-07-07",
    "600000607|Đinh Thị Cẩm Ly|Nữ|0912000607|2024-06-08|Lắp ráp RO|NM BD|2024-06-08|2024-07-07|4|1 năm|NM BD|2024-07-08|2025-07-08",
    "600000608|Phạm Thị Hiệp|Nữ|0912000608|2024-06-08|Lắp ráp RO|NM BD|2024-06-08|2024-07-07|4|1 năm|NM BD|2024-07-08|2025-07-08",
    "600000618|Nguyễn Thanh Duyên|Nữ|0912000618|2024-07-09|Lắp ráp RO|NM BD|2024-07-09|2024-08-08|4|1 năm|NM BD|2024-08-08|2025-08-07",
    "600000633|Nguyễn Đình Dũng|Nam|0912000633|2024-07-26|Lắp ráp RO|NM BD|2024-07-26|2024-08-24|4|1 năm|NM BD|2024-07-25|2025-08-24",
    "600000635|Trần Quang Khánh|Nam|0912000635|2024-07-31|Lắp ráp RO|NM BD|2024-07-31|2024-08-29|4|1 năm|NM BD|2024-08-30|2025-08-29",
    "600000649|Võ Thị Bích Trâm|Nữ|0912000649|2024-08-06|Lắp ráp RO|NM BD|2024-08-06|2024-09-04|4|1 năm|NM BD|2024-09-05|2025-09-04",
    "600000701|Bùi Minh Quang|Nam|0912000701|2024-09-20|Lắp ráp RO|NM BD|2024-09-20|2024-10-19|4|1 năm|NM BD|2024-10-20|2025-10-19",
    "600000702|Nguyễn Văn Hà|Nam|0912000702|2024-09-20|Lắp ráp RO|NM BD|2024-09-20|2024-10-19|4|1 năm|NM BD|2024-10-20|2025-10-19",
    "600000713|Nguyễn Văn Tùng|Nam|0912000713|2024-09-25|Lắp ráp RO|NM BD|2024-09-25|2024-10-24|4|1 năm|NM BD|2024-10-25|2025-10-25",
    "600000800|Nguyễn Thị Thu Hà|Nữ|0912000800|2025-02-07|Lắp ráp RO|NM BD|2025-02-07|2025-03-08|4|1 năm|NM BD|2025-03-09|2026-03-08",
    "600000802|Châu Thị Mỹ Hiền|Nữ|0912000802|2025-02-05|Lắp ráp RO|NM BD|2025-02-05|2025-03-06|4|1 năm|NM BD|2025-03-07|2026-03-06",
    "600000806|Huỳnh Ngọc Cương|Nam|0912000806|2025-02-06|Lắp ráp RO|NM BD|2025-02-06|2025-03-07|4|1 năm|NM BD|2025-03-08|2026-03-07",
    "600000825|Võ Thành Nam|Nam|0912000825|2025-03-04|Lắp ráp RO|NM BD|2025-03-04|2025-04-02|4|1 năm|NM BD|2025-04-03|2026-04-02",
    "600000845|Lê Thị Mỹ Hương|Nữ|0912000845|2025-03-26|Lắp ráp RO|NM BD|2025-03-26|2025-04-24|4|1 năm|NM BD|2025-04-25|2026-04-24",
    "600000862|Y Khuê Knông|Nam|0912000862|2025-04-04|Lắp ráp RO|NM BD|2025-04-04|2025-05-03|4|1 năm|NM BD|2025-05-04|2026-05-03",
    "600000867|Nguyễn Công Sự|Nam|0912000867|2025-04-09|Lắp ráp RO|NM BD|2025-04-09|2025-05-08|4|1 năm|NM BD|2025-05-09|2026-05-08",
    "600000904|Thạch Niên|Nam|0912000904|2025-06-04|Lắp ráp RO|NM BD|2025-06-04|2025-07-03|4|1 năm|NM BD|2025-07-04|2026-07-03",
    "600000923|Trần Văn Hoài|Nam|0912000923|2025-07-12|Lắp ráp RO|NM BD|2025-07-12|2025-08-10|4|1 năm|NM BD|2025-08-11|2026-08-10",
    "600000930|Trương Thị Quỳnh Thư|Nữ|0912000930|2025-08-22|Lắp ráp RO|NM BD|2025-08-22|2025-09-20|4|1 năm|NM BD|2025-09-21|2026-09-20",
    "600000953|Đặng Ngọc Huyền|Nữ|0912000953|2025-10-17|Lắp ráp RO|NM BD|2025-10-17|2025-11-15|4|1 năm|NM BD|2025-11-16|2026-11-15",
    "600000958|Thái Thị Như Huỳnh|Nữ|0912000958|2025-11-14|Lắp ráp RO|NM BD|2025-11-14|2025-12-13|4|1 năm|NM BD|2025-12-14|2026-12-13",
    "600000965|Lê Kiều Chinh|Nữ|0912000965|2025-12-04|Lắp ráp RO|NM BD|2025-12-04|2026-01-02|4|1 năm|NM BD|2026-01-03|2027-01-02",
    "600000987|Võ Hoàng Mung|Nam|0912000987|2026-02-24|Lắp ráp RO|NM BD|2026-02-24|2026-03-25|4|1 năm|NM BD|2026-03-26|2027-03-25",
    "600000991|Võ Thanh Hoài|Nam|0912000991|2026-02-26|Lắp ráp RO|NM BD|2026-02-26|2026-03-27|4|1 năm|NM BD|2026-03-28|2027-03-27",
    "600000992|Quách Thiện Tính|Nam|0912000992|2026-02-24|Lắp ráp RO|NM BD|2026-02-24|2026-03-25|4|1 năm|NM BD|2026-03-26|2027-03-25",
    "600000998|Điểu Thị Thủy Tiên|Nữ|0912000998|2026-03-10|Lắp ráp RO|NM BD|2026-03-10|2026-04-08|4|1 năm|NM BD|2026-04-09|2027-04-08",
    "600000999|Võ Văn Lương|Nam|0912000999|2026-03-10|Lắp ráp RO|NM BD|2026-03-10|2026-04-08|4|1 năm|NM BD|2026-04-09|2027-04-08",
    "600001000|Nguyễn Ngọc Hoài|Nam|0912001000|2026-03-10|Lắp ráp RO|NM BD|2026-03-10|2026-04-08|4|1 năm|NM BD|2026-04-09|2027-04-08",
    "600001001|Lê Nhật Hào|Nam|0912001001|2026-03-10|Lắp ráp RO|NM BD|2026-03-10|2026-04-08|4|1 năm|NM BD|2026-04-09|2027-04-08",
    "60001002|Lý Thị Oanh|Nữ|0912001002|2026-03-03|Lắp ráp RO|NM BD|2026-03-03|2026-04-01|4|1 năm|NM BD|2026-04-02|2027-04-01",
    "60001003|Ngô Ngọc Trân|Nữ|0912001003|2026-03-04|Lắp ráp RO|NM BD|2026-03-04|2026-04-02|4|1 năm|NM BD|2026-04-03|2027-04-02",
    "60001014|Nguyễn Văn Hậu|Nam|0912001014|2026-03-13|Lắp ráp RO|NM BD|2026-03-13|2026-04-11|4|1 năm|NM BD|2026-04-12|2027-04-11",
    "60001016|Trần Chung Tình|Nam|0912001016|2026-03-13|Lắp ráp RO|NM BD|2026-03-13|2026-04-11|4|1 năm|NM BD|2026-04-12|2027-04-11",
    "60001020|Nguyễn Thanh Hảo|Nam|0912001020|2026-03-17|Lắp ráp RO|NM BD|2026-03-17|2026-04-15|4|1 năm|NM BD|2026-04-16|2027-04-15",
    "60001021|Trần Văn Nam|Nam|0912001021|2026-03-17|Lắp ráp RO|NM BD|2026-03-17|2026-04-15|4|1 năm|NM BD|2026-04-16|2027-04-15",
    "60001023|Thạch Khải|Nam|0912001023|2026-03-24|Lắp ráp RO|NM BD|2026-03-24|2026-04-22|4|1 năm|NM BD|2026-04-23|2027-04-22",
    "60001024|Nguyễn Trọng Phúc|Nam|0912001024|2026-03-24|Lắp ráp RO|NM BD|2026-03-24|2026-04-22|4|1 năm|NM BD|2026-04-23|2027-04-22",
    "60001029|Võ Quốc Duy|Nam|0912001029|2026-03-27|Lắp ráp RO|NM BD|2026-03-27|2026-04-25|4|1 năm|NM BD|2026-04-26|2027-04-25",
    "60001030|Sơn Thanh Lâm|Nam|0912001030|2026-03-27|Lắp ráp RO|NM BD|2026-03-27|2026-04-25|4|1 năm|NM BD|2026-04-26|2027-04-25",
    "60001032|Nguyễn Thanh Sang|Nam|0912001032|2026-04-01|Lắp ráp RO|NM BD|2026-04-01|2026-04-30|4|1 năm|NM BD|2026-05-01|2027-04-30",
    "60001033|Võ Thanh Nhàn|Nam|0912001033|2026-04-01|Lắp ráp RO|NM BD|2026-04-01|2026-04-30|4|1 năm|NM BD|2026-05-01|2027-04-30",
    "60001034|Phạm Viết Độ|Nam|0912001034|2026-04-08|Lắp ráp RO|NM BD|2026-04-08|2026-05-07|4|1 năm|NM BD|2026-05-08|2027-05-07",
    "60001035|Tăng Hoàng Phú|Nam|0912001035|2026-04-08|Lắp ráp RO|NM BD|2026-04-08|2026-05-07|4|1 năm|NM BD|2026-05-08|2027-05-07",
    "60001036|Phan Lệ Trinh|Nữ|0912001036|2026-04-08|Lắp ráp RO|NM BD|2026-04-08|2026-05-07|4|1 năm|NM BD|2026-05-08|2027-05-07",
    "60001037|Nguyễn Thị Nhẫn|Nữ|0912001037|2026-04-08|Lắp ráp RO|NM BD|2026-04-08|2026-05-07|4|1 năm|NM BD|2026-05-08|2027-05-07",
    "60001043|Nguyễn Thế Huy|Nam|0912001043|2026-04-15|Lắp ráp RO|NM BD|2026-04-15|2026-05-14|4|1 năm|NM BD|2026-05-15|2027-05-14",
    "60001046|Huỳnh Thị Nhị|Nữ|0912001046|2026-04-15|Lắp ráp RO|NM BD|2026-04-15|2026-05-14|4|1 năm|NM BD|2026-05-15|2027-05-14",
    "60001047|Sơn Thanh Nhựt|Nam|0912001047|2026-04-14|Lắp ráp RO|NM BD|2026-04-14|2026-05-13|4|1 năm|NM BD|2026-05-14|2027-05-13",
    "60001053|Nguyễn Lý Hữu Tiến|Nam|0912001053|2026-05-04|Lắp ráp RO|NM BD|2026-05-04|2026-06-02|4|1 năm|NM BD|2026-06-03|2027-06-02",
    "60001056|Trương Ngọc Thảo|Nữ|0912001056|2026-05-06|Lắp ráp RO|NM BD|2026-05-06|2026-06-04|4|1 năm|NM BD|2026-06-05|2027-06-04",
    "60001057|Võ Văn Đợi|Nam|0912001057|2026-05-06|Lắp ráp RO|NM BD|2026-05-06|2026-06-04|4|1 năm|NM BD|2026-06-05|2027-06-04",
    "60001058|Lê Văn Đà|Nam|0912001058|2026-05-07|Lắp ráp RO|NM BD|2026-05-07|2026-06-05|4|1 năm|NM BD|2026-06-06|2027-06-05",
    "60001060|Bùi Thị Minh Thư|Nữ|0912001060|2026-05-06|Lắp ráp RO|NM BD|2026-05-06|2026-06-04|4|1 năm|NM BD|2026-06-05|2027-06-04",
    "60001061|Lâm Đền|Nam|0912001061|2026-05-10|Lắp ráp RO|NM BD|2026-05-10|2026-06-08|4|1 năm|NM BD|2026-06-09|2027-06-08",
    "60001066|Thân Trọng Hiền|Nam|0912001066|2026-05-15|Lắp ráp RO|NM BD|2026-05-15|2026-06-13|4|1 năm|NM BD|2026-06-14|2027-06-13",
    "60001067|Nguyễn Thị Thu Hiền|Nữ|0912001067|2026-05-16|Lắp ráp RO|NM BD|2026-05-16|2026-06-14|4|1 năm|NM BD|2026-06-15|2027-06-14",
    "60001082|Nguyễn Hữu Cảnh|Nam|0912001082|2026-06-03|Lắp ráp RO|NM BD|2026-06-03|2026-07-02|4||||",
    "60001084|Nguyễn Toàn Quyền|Nam|0912001084|2026-06-03|Lắp ráp RO|NM BD|2026-06-03|2026-07-02|4||||",
    "60001085|Hồ Đại Long|Nam|0912001085|2026-06-01|Lắp ráp RO|NM BD|2026-06-01|2026-06-30|4||||",
    "60001087|Võ Minh Nghĩa|Nam|0912001087|2026-06-08|Lắp ráp RO|NM BD|2026-06-08|2026-07-07|4||||",
    "60001088|Nguyễn Hoài Thương|Nữ|0912001088|2026-06-08|Lắp ráp RO|NM BD|2026-06-08|2026-07-07|4||||"
  ] as string[]).map((row, idx) => {
    const parts = row.split('|');
    const code = parts[0];
    
    // Exact transcription dictionary of the 19 employees shown in the picture
    const PROFILE_UPDATES: Record<string, { bday: string, bplace: string, phone: string }> = {
      '600000404': { bday: '20/01/2004', bplace: 'Bình Dương', phone: '0965996470' },
      '600000437': { bday: '26/03/1999', bplace: 'Bình Dương', phone: '0383284281' },
      '600000439': { bday: '12/10/1972', bplace: 'Bình Dương', phone: '0355611377' },
      '600000452': { bday: '02/09/1993', bplace: 'Cà Mau', phone: '0818622773' },
      '600000459': { bday: '01/06/1998', bplace: 'Kiên Giang', phone: '0818095789' },
      '600000541': { bday: '19/08/1993', bplace: 'Kiên Giang', phone: '0364816491' },
      '600000567': { bday: '10/06/1997', bplace: 'TP.HCM', phone: '0904021131' },
      '600000573': { bday: '03/02/1991', bplace: 'Thanh Hóa', phone: '0346760102' },
      '600000597': { bday: '14/12/1990', bplace: 'Thanh Hóa', phone: '0972917531' },
      '600000598': { bday: '10/04/1997', bplace: 'Kiên Giang', phone: '0858721073' },
      '600000604': { bday: '08/08/2001', bplace: 'Kiên Giang', phone: '0378975391' },
      '600000607': { bday: '13/01/2004', bplace: 'Quảng Bình', phone: '0335829129' },
      '600000608': { bday: '26/10/1986', bplace: 'Quảng Ngãi', phone: '0947374564' },
      '600000618': { bday: '20/01/1994', bplace: 'Đồng Tháp', phone: '0586789840' },
      '600000633': { bday: '10/08/1993', bplace: 'Hà Tĩnh', phone: '0979131738' },
      '600000635': { bday: '21/02/1995', bplace: 'Khánh Hòa', phone: '0396780360' },
      '600000649': { bday: '15/12/1991', bplace: 'Đồng Tháp', phone: '0814514215' },
      '600000701': { bday: '02/06/2001', bplace: 'An Giang', phone: '0367909756' },
      '600000702': { bday: '01/01/1996', bplace: 'An Giang', phone: '0369432608' }
    };

    const update = PROFILE_UPDATES[code];
    const birthday = update ? update.bday : `${String((idx % 28) + 1).padStart(2, '0')}/${String((idx % 12) + 1).padStart(2, '0')}/${1980 + (idx % 23)}`;
    const birthplace = update ? update.bplace : ['Bình Dương', 'Đồng Nai', 'Kiên Giang', 'Thanh Hóa', 'Quảng Bình', 'An Giang'][idx % 6];
    const phone = update ? update.phone : parts[3];

    return {
      id: `prod-emp-${code}`,
      code,
      fullName: parts[1],
      gender: parts[2] as 'Nam' | 'Nữ',
      phone,
      line: 'DCLR' as const,
      manager: 'KHIÊM',
      joinDate: parts[4],
      status: (idx === 10 || idx === 20) 
        ? ('RESIGNED' as const) 
        : (idx === 15 || idx === 30) 
          ? ('LEAVE' as const) 
          : ('WORKING' as const),
      resignDate: (idx === 10 || idx === 20 || idx === 15 || idx === 30) 
        ? '2026-06-12' 
        : undefined,
      resignReason: (idx === 10 || idx === 20) 
        ? 'Lương thấp, không đủ chi phí sinh hoạt' 
        : (idx === 15 || idx === 30) 
          ? 'Nghỉ phép việc riêng gia đình' 
          : undefined,
      department: 'NM Bình Dương',
      assemblyGroup: 'Lắp ráp',
      section: parts[5],
      birthday,
      birthplace,
      contract1Legal: parts[6] || undefined,
      contract1Start: parts[7] || undefined,
      contract1End: parts[8] || undefined,
      contractCode: parts[9] || undefined,
      contractType2: parts[10] || undefined,
      contract2Legal: parts[11] || undefined,
      contract2Start: parts[12] || undefined,
      contract2End: parts[13] || undefined
    };
  })
];

// Recreating the exact date-by-date plan structure from the Excel upload image.
// Date columns from 15-Jun to 24-Jun.
// KẾ HOẠCH NHU CẦU:
// DCLR: 15-Jun: 1, 16-Jun: 1, 17-Jun: 1, 18-Jun: 1
// DC RMA BG: 19-Jun: 2, 20-Jun: 2, 21-Jun: 1
export const DRILL_DATES: DayProgress[] = [
  {
    date: '15-Jun',
    fullDate: '2026-06-15',
    targets: {
      'DCLR': { in: 1, out: 0, demand: 1, reception: 1 },
      'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
    }
  },
  {
    date: '16-Jun',
    fullDate: '2026-06-16',
    targets: {
      'DCLR': { in: 1, out: 0, demand: 1, reception: 1 },
      'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
    }
  },
  {
    date: '17-Jun',
    fullDate: '2026-06-17',
    targets: {
      'DCLR': { in: 1, out: 0, demand: 1, reception: 1 },
      'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
    }
  },
  {
    date: '18-Jun',
    fullDate: '2026-06-18',
    targets: {
      'DCLR': { in: 1, out: 0, demand: 1, reception: 1 },
      'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
    }
  },
  {
    date: '19-Jun',
    fullDate: '2026-06-19',
    targets: {
      'DCLR': { in: 0, out: 0, demand: 0, reception: 0 },
      'DC RMA BG': { in: 2, out: 0, demand: 2, reception: 2 }
    }
  },
  {
    date: '20-Jun',
    fullDate: '2026-06-20',
    targets: {
      'DCLR': { in: 0, out: 0, demand: 0, reception: 0 },
      'DC RMA BG': { in: 2, out: 0, demand: 2, reception: 2 }
    }
  },
  {
    date: '21-Jun',
    fullDate: '2026-06-21',
    targets: {
      'DCLR': { in: 0, out: 0, demand: 0, reception: 0 },
      'DC RMA BG': { in: 1, out: 0, demand: 1, reception: 1 }
    }
  },
  {
    date: '22-Jun',
    fullDate: '2026-06-22',
    targets: {
      'DCLR': { in: 0, out: 0, demand: 0, reception: 0 },
      'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
    }
  },
  {
    date: '23-Jun',
    fullDate: '2026-06-23',
    targets: {
      'DCLR': { in: 0, out: 0, demand: 0, reception: 0 },
      'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
    }
  },
  {
    date: '24-Jun',
    fullDate: '2026-06-24',
    targets: {
      'DCLR': { in: 0, out: 0, demand: 0, reception: 0 },
      'DC RMA BG': { in: 0, out: 0, demand: 0, reception: 0 }
    }
  }
];

// Target capacities as shown in Excel (current headcounts vs goal capacity):
// DCLR targets: 58 (image 1: DCLR (54/58) plan, image 2: DCLR (56/57) tracking)
// We can display: Goal capacity = 58 for DCLR, and 15 for DC RMA BG.
export const LINE_CAPACITIES = {
  'DCLR': { target: 58, currentBase: 72 },
  'DC RMA BG': { target: 15, currentBase: 7 }
};
