'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wallet, Package, ArrowUpRight, 
  Activity, Loader2, Calendar, AlertTriangle, Clock, 
  Wrench, CheckCircle, Filter, Users
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'harian' | 'bulanan'>('bulanan');
  
  const [chartData, setChartData] = useState<any[]>([]);
  
  // State Finansial & Pelanggan (Tanpa Pengeluaran)
  const [finStats, setFinStats] = useState({
    totalTransaksi: 0,
    totalRental: 0,
    totalPelanggan: 0,
    totalPemasukan: 0
  });

  // State Operasional (Snapshot saat ini)
  const [opsStats, setOpsStats] = useState({
    terlambat: 0,
    jatuhTempo: 0,
    sedangDisewa: 0,
    perawatan: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, [filterMode]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const tzOffset = (new Date()).getTimezoneOffset() * 60000;
      const getLocalISODate = (d: Date) => new Date(d.getTime() - tzOffset).toISOString().split('T')[0];

      const today = new Date();
      const todayStr = getLocalISODate(today);
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayStr = getLocalISODate(firstDayOfMonth);

      // ==========================================
      // 1. FETCH DATA OPERASIONAL
      // ==========================================
      const { data: activeSewa } = await supabase
        .from('sewa')
        .select('id, status, tanggal_kembali')
        .eq('status', 'dibawa');

      let countTerlambat = 0;
      let countJatuhTempo = 0;
      let countSedangDisewa = 0;

      if (activeSewa) {
        countSedangDisewa = activeSewa.length;
        activeSewa.forEach(item => {
          // Hanya membandingkan tanggal (mengabaikan jam jika formatnya datetime)
          const tglKembali = item.tanggal_kembali.split(' ')[0]; 
          if (tglKembali < todayStr) {
            countTerlambat++;
          } else if (tglKembali === todayStr) {
            countJatuhTempo++;
          }
        });
      }

      // Hitung Barang di Perawatan secara Dinamis
      let countPerawatan = 0;
      try {
        const { data: rawatData } = await supabase
          .from('perawatan')
          .select('qty')
          .eq('status', 'aktif');
          
        countPerawatan = rawatData?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0;
      } catch (e) {}

      setOpsStats({
        terlambat: countTerlambat,
        jatuhTempo: countJatuhTempo,
        sedangDisewa: countSedangDisewa,
        perawatan: countPerawatan
      });

      // ==========================================
      // 2. FETCH DATA FINANSIAL & PELANGGAN
      // ==========================================
      const startDateStr = filterMode === 'harian' ? todayStr : firstDayStr;
      
      const { data: sewaData } = await supabase
        .from('sewa')
        .select('total_harga, dp, status, created_at, no_wa, nama_penyewa')
        .gte('created_at', `${startDateStr}T00:00:00.000Z`)
        .lte('created_at', `${todayStr}T23:59:59.999Z`);

      let totalPemasukan = 0;
      let totalTransaksi = sewaData ? sewaData.length : 0;
      const uniqueCustomers = new Set();

      if (sewaData) {
        sewaData.forEach(item => {
          totalPemasukan += (item.status === 'selesai' ? (item.total_harga || 0) : (item.dp || 0));
          
          // Hitung Pelanggan Unik
          const key = item.no_wa ? item.no_wa.trim() : item.nama_penyewa?.trim().toLowerCase();
          if (key) uniqueCustomers.add(key);
        });
      }

      setFinStats({
        totalTransaksi: totalTransaksi,
        totalRental: totalTransaksi, 
        totalPelanggan: uniqueCustomers.size,
        totalPemasukan: totalPemasukan
      });

      // ==========================================
      // 3. SIAPKAN DATA GRAFIK (Tanpa Pengeluaran)
      // ==========================================
      const chartMap: Record<string, any> = {};
      const generatedChartData = [];
      
      if (filterMode === 'harian') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dateStr = getLocalISODate(d);
          const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
          const entry = { date: dateStr, name: dayName, Pemasukan: 0 };
          chartMap[dateStr] = entry;
          generatedChartData.push(entry);
        }
      } else {
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - (i * 5)); 
          const dateStr = getLocalISODate(d);
          const entry = { date: dateStr, name: `${d.getDate()}/${d.getMonth()+1}`, Pemasukan: 0 };
          chartMap[dateStr] = entry;
          generatedChartData.push(entry);
        }
      }

      const earliestChartDate = generatedChartData[0].date;
      const { data: chartSewaData } = await supabase
        .from('sewa')
        .select('total_harga, dp, status, created_at')
        .gte('created_at', `${earliestChartDate}T00:00:00.000Z`);

      if (chartSewaData) {
        chartSewaData.forEach(item => {
          const dtStr = getLocalISODate(new Date(item.created_at));
          let targetKey = dtStr;
          if (filterMode === 'bulanan') {
            targetKey = Object.keys(chartMap).reduce((prev, curr) => Math.abs(new Date(curr).getTime() - new Date(dtStr).getTime()) < Math.abs(new Date(prev).getTime() - new Date(dtStr).getTime()) ? curr : prev);
          }
          if (chartMap[targetKey]) {
            chartMap[targetKey].Pemasukan += (item.status === 'selesai' ? (item.total_harga || 0) : (item.dp || 0));
          }
        });
      }

      setChartData(generatedChartData);

    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] bg-white">
        <Loader2 size={40} className="text-purple-700 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat data dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-full overflow-x-hidden bg-white">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 truncate">Dashboard Ringkasan</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">Pantau performa transaksi dan pendapatan.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-purple-50/50 p-1.5 rounded-xl border border-purple-100 shrink-0">
          <button 
            onClick={() => setFilterMode('harian')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${filterMode === 'harian' ? 'bg-white text-purple-700 shadow-sm border border-purple-200' : 'text-slate-500 hover:text-purple-600'}`}
          >
            <Calendar size={14} /> Hari Ini
          </button>
          <button 
            onClick={() => setFilterMode('bulanan')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${filterMode === 'bulanan' ? 'bg-white text-purple-700 shadow-sm border border-purple-200' : 'text-slate-500 hover:text-purple-600'}`}
          >
            <Filter size={14} /> Bulan Ini
          </button>
        </div>
      </div>

      {/* 1. STATISTIK OPERASIONAL (CURRENT SNAPSHOT) */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 ml-1">Status Sewa (Real-time)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-200 flex flex-col justify-center relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="p-2 bg-red-100 rounded-lg text-red-600 shrink-0"><AlertTriangle size={16} /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Terlambat</p>
            </div>
            <p className="text-2xl font-black text-red-600 relative z-10">{opsStats.terlambat}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-200 flex flex-col justify-center relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0"><Clock size={16} /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jatuh Tempo Hari Ini</p>
            </div>
            <p className="text-2xl font-black text-amber-600 relative z-10">{opsStats.jatuhTempo}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-200 flex flex-col justify-center relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0"><Package size={16} /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sedang Disewa</p>
            </div>
            <p className="text-2xl font-black text-blue-600 relative z-10">{opsStats.sedangDisewa}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0"><Wrench size={16} /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dalam Perawatan</p>
            </div>
            <p className="text-2xl font-black text-slate-700 relative z-10">{opsStats.perawatan}</p>
          </div>

        </div>
      </div>

      {/* 2. STATISTIK FINANSIAL & PELANGGAN (Berdasarkan Filter) */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 ml-1">Ringkasan Kinerja ({filterMode === 'harian' ? 'Hari Ini' : 'Bulan Ini'})</h3>
        {/* Ubah grid ke 4 kolom karena Pengeluaran dihapus */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col justify-center relative overflow-hidden group hover:border-purple-400 transition-colors">
            <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none text-purple-600 group-hover:scale-110 transition-transform"><Activity size={100} /></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="p-2.5 bg-purple-100 rounded-xl text-purple-700 shrink-0"><CheckCircle size={20} /></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transaksi</p>
            </div>
            <p className="text-3xl font-black text-slate-800 relative z-10">{finStats.totalTransaksi}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col justify-center relative overflow-hidden group hover:border-purple-400 transition-colors">
            <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none text-blue-600 group-hover:scale-110 transition-transform"><Package size={100} /></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0"><Package size={20} /></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Rental</p>
            </div>
            <p className="text-3xl font-black text-slate-800 relative z-10">{finStats.totalRental}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col justify-center relative overflow-hidden group hover:border-purple-400 transition-colors">
            <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none text-amber-600 group-hover:scale-110 transition-transform"><Users size={100} /></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 shrink-0"><Users size={20} /></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pelanggan</p>
            </div>
            <p className="text-3xl font-black text-slate-800 relative z-10">{finStats.totalPelanggan}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col justify-center relative overflow-hidden group hover:border-green-400 transition-colors">
            <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none text-green-600 group-hover:scale-110 transition-transform"><Wallet size={100} /></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="p-2.5 bg-green-100 rounded-xl text-green-600 shrink-0"><ArrowUpRight size={20} /></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendapatan</p>
            </div>
            <p className="text-2xl font-black text-slate-800 relative z-10">Rp {finStats.totalPemasukan.toLocaleString('id-ID')}</p>
          </div>

        </div>
      </div>

      {/* 3. GRAFIK SECTION */}
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-purple-200 w-full mt-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Grafik Pemasukan</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tren Pemasukan {filterMode === 'harian' ? '7 hari terakhir' : 'bulan ini'}.
            </p>
          </div>
        </div>

        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => `Rp ${value >= 1000000 ? value / 1000000 + 'Jt' : value / 1000 + 'K'}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any, name: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, name]}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line 
                type="monotone" 
                name="Pemasukan"
                dataKey="Pemasukan" 
                stroke="#16a34a" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}