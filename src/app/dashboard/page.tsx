'use client';

import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  ShoppingCart, 
  Repeat, 
  CreditCard,
  MoreVertical,
  Users
} from 'lucide-react';

export default function DashboardPage() {
  // Mock Data berdasarkan spesifikasi .md
  const stats = [
    { 
      title: 'Total Pemasukan', 
      value: 'Rp 34.500.000', 
      trend: '+12.5%', 
      isUp: true, 
      icon: Wallet,
      desc: 'Bulan ini' 
    },
    { 
      title: 'Total Pengeluaran', 
      value: 'Rp 8.200.000', 
      trend: '-2.4%', 
      isUp: false, 
      icon: CreditCard,
      desc: 'Bulan ini' 
    },
    { 
      title: 'Total Transaksi', 
      value: '142', 
      trend: '+18.2%', 
      isUp: true, 
      icon: ShoppingCart,
      desc: 'Selesai' 
    },
    { 
      title: 'Total Rental Aktif', 
      value: '28', 
      trend: '+4.1%', 
      isUp: true, 
      icon: Repeat,
      desc: 'Sedang disewa' 
    },
  ];

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      
      {/* Header Halaman */}
      <div className="flex justify-between items-center mb-2 mt-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Overview</h2>
          <p className="text-slate-500 mt-1">Ringkasan performa rental & penjualan Anda</p>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100 hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-pink-50 rounded-2xl">
                <stat.icon size={24} className="text-pink-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${stat.isUp ? 'text-green-500' : 'text-red-500'}`}>
                {stat.isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {stat.trend}
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h3>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <p className="text-xs text-slate-400 mt-2">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Middle Section: Chart & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Overview (Mockup Chart Area) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Sales Overview</h3>
            <button className="text-slate-400 hover:text-pink-600 transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 h-[250px]">
            {/* Donut Chart Mockup */}
            <div className="relative w-48 h-48 rounded-full border-[16px] border-pink-100 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[16px] border-pink-500 border-t-transparent border-l-transparent transform -rotate-45"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">142</p>
                <p className="text-xs text-slate-500">Total Transaksi</p>
              </div>
            </div>

            {/* Legend / Detail Info */}
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <div className="bg-pink-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                  <span className="text-sm text-slate-500">Penjualan</span>
                </div>
                <p className="font-bold text-slate-800">Rp 21.000.000</p>
              </div>
              <div className="bg-pink-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-pink-200"></div>
                  <span className="text-sm text-slate-500">Penyewaan (Rental)</span>
                </div>
                <p className="font-bold text-slate-800">Rp 13.500.000</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Customers / Activities */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Rental Terbaru</h3>
            <button className="text-pink-600 text-sm font-medium hover:text-pink-700">Lihat Semua</button>
          </div>
          
          <div className="space-y-4">
            {[
              { name: 'Budi Santoso', item: 'Kamera DSLR', status: 'Rented', amount: 'Rp 450.000' },
              { name: 'Siti Aminah', item: 'Tenda Dome', status: 'Booked', amount: 'Rp 150.000' },
              { name: 'Andi Wijaya', item: 'Proyektor Epson', status: 'Returned', amount: 'Rp 200.000' },
              { name: 'Rina Kartika', item: 'Sound System', status: 'Rented', amount: 'Rp 600.000' },
            ].map((rental, i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-pink-50 rounded-2xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                    <Users size={18} className="text-pink-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{rental.name}</h4>
                    <p className="text-xs text-slate-500">{rental.item}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{rental.amount}</p>
                  <p className={`text-xs font-medium ${
                    rental.status === 'Rented' ? 'text-pink-500' : 
                    rental.status === 'Booked' ? 'text-orange-500' : 'text-slate-400'
                  }`}>
                    {rental.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}