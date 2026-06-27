import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  History, 
  Database,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  HeartPulse,
  Trash2
} from 'lucide-react';
import { DowntimeReport } from './types';
import { INITIAL_DOWNTIME_REPORTS, PRODUCTS, Product } from './data';
import KPICards from './KPICards';
import DowntimeCharts from './DowntimeCharts';
import DowntimeForm from './DowntimeForm';
import DowntimeTable from './DowntimeTable';
import ProductConfig from './ProductConfig';

const LOCAL_STORAGE_KEY = 'sunhouse_downtime_reports';
const LOCAL_STORAGE_PRODUCTS_KEY = 'sunhouse_products';

export default function App() {
  // 1. Quản lý danh sách báo cáo dừng Line (Tải từ localStorage nếu có)
  const [reports, setReports] = useState<DowntimeReport[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Lỗi phân tích dữ liệu cũ:', e);
      }
    }
    return INITIAL_DOWNTIME_REPORTS;
  });

  // Quản lý danh sách sản phẩm và giá bán (Tải từ localStorage nếu có)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Lỗi phân tích dữ liệu sản phẩm:', e);
      }
    }
    return PRODUCTS;
  });

  // Lưu trạng thái vào localStorage bất cứ khi nào danh sách reports thay đổi
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  // Lưu trạng thái vào localStorage bất cứ khi nào danh sách sản phẩm thay đổi
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  // 2. Các trạng thái giao diện (UI state)
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics' | 'products'>('logs');
  const [showForm, setShowForm] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<DowntimeReport | null>(null);
  
  // Đồng hồ hiển thị thời gian thực ở Header
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Thêm mới hoặc Cập nhật báo cáo
  const handleSubmitReport = (formData: Omit<DowntimeReport, 'id' | 'createdAt'> & { id?: string }) => {
    if (formData.id) {
      // Chế độ CẬP NHẬT (Update/Edit)
      setReports((prevReports) =>
        prevReports.map((r) =>
          r.id === formData.id
            ? {
                ...r,
                ...formData,
                // Giữ nguyên ngày tạo gốc
                createdAt: r.createdAt,
              }
            : r
        )
      );
      setReportToEdit(null);
    } else {
      // Chế độ THÊM MỚI (Add)
      const newReport: DowntimeReport = {
        ...formData,
        id: `dt-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setReports((prevReports) => [newReport, ...prevReports]);
    }
    setShowForm(false);
  };

  // 4. Kích hoạt chỉnh sửa báo cáo
  const handleEditClick = (report: DowntimeReport) => {
    setReportToEdit(report);
    setShowForm(true);
    // Cuộn mượt lên vị trí Form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 5. Xóa báo cáo
  const handleDeleteClick = (id: string) => {
    setReports((prevReports) => prevReports.filter((r) => r.id !== id));
  };

  // 6. Reset về dữ liệu mẫu mặc định
  const handleResetToDemo = () => {
    if (confirm('Bạn có chắc muốn khôi phục toàn bộ dữ liệu mẫu mặc định không? Tất cả các báo cáo do bạn tự thêm sẽ bị ghi đè.')) {
      setReports(INITIAL_DOWNTIME_REPORTS);
      setShowForm(false);
      setReportToEdit(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased">
      
      {/* HEADER DOANH NGHIỆP - Tông đỏ Sunhouse thương hiệu */}
      <header className="bg-[#B71C1C] text-white shadow-md border-b-4 border-[#8E1010]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & Tiêu đề */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-white p-2 rounded-lg shadow-inner flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-[#B71C1C]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-[#FFE082] text-[#5D4037] text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                  Nhà máy Sunhouse
                </span>
                <span className="text-[10px] text-red-100 font-medium">Hệ thống IoT & Giám sát</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                BÁO CÁO THỜI GIAN DỪNG LINE SẢN XUẤT
              </h1>
            </div>
          </div>

          {/* Widget Thời gian thực & Tiện ích */}
          <div className="flex items-center space-x-4 self-stretch md:self-auto justify-between md:justify-end">
            <div className="flex items-center space-x-2 bg-[#8E1010]/50 px-3 py-2 rounded-lg text-xs font-mono border border-red-800">
              <Clock className="w-4 h-4 text-amber-300" />
              <div>
                <span className="text-red-200">Giờ hiện tại:</span>{' '}
                <span className="font-bold text-white">
                  {currentTime.toLocaleTimeString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* BODY CHÍNH */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        
        {/* KPI DASHBOARD SECTION */}
        <section aria-label="Thống kê hiệu năng dừng Line">
          <KPICards reports={reports} />
        </section>

        {/* CONTAINER NHẬP BÁO CÁO (Thu gọn / Mở rộng mượt mà) */}
        <AnimatePresence initial={false}>
          {showForm && (
            <motion.section
              id="form-section"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ 
                opacity: 1, 
                height: 'auto',
                marginBottom: 24,
                transition: { height: { type: 'spring', stiffness: 200, damping: 25 }, opacity: { duration: 0.2 } }
              }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { height: { duration: 0.2 }, opacity: { duration: 0.1 } } }}
              className="overflow-hidden"
            >
              <DowntimeForm
                reportToEdit={reportToEdit}
                onSubmit={handleSubmitReport}
                onCancel={() => {
                  setShowForm(false);
                  setReportToEdit(null);
                }}
                products={products}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* PHÂN VÙNG CHỨC NĂNG - TABS DƯỚI DẠNG THIẾT KẾ ĐẸP MẮT */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* Tabs chuyển đổi */}
          <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab('logs');
                setShowForm(false);
                setReportToEdit(null);
              }}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              Nhật Ký Dừng Line
            </button>
            <button
              onClick={() => {
                setActiveTab('analytics');
                setShowForm(false);
                setReportToEdit(null);
              }}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Biểu Đồ Trực Quan
            </button>
            <button
              onClick={() => {
                setActiveTab('products');
                setShowForm(false);
                setReportToEdit(null);
              }}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Sản Phẩm & Giá Bán
            </button>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold self-stretch sm:self-auto justify-end px-2">
            <span className="flex items-center gap-1">
              <HeartPulse className="w-4 h-4 text-emerald-500" />
              Tỷ lệ chạy Line: <span className="font-bold text-slate-800">97.8%</span>
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <span>Mã nhà xưởng: <span className="font-bold text-slate-800">SHD-SH1</span></span>
          </div>

        </div>

        {/* NỘI DUNG TABS CHUYỂN ĐỔI */}
        <div className="transition-all duration-300">
          {activeTab === 'logs' ? (
            <section aria-label="Bảng nhật ký sự cố dừng Line">
              <DowntimeTable
                reports={reports}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onAddNewClick={() => {
                  setReportToEdit(null);
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </section>
          ) : activeTab === 'analytics' ? (
            <section aria-label="Biểu đồ phân tích thời gian dừng Line">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <DowntimeCharts reports={reports} />
              </motion.div>
            </section>
          ) : (
            <section aria-label="Danh mục sản phẩm và giá bán">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ProductConfig 
                  products={products}
                  onUpdateProducts={setProducts}
                  onResetProducts={() => setProducts(PRODUCTS)}
                />
              </motion.div>
            </section>
          )}
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-6 mt-12 border-t border-slate-900 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-slate-300">HỆ THỐNG BÁO CÁO THỜI GIAN DỪNG LINE SẢN XUẤT - NHÀ MÁY SUNHOUSE</p>
          <p className="mt-1.5 text-slate-500">
            Hỗ trợ ghi chép dữ liệu trực tiếp, phân tích biểu đồ Pareto nguyên nhân sụt giảm năng suất và xuất bảng tính Excel.
          </p>
          <p className="mt-4 text-[10px] text-slate-600">
            &copy; 2026 Sunhouse Group. All rights reserved. Tiêu chuẩn ISO 9001:2015.
          </p>
        </div>
      </footer>

    </div>
  );
}
