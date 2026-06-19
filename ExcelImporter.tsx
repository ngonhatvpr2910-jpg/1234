import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Employee, AssemblyLine, EmployeeStatus } from './types';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Save, 
  Info,
  Check,
  AlertTriangle,
  Settings
} from 'lucide-react';

interface ExcelImporterProps {
  onImport: (newEmployees: Employee[]) => void;
  onClose: () => void;
  existingEmployees: Employee[];
}

// Map logical schema property to human-friendly description
const SCHEMA_FIELDS = [
  { key: 'code', label: 'Mã NV', required: true, keywords: ['mã nhân viên', 'mã nv', 'manv', 'employee code', 'code'] },
  { key: 'fullName', label: 'Họ và tên', required: true, keywords: ['họ và tên', 'họ tên', 'hoten', 'full name', 'name', 'employee name'] },
  { key: 'gender', label: 'Giới tính/Phái', required: false, keywords: ['giới tính', 'phái', 'gender', 'sex', 'nam/nữ'] },
  { key: 'phone', label: 'Số điện thoại', required: false, keywords: ['số điện thoại', 'sđt', 'phone', 'điện thoại', 'telephone'] },
  { key: 'birthday', label: 'Ngày sinh', required: false, keywords: ['ngày sinh', 'ngày tháng năm sinh', 'năm sinh', 'bday', 'birthday', 'ngày tháng năm'] },
  { key: 'birthplace', label: 'Nơi sinh', required: false, keywords: ['nơi sinh', 'birthplace', 'quê quán', 'tỉnh thành'] },
  { key: 'department', label: 'Nhà máy/Phòng ban', required: false, keywords: ['phòng ban', 'nhà máy', 'phòng ban/nhà máy', 'bộ phận', 'department', 'factory'] },
  { key: 'assemblyGroup', label: 'Phòng ban/Dây chuyền', required: false, keywords: ['dây chuyền', 'chuyền', 'phòng ban/dây chuyền', 'assembly group', 'line_group'] },
  { key: 'section', label: 'Bộ phận/Tổ', required: false, keywords: ['bộ phận/tổ', 'tổ', 'section', 'group', 'lắp ráp ro'] },
  { key: 'joinDate', label: 'Ngày nhận việc', required: false, keywords: ['ngày nhận việc', 'ngày vào', 'ngày tuyển', 'join date', 'hire date'] },
];

interface ColumnMapping {
  fieldKey: string;
  colIndex: number; // -1 means not mapped
  colName: string;
}

interface ParsedRow {
  index: number;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export default function ExcelImporter({ onImport, onClose, existingEmployees }: ExcelImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawSheetData, setRawSheetData] = useState<any[][] | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  
  // Settings
  const [overwriteStrategy, setOverwriteStrategy] = useState<'OVERWRITE' | 'SKIP'>('OVERWRITE');
  const [defaultLine, setDefaultLine] = useState<AssemblyLine>('DCLR');
  const [defaultManager, setDefaultManager] = useState<string>('KHIÊM');
  const [defaultStatus, setDefaultStatus] = useState<EmployeeStatus>('WORKING');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Excel Helper functions
  const formatDateISO = (val: any): string => {
    if (!val) return '';
    
    // Check for Excel Date Serial Number (number of days since 1899-12-30)
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Try handling Date Object directly
    if (val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Try handling string representation
    const str = String(val).trim();
    if (!str) return '';
    
    // Handles formats like DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or DD.MM.YYYY
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

    // Handles format like YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const partsISOLike = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (partsISOLike) {
      const year = partsISOLike[1];
      const month = partsISOLike[2].padStart(2, '0');
      const day = partsISOLike[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Fallback standard Date parser
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Default return original
    return str;
  };

  const formatBirthday = (val: any): string => {
    if (!val) return '';
    
    // Check for Excel Date Serial Number
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }

    if (val instanceof Date && !isNaN(val.getTime())) {
      const day = String(val.getDate()).padStart(2, '0');
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const year = val.getFullYear();
      return `${day}/${month}/${year}`;
    }

    const str = String(val).trim();
    if (!str) return '';
    
    // If already DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      return str;
    }

    // If format is like DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const partsSlash = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (partsSlash) {
      const day = partsSlash[1].padStart(2, '0');
      const month = partsSlash[2].padStart(2, '0');
      let year = partsSlash[3];
      if (year.length === 2) {
        const yrNum = parseInt(year, 10);
        year = String(yrNum <= 50 ? 2000 + yrNum : 1900 + yrNum);
      }
      return `${day}/${month}/${year}`;
    }

    // If format is YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const partsISOLike = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (partsISOLike) {
      const year = partsISOLike[1];
      const month = partsISOLike[2].padStart(2, '0');
      const day = partsISOLike[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // Fallback standard Date parser
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const year = parsedDate.getFullYear();
      return `${day}/${month}/${year}`;
    }

    return str;
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      alert('Vui lòng chỉ tải lên file có định dạng Excel (.xlsx, .xls) hoặc CSV (.csv)');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        
        // Grab first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read as 2D array to be highly customizable
        const dataArr = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        
        if (dataArr.length === 0) {
          alert('File Excel trống rỗng, vui lòng kiểm tra lại!');
          return;
        }

        analyzeSheetStructure(dataArr);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('Có lỗi xảy ra khi đọc file Excel này. Vui lòng kiểm tra định dạng và thử lại!');
        setFileName(null);
      }
    };

    reader.readAsBinaryString(file);
  };

  const analyzeSheetStructure = (dataArr: any[][]) => {
    setRawSheetData(dataArr);

    // 1. Identify the header row based on search keywords
    let headerRowIndex = 0;
    let maxMatches = 0;

    // Scan the first 15 rows to locate the table headers row
    const scanLimit = Math.min(dataArr.length, 15);
    for (let r = 0; r < scanLimit; r++) {
      const row = dataArr[r];
      let matches = 0;

      row.forEach(cell => {
        const cellStr = String(cell).toLowerCase().trim();
        SCHEMA_FIELDS.forEach(field => {
          if (field.keywords.some(kw => cellStr.includes(kw))) {
            matches++;
          }
        });
      });

      if (matches > maxMatches) {
        maxMatches = matches;
        headerRowIndex = r;
      }
    }

    // Default back to Row 0 if absolutely no matches found
    const headerRow = dataArr[headerRowIndex] || [];

    // 2. Build initial mappings based on best match in that header row
    const initialMappings: ColumnMapping[] = SCHEMA_FIELDS.map(field => {
      let matchedIndex = -1;
      let matchedName = '';

      // Clean check
      for (let c = 0; c < headerRow.length; c++) {
        const headerCell = String(headerRow[c]).toLowerCase().trim();
        if (field.keywords.some(kw => headerCell === kw || headerCell.includes(kw))) {
          matchedIndex = c;
          matchedName = String(headerRow[c]);
          break;
        }
      }

      // If exact key match failed, try looser includes matching
      if (matchedIndex === -1) {
        for (let c = 0; c < headerRow.length; c++) {
          const headerCell = String(headerRow[c]).toLowerCase().trim();
          if (field.keywords.some(kw => headerCell.includes(kw))) {
            matchedIndex = c;
            matchedName = String(headerRow[c]);
            break;
          }
        }
      }

      return {
        fieldKey: field.key,
        colIndex: matchedIndex,
        colName: matchedIndex !== -1 ? matchedName : 'Chưa Map'
      };
    });

    setMappings(initialMappings);
    generatePreviewData(dataArr, initialMappings, headerRowIndex);
  };

  const updateMapping = (fieldKey: string, colIndex: number) => {
    let colName = 'Chưa Map';
    if (colIndex !== -1 && rawSheetData) {
      // Find the header row we scanned
      const headerRowIndex = getHeaderRowIndex();
      colName = String(rawSheetData[headerRowIndex][colIndex]);
    }

    const updated = mappings.map(m => {
      if (m.fieldKey === fieldKey) {
        return { ...m, colIndex, colName };
      }
      return m;
    });

    setMappings(updated);
    generatePreviewData(rawSheetData!, updated, getHeaderRowIndex());
  };

  const getHeaderRowIndex = () => {
    if (!rawSheetData) return 0;
    
    // We re-locate based on matched keys index or fallback
    let bestRow = 0;
    let maxMatches = 0;
    const scanLimit = Math.min(rawSheetData.length, 15);
    for (let r = 0; r < scanLimit; r++) {
      const row = rawSheetData[r];
      let matches = 0;
      row.forEach(cell => {
        const cellStr = String(cell).toLowerCase().trim();
        SCHEMA_FIELDS.forEach(field => {
          if (field.keywords.some(kw => cellStr.includes(kw))) {
            matches++;
          }
        });
      });
      if (matches > maxMatches) {
        maxMatches = matches;
        bestRow = r;
      }
    }
    return bestRow;
  };

  const generatePreviewData = (dataArr: any[][], currentMappings: ColumnMapping[], headerIdx: number) => {
    // Collect all data rows below headers
    const rows: ParsedRow[] = [];
    const codeMapping = currentMappings.find(m => m.fieldKey === 'code');
    const nameMapping = currentMappings.find(m => m.fieldKey === 'fullName');

    for (let r = headerIdx + 1; r < dataArr.length; r++) {
      const rawRow = dataArr[r];
      
      // Skip empty or STT-only rows
      const hasContent = rawRow.some((cell, cIdx) => {
        const colMap = currentMappings.find(m => m.colIndex === cIdx);
        return colMap && String(cell).trim() !== '';
      });
      
      if (!hasContent) continue;

      const rowData: Record<string, any> = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      // Extract raw mappings
      currentMappings.forEach(mapping => {
        if (mapping.colIndex !== -1) {
          const rawVal = rawRow[mapping.colIndex];
          rowData[mapping.fieldKey] = rawVal !== undefined ? String(rawVal).trim() : '';
        } else {
          rowData[mapping.fieldKey] = '';
        }
      });

      // Special cell value formatter overrides
      if (rowData.birthday) {
        rowData.birthday = formatBirthday(rawRow[currentMappings.find(m => m.fieldKey === 'birthday')!.colIndex]);
      }
      if (rowData.joinDate) {
        rowData.joinDate = formatDateISO(rawRow[currentMappings.find(m => m.fieldKey === 'joinDate')!.colIndex]);
      }

      // VALIDATIONS
      const codeVal = rowData.code ? String(rowData.code) : '';
      const nameVal = rowData.fullName ? String(rowData.fullName) : '';

      if (!codeMapping || codeMapping.colIndex === -1 || !codeVal) {
        errors.push('Thiếu Mã nhân viên');
      } else if (codeVal.length < 4) {
        warnings.push('Mã NV ngắn bất thường: ' + codeVal);
      }

      if (!nameMapping || nameMapping.colIndex === -1 || !nameVal) {
        errors.push('Thiếu Họ và tên');
      }

      // Check duplications inside current existing system
      const existing = existingEmployees.find(e => e.code === codeVal);
      if (existing && codeVal) {
        if (overwriteStrategy === 'OVERWRITE') {
          warnings.push(`Trùng Mã: GHI ĐÈ dữ liệu nhân sự "${existing.fullName}"`);
        } else {
          warnings.push(`Trùng Mã: Sẽ BỎ QUA dòng này`);
        }
      }

      // Validate Gender defaults
      if (rowData.gender) {
        const cleanGender = String(rowData.gender).toLowerCase().trim();
        if (cleanGender === 'nam' || cleanGender === 'm' || cleanGender === 'male' || cleanGender.startsWith('n')) {
          rowData.gender = cleanGender === 'nử' || cleanGender === 'nữ' || cleanGender === 'f' || cleanGender === 'female' || cleanGender.startsWith('nữ') ? 'Nữ' : 'Nam';
        } else {
          rowData.gender = 'Nam';
        }
      } else {
        rowData.gender = 'Nam';
      }

      rows.push({
        index: r,
        data: rowData,
        errors,
        warnings,
        isValid: errors.length === 0
      });
    }

    setParsedRows(rows);
  };

  const handleImportClick = () => {
    // Safe guard
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Không tìm thấy dòng dữ liệu hợp lệ nào để nhập!');
      return;
    }

    // Build the employee list
    const importedEmployees: Employee[] = [];

    validRows.forEach(row => {
      const codeVal = String(row.data.code);
      const nameVal = String(row.data.fullName);

      // Check duplication strategy
      const duplicateExists = existingEmployees.some(e => e.code === codeVal);
      if (duplicateExists && overwriteStrategy === 'SKIP') {
        // Skip
        return;
      }

      // Parse assembly lines correctly
      let lineVal: AssemblyLine = defaultLine;
      const deptVal = row.data.department ? String(row.data.department) : 'NM Bình Dương';
      const assocGroupVal = row.data.assemblyGroup ? String(row.data.assemblyGroup) : 'Lắp ráp';
      
      // Let's do some smart guessing of AssemblyLine (DCLR versus DC RMA BG)
      const lineText = (deptVal + ' ' + assocGroupVal + ' ' + (row.data.section || '')).toUpperCase();
      if (lineText.includes('RMA') || lineText.includes('BG') || lineText.includes('THỊNH')) {
        lineVal = 'DC RMA BG';
      } else if (lineText.includes('DCLR') || lineText.includes('KHIÊM') || lineText.includes('RO')) {
        lineVal = 'DCLR';
      }

      // Guess manager
      let managerVal = lineVal === 'DCLR' ? 'KHIÊM' : 'THỊNH';

      const employee: Employee = {
        id: `emp-excel-${codeVal}-${Date.now()}`,
        code: codeVal,
        fullName: nameVal,
        gender: row.data.gender || 'Nam',
        phone: row.data.phone || '',
        line: lineVal,
        manager: managerVal,
        joinDate: row.data.joinDate || new Date().toISOString().split('T')[0],
        status: defaultStatus,
        notes: row.data.notes || 'Nhập từ file Excel',
        department: deptVal,
        assemblyGroup: assocGroupVal,
        section: row.data.section || undefined,
        birthday: row.data.birthday || undefined,
        birthplace: row.data.birthplace || undefined,
      };

      importedEmployees.push(employee);
    });

    onImport(importedEmployees);
    alert(`Đã hoàn tất nhập dữ liệu! Thành công: ${importedEmployees.length} nhân sự mới/cập nhật.`);
    onClose();
  };

  const clearFile = () => {
    setFileName(null);
    setRawSheetData(null);
    setMappings([]);
    setParsedRows([]);
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-lg p-6 space-y-6 relative overflow-hidden" id="excel-importer-container">
      {/* Decorative tag */}
      <div className="absolute top-0 right-0 h-1.5 w-full bg-emerald-500"></div>

      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h4 className="text-md font-bold text-slate-800">Nhập Dữ Liệu Nhân Sự Từ File Excel</h4>
            <p className="text-xs text-slate-500 mt-0.5">Tải lên file dữ liệu nhân sự để tự động cập nhật hoặc thêm mới vào hệ thống chi tiết.</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-250 hover:bg-slate-200 rounded-lg transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* STEP 1: DROPZONE / FILE SELECTOR */}
      {!fileName ? (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition ${dragActive ? 'border-blue-500 bg-blue-50/40' : 'border-slate-300 hover:border-slate-400 bg-white'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden" 
            accept=".xlsx, .xls, .csv"
          />
          <UploadCloud size={44} className="text-slate-400 mb-3 animate-pulse-gentle" />
          <h5 className="text-sm font-bold text-slate-700">Kéo & thả file Excel ở đây hoặc click để duyệt</h5>
          <p className="text-xs text-slate-400 mt-1">Hỗ trợ file định dạng .xlsx, .xls, .csv</p>
          
          <div className="mt-4 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg text-[11px] text-slate-500 font-medium">
            <Info size={13} className="text-blue-500" />
            <span>Mẹo: Hệ thống tự nhận diện cột "Mã nhân viên", "Họ và tên", "Ngày sinh", "SĐT"...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File details banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200 rounded-xl p-4 gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="text-emerald-500 flex-shrink-0" size={24} />
              <div>
                <div className="text-sm font-bold text-slate-800">{fileName}</div>
                <div className="text-xs text-slate-400 font-medium">Tìm thấy {(rawSheetData?.length || 0) - 1} dòng dữ liệu</div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Reset file */}
              <button
                onClick={clearFile}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition"
              >
                <RefreshCw size={13} /> Thay đổi file
              </button>

              {/* Toggle advanced mapping panel */}
              <button
                onClick={() => setIsMappingOpen(!isMappingOpen)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition"
              >
                <span>Cấu hình Cột</span>
                {isMappingOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
          </div>

          {/* STEP 2: COLUMN MAPPING CONFIG PANEL */}
          {isMappingOpen && rawSheetData && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm animate-slide-down">
              <div>
                <h5 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings size={13} /> Cấu hình map cột dữ liệu
                </h5>
                <p className="text-xs text-slate-400 mt-0.5">Xác nhận cột trong file Excel tương ứng với các trường trong phần mềm.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mappings.map(map => {
                  const fieldSpec = SCHEMA_FIELDS.find(f => f.key === map.fieldKey);
                  if (!fieldSpec) return null;

                  return (
                    <div key={map.fieldKey} className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        {fieldSpec.label}
                        {fieldSpec.required && <span className="text-rose-500">*</span>}
                      </label>
                      
                      <select
                        value={map.colIndex}
                        onChange={(e) => updateMapping(map.fieldKey, Number(e.target.value))}
                        className={`w-full py-1.5 px-3.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white ${map.colIndex !== -1 ? 'border-emerald-300 text-emerald-800 font-medium' : fieldSpec.required ? 'border-rose-350 border-rose-300 text-rose-500 font-semibold' : 'border-slate-200 text-slate-500'}`}
                      >
                        <option value={-1}>-- Bỏ qua hoặc Chọn mặc định --</option>
                        {rawSheetData[getHeaderRowIndex()]?.map((headerName, hIdx) => (
                          <option key={hIdx} value={hIdx}>
                            Cột [{hIdx + 1}]: {String(headerName || `(Cột trống #${hIdx + 1})`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: CONFLICTS & DEFAULTS DECISION ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Chiến lược Trùng Mã NV</label>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setOverwriteStrategy('OVERWRITE')}
                  className={`py-1.5 px-3 text-xs font-extrabold rounded-lg transition ${overwriteStrategy === 'OVERWRITE' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Ghi đè bản cũ
                </button>
                <button
                  type="button"
                  onClick={() => setOverwriteStrategy('SKIP')}
                  className={`py-1.5 px-3 text-xs font-extrabold rounded-lg transition ${overwriteStrategy === 'SKIP' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Bỏ qua dòng trùng
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Dây chuyền mặc định</label>
              <select
                value={defaultLine}
                onChange={(e) => {
                  const line = e.target.value as AssemblyLine;
                  setDefaultLine(line);
                  setDefaultManager(line === 'DCLR' ? 'KHIÊM' : 'THỊNH');
                }}
                className="w-full py-1.5 px-3 border border-slate-200 text-xs rounded-lg bg-white font-medium"
              >
                <option value="DCLR">DCLR (QL: KHIÊM)</option>
                <option value="DC RMA BG">RMA BG (QL: THỊNH)</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái Nhập</label>
              <select
                value={defaultStatus}
                onChange={(e) => setDefaultStatus(e.target.value as EmployeeStatus)}
                className="w-full py-1.5 px-3 border border-slate-200 text-xs rounded-lg bg-white font-medium"
              >
                <option value="WORKING">Đang làm việc</option>
                <option value="ONBOARDING">Chờ nhận việc (Staged)</option>
                <option value="RESIGNED">Thôi việc hẳn (Nghỉ việc)</option>
                <option value="LEAVE">Nghỉ phép / Tạm nghỉ</option>
              </select>
            </div>
          </div>

          {/* STEP 4: PREVIEW GRID */}
          <div className="space-y-2 bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Bản xem trước kết quả nhập</span>
              <div className="flex gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Hợp lệ: {parsedRows.filter(r => r.isValid).length}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Lỗi (Không nhập): {parsedRows.filter(r => !r.isValid).length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold text-slate-500 uppercase sticky top-0 bg-white/95">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Dòng</th>
                    <th className="py-2.5 px-3">Mã NV</th>
                    <th className="py-2.5 px-4">Họ và Tên</th>
                    <th className="py-2.5 px-3">Phái</th>
                    <th className="py-2.5 px-3">Ngày sinh</th>
                    <th className="py-2.5 px-3">Nơi sinh</th>
                    <th className="py-2.5 px-3">Số điện thoại</th>
                    <th className="py-2.5 px-3">Bộ phận/Tổ</th>
                    <th className="py-2.5 px-4 text-center">Trạng thái duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {parsedRows.map((row, rIdx) => {
                    const isRowValid = row.isValid;
                    return (
                      <tr key={row.index} className={`hover:bg-slate-50 ${!isRowValid ? 'bg-red-50/30' : ''}`}>
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">{row.index + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{row.data.code || '-'}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{row.data.fullName || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{row.data.gender}</td>
                        <td className="py-2.5 px-3 text-slate-600">{row.data.birthday || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{row.data.birthplace || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{row.data.phone || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                            {row.data.section || 'Lắp ráp RO'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {isRowValid ? (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <Check size={11} /> Sẵn sàng
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                <AlertTriangle size={11} /> Lỗi
                              </div>
                            )}

                            {/* Show error/warning feedback */}
                            {row.errors.map((err, i) => (
                              <span key={i} className="text-[9px] font-bold text-rose-500 block leading-tight">{err}</span>
                            ))}
                            {row.warnings.map((warn, i) => (
                              <span key={i} className="text-[9px] font-bold text-amber-600 block leading-tight">{warn}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* STEP 5: ACTION BOX */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Sẵn sàng nhập: <span className="font-bold text-emerald-600">{parsedRows.filter(r => r.isValid).length}</span> nhân sự hợp lệ.
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={clearFile}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-100 transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleImportClick}
                disabled={parsedRows.filter(r => r.isValid).length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs shadow-sm shadow-blue-200 transition flex items-center gap-2 "
              >
                <Save size={14} />
                <span>Hoàn tất Nhập ({parsedRows.filter(r => r.isValid).length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
