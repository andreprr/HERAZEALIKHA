'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ReceiptText, CalendarDays, ArrowRightLeft,  
  Users, WashingMachine, Library, Download, Upload, FileText, Settings,
  Menu, X, ChevronLeft, ChevronRight, UserCircle, Banknote
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/kasir', label: 'Kasir', icon: ReceiptText },
  { path: '/sewa', label: 'Sewa & Booking', icon: CalendarDays },
  { path: '/transaksi', label: 'Transaksi', icon: ArrowRightLeft },
  { path: '/shift-kas', label: 'Shift Kas', icon: Banknote },
  { path: '/pelanggan', label: 'Pelanggan', icon: Users },
  { path: '/perawatan', label: 'Perawatan', icon: WashingMachine },
  { path: '/katalog-barang', label: 'Katalog Barang', icon: Library },
  { path: '/penerimaan', label: 'Penerimaan', icon: Download },
  { path: '/pengeluaran', label: 'Pengeluaran', icon: Upload },
  { path: '/laporan', label: 'Laporan', icon: FileText },
  { path: '/pengaturan', label: 'Pengaturan User', icon: Settings },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-white text-slate-800 overflow-hidden font-sans">
      
      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR (Ditambahkan print:hidden agar tidak ikut tercetak di PDF) */}
      <aside 
        className={`fixed lg:static top-0 left-0 h-full z-50 flex flex-col bg-white border-r border-purple-100 shadow-sm lg:shadow-none transition-all duration-300 ease-in-out print:hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarOpen ? 'w-64' : 'w-[80px]'}
        `}
      >
        <div className="flex items-center justify-between h-20 px-6 shrink-0 border-b border-transparent">
          <Link href="/" className={`flex items-center overflow-hidden transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0 lg:w-0'}`}>
            <h1 className="text-xl font-black tracking-widest text-purple-700 whitespace-nowrap">
              HERAZEALIKHA
            </h1>
          </Link>
          
          {!isSidebarOpen && (
            <div className="hidden lg:flex w-full justify-center">
              <h1 className="text-2xl font-black text-purple-700">H</h1>
            </div>
          )}

          <button 
            className="lg:hidden text-slate-500 hover:text-purple-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar py-6 px-4 space-y-1.5 flex flex-col items-center">
          {menuItems.map((menu) => {
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

      {/* AREA KONTEN UTAMA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        
        {/* HEADER (Ditambahkan print:hidden agar tidak ikut tercetak di PDF) */}
        <header className="h-20 flex items-center justify-between px-4 sm:px-8 shrink-0 bg-white border-b border-purple-100 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 rounded-lg shadow-sm bg-white border border-purple-200 text-slate-500 hover:text-purple-700"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-3 pl-3 sm:pl-5 border-l border-purple-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">Admin Utama</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Superadmin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center font-bold">
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