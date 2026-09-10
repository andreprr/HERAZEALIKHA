'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ReceiptText, CalendarDays, ArrowRightLeft,  
  Users, Wallet, Library, Download, Upload, FileText, Settings,
  Menu, X, ChevronLeft, ChevronRight, UserCircle, Banknote, ClipboardCheck, LogOut
} from 'lucide-react';

const allMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/kasir', label: 'Kasir', icon: ReceiptText },
  { path: '/sewa', label: 'Sewa & Booking', icon: CalendarDays },
  { path: '/transaksi', label: 'Transaksi', icon: ArrowRightLeft },
  { path: '/shift-kas', label: 'Shift Kas', icon: Banknote },
  { path: '/pelanggan', label: 'Pelanggan', icon: Users },
  { path: '/kas-keluar', label: 'Kas Keluar', icon: Wallet },
  { path: '/opname', label: 'Opname', icon: ClipboardCheck },
  { path: '/laporan', label: 'Laporan', icon: FileText },
  { path: '/katalog-barang', label: 'Katalog Barang', icon: Library }, 
  // { path: '/penerimaan', label: 'Penerimaan', icon: Download }, 
  // { path: '/pengeluaran', label: 'Pengeluaran', icon: Upload }, 
  { path: '/pengaturan', label: 'Pengaturan User', icon: Settings }, 
];

const kasirAllowedPaths = [
  '/dashboard', '/kasir', '/sewa', '/transaksi', '/shift-kas', 
  '/pelanggan', '/kas-keluar', '/opname', '/laporan'
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
  const [userRole, setUserRole] = useState<'OWNER' | 'KASIR'>('OWNER');
  const [userName, setUserName] = useState('');

  // 1. CEK SESI LOGIN SAAT HALAMAN DIMUAT
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as 'OWNER' | 'KASIR';
    const savedName = localStorage.getItem('userName');
    
    if (savedRole) setUserRole(savedRole);
    if (savedName) setUserName(savedName);

    // Proteksi: Jika belum login, paksa ke halaman login
    if (!savedRole && !pathname.startsWith('/login')) {
      router.push('/login');
    } else if (savedRole === 'KASIR' && !pathname.startsWith('/login')) {
      // Jika Kasir masuk ke halaman terlarang, tendang ke dashboard
      const isAllowed = kasirAllowedPaths.some(allowedPath => pathname.startsWith(allowedPath));
      if (!isAllowed) {
        router.push('/dashboard');
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    if(window.confirm('Apakah Anda yakin ingin keluar?')) {
      localStorage.clear();
      router.push('/login');
    }
  };

  // 🔴 KUNCI UTAMA: JIKA SEDANG DI HALAMAN LOGIN, JANGAN RENDER SIDEBAR SAMA SEKALI
  if (pathname.startsWith('/login')) {
    return <main className="w-full min-h-screen bg-slate-50">{children}</main>;
  }

  // Filter menu untuk KASIR
  const visibleMenuItems = allMenuItems.filter(menu => {
    if (userRole === 'OWNER') return true; 
    return kasirAllowedPaths.includes(menu.path); 
  });

  return (
    <div className="flex h-screen bg-white text-slate-800 overflow-hidden font-sans">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside 
        className={`fixed lg:static top-0 left-0 h-full z-50 flex flex-col bg-white border-r border-purple-100 shadow-sm lg:shadow-none transition-all duration-300 ease-in-out print:hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarOpen ? 'w-64' : 'w-[80px]'}
        `}
      >
        <div className="relative flex items-center justify-center py-5 px-4 shrink-0 border-b border-transparent min-h-[5rem]">
          <Link href="/dashboard" className={`flex items-center justify-center overflow-hidden transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0 lg:w-0 lg:h-0'}`}>
            <img src="/gambar.jpeg" alt="Logo Herazealikha" className="w-32 h-auto max-h-24 object-contain" />
          </Link>
          
          {!isSidebarOpen && (
            <div className="hidden lg:flex w-full justify-center">
              <img src="/gambar.jpeg" alt="Logo Herazealikha" className="w-10 h-auto max-h-10 object-contain" />
            </div>
          )}

          <button 
            className="lg:hidden absolute right-4 top-4 p-1 text-slate-500 hover:bg-slate-100 rounded-lg hover:text-purple-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar py-6 px-4 space-y-1.5 flex flex-col items-center">
          {visibleMenuItems.map((menu) => {
            const isActive = pathname.startsWith(menu.path);
            
            return (
              <Link 
                key={menu.path} 
                href={menu.path}
                title={!isSidebarOpen ? menu.label : ''} 
                className={`flex items-center h-11 w-full rounded-xl transition-all duration-200 group relative
                  ${isSidebarOpen ? 'justify-start px-4' : 'lg:justify-center px-0'}
                  ${isActive 
                    ? 'bg-purple-700 text-white font-bold shadow-md shadow-purple-200' 
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                  }
                `}
              >
                <menu.icon size={18} className={`shrink-0 ${isSidebarOpen ? 'mr-3' : 'lg:mr-0'} transition-transform group-hover:scale-110`} />
                <span className={`whitespace-nowrap transition-all duration-300 
                  ${isSidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'lg:opacity-0 lg:-translate-x-4 lg:w-0 lg:overflow-hidden'}
                `}>
                  {menu.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-purple-100 hidden lg:flex justify-center">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center h-10 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        
        <header className="h-20 flex items-center justify-between px-4 sm:px-8 shrink-0 bg-white border-b border-purple-100 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 rounded-lg shadow-sm bg-white border border-purple-200 text-slate-500 hover:text-purple-700"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg border border-red-100 transition-colors font-bold text-xs"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-purple-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {userName || 'User System'}
                </p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {userRole}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border
                ${userRole === 'OWNER' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}
              `}>
                <UserCircle size={24} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 pt-6 custom-scrollbar bg-white">
          {children}
        </main>
        
      </div>
    </div>
  );
}