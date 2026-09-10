'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wallet, Package, ArrowUpRight, ArrowDownRight, Bird,
  Activity, Loader2, Calendar, AlertTriangle, Clock, 
  CheckCircle, Filter, Users
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'harian' | 'bulanan'>('bulanan');
  
  const [chartData, setChartData] = useState<any[]>([]);
  
  // State Finansial & Pelanggan
  const [finStats, setFinStats] = useState({
    totalTransaksi: 0,
    totalRental: 0,
    totalPelanggan: 0,
    totalPemasukan: 0,
    totalPengeluaran: 0
  });

  // State Operasional (Snapshot saat ini)
  const [opsStats, setOpsStats] = useState({
    terlambat: 0,
    jatuhTempo: 0,
    sedangDisewa: 0
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
        .in('status', ['dibawa', 'terlambat']); // Termasuk yang terlambat jika statusnya sudah diubah

      let countTerlambat = 0;
      let countJatuhTempo = 0;
      let countSedangDisewa = 0;

      if (activeSewa) {
        countSedangDisewa = activeSewa.length;
        activeSewa.forEach(item => {
          // Menyesuaikan logika tanggal seperti di Booking
          let cleanStr = item.tanggal_kembali.trim().replace(' ', 'T');
          if (cleanStr.length === 10) cleanStr += 'T23:59:00';
          
          const expectedTime = new Date(cleanStr).getTime();
          const nowTime = new Date().getTime();
          const tglKembali = item.tanggal_kembali.split(' ')[0]; 

          if (nowTime > expectedTime) {
            countTerlambat++;
          } else if (tglKembali === todayStr) {
            countJatuhTempo++;
          }
        });
      }

      setOpsStats({
        terlambat: countTerlambat,
        jatuhTempo: countJatuhTempo,
        sedangDisewa: countSedangDisewa
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

      const { data: pengeluaranData } = await supabase
        .from('pengeluaran')
        .select('nominal, tanggal')
        .gte('tanggal', startDateStr)
        .lte('tanggal', todayStr);

      let totalPemasukan = 0;
      let totalTransaksi = sewaData ? sewaData.length : 0;
      const uniqueCustomers = new Set();

      if (sewaData) {
        sewaData.forEach(item => {
          totalPemasukan += (item.status === 'selesai' ? (item.total_harga || 0) : (item.dp || 0));
          const key = item.no_wa ? item.no_wa.trim() : item.nama_penyewa?.trim().toLowerCase();
          if (key) uniqueCustomers.add(key);
        });
      }

      let totalPengeluaran = 0;
      if (pengeluaranData) {
        totalPengeluaran = pengeluaranData.reduce((sum, item) => sum + (item.nominal || 0), 0);
      }

      setFinStats({
        totalTransaksi: totalTransaksi,
        totalRental: totalTransaksi, 
        totalPelanggan: uniqueCustomers.size,
        totalPemasukan: totalPemasukan,
        totalPengeluaran: totalPengeluaran
      });

      // ==========================================
      // 3. SIAPKAN DATA GRAFIK
      // ==========================================
      const chartMap: Record<string, any> = {};
      const generatedChartData = [];
      
      if (filterMode === 'harian') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dateStr = getLocalISODate(d);
          const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
          const entry = { date: dateStr, name: dayName, Pemasukan: 0, Pengeluaran: 0 };
          chartMap[dateStr] = entry;
          generatedChartData.push(entry);
        }
      } else {
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - (i * 5)); 
          const dateStr = getLocalISODate(d);
          const entry = { date: dateStr, name: `${d.getDate()}/${d.getMonth()+1}`, Pemasukan: 0, Pengeluaran: 0 };
          chartMap[dateStr] = entry;
          generatedChartData.push(entry);
        }
      }

      const earliestChartDate = generatedChartData[0].date;
      
      // Ambil Pemasukan untuk Grafik
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

      // Ambil Pengeluaran untuk Grafik
      const { data: chartPengeluaranData } = await supabase
        .from('pengeluaran')
        .select('nominal, tanggal')
        .gte('tanggal', earliestChartDate);

      if (chartPengeluaranData) {
        chartPengeluaranData.forEach(item => {
          const dtStr = item.tanggal; 
          let targetKey = dtStr;
          if (filterMode === 'bulanan') {
            targetKey = Object.keys(chartMap).reduce((prev, curr) => Math.abs(new Date(curr).getTime() - new Date(dtStr).getTime()) < Math.abs(new Date(prev).getTime() - new Date(dtStr).getTime()) ? curr : prev);
          }
          if (chartMap[targetKey]) {
            chartMap[targetKey].Pengeluaran += (item.nominal || 0);
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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] bg-slate-50/50">
        <Loader2 size={40} className="text-purple-700 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat data dashboard...</p>
      </div>
    );
  }

  const labaBersih = finStats.totalPemasukan - finStats.totalPengeluaran;

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-7xl mx-auto overflow-x-hidden bg-white">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-100">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0 shadow-inner">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 truncate">Dashboard Ringkasan</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Pantau performa transaksi dan arus kas.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
          <button 
            onClick={() => setFilterMode('harian')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${filterMode === 'harian' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-purple-600 hover:bg-white/50'}`}
          >
            <Calendar size={14} /> Hari Ini
          </button>
          <button 
            onClick={() => setFilterMode('bulanan')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${filterMode === 'bulanan' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-purple-600 hover:bg-white/50'}`}
          >
            <Filter size={14} /> Bulan Ini
          </button>
        </div>
      </div>

      {/* 1. STATISTIK OPERASIONAL (CURRENT SNAPSHOT) */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 ml-1">Status Sewa (Real-time)</h3>
        {/* Diubah menjadi 3 Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col justify-center transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-50 rounded-xl text-red-600 shrink-0 border border-red-100"><AlertTriangle size={18} /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Terlambat</p>
            </div>
            <p className="text-3xl font-black text-red-600">{opsStats.terlambat}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-center transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600 shrink-0 border border-amber-100"><Clock size={18} /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jatuh Tempo Hari Ini</p>
            </div>
            <p className="text-3xl font-black text-amber-500">{opsStats.jatuhTempo}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-center transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600 shrink-0 border border-blue-100"><Package size={18} /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sedang Disewa</p>
            </div>
            <p className="text-3xl font-black text-blue-600">{opsStats.sedangDisewa}</p>
          </div>

        </div>
      </div>

      {/* 2. STATISTIK FINANSIAL & PELANGGAN */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 ml-1">Ringkasan Kinerja ({filterMode === 'harian' ? 'Hari Ini' : 'Bulan Ini'})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col justify-center relative overflow-hidden group hover:border-purple-300 transition-all hover:shadow-md">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none text-purple-900 group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-500"><Activity size={140} /></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2.5 bg-purple-50 rounded-xl text-purple-700 shrink-0 border border-purple-100"><CheckCircle size={20} /></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Transaksi</p>
            </div>
            <p className="text-3xl font-black text-slate-800 relative z-10">{finStats.totalTransaksi}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-center relative overflow-hidden group hover:border-blue-300 transition-all hover:shadow-md">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none text-blue-900 group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-500"><Package size={140} /></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0 border border-blue-100"><Package size={20} /></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Disewa</p>
            </div>
            <p className="text-3xl font-black text-slate-800 relative z-10">{finStats.totalRental}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-center relative overflow-hidden group hover:border-amber-300 transition-all hover:shadow-md">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none text-amber-900 group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-500"><Users size={140} /></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0 border border-amber-100"><Users size={20} /></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pelanggan</p>
            </div>
            <p className="text-3xl font-black text-slate-800 relative z-10">{finStats.totalPelanggan}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-200 flex flex-col justify-center relative overflow-hidden group hover:border-green-400 transition-all hover:shadow-md bg-gradient-to-br from-white to-green-50/30">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none text-green-900 group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-500"><Wallet size={140} /></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2.5 bg-green-100 rounded-xl text-green-700 shrink-0 shadow-sm"><ArrowUpRight size={20} /></div>
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Pendapatan / Omzet</p>
            </div>
            <p className="text-3xl font-black text-slate-800 relative z-10 tracking-tight">Rp {finStats.totalPemasukan.toLocaleString('id-ID')}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 flex flex-col justify-center relative overflow-hidden group hover:border-red-400 transition-all hover:shadow-md bg-gradient-to-br from-white to-red-50/30">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none text-red-900 group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-500"><ArrowDownRight size={140} /></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2.5 bg-red-100 rounded-xl text-red-700 shrink-0 shadow-sm"><ArrowDownRight size={20} /></div>
              <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Total Pengeluaran</p>
            </div>
            <p className="text-3xl font-black text-slate-800 relative z-10 tracking-tight">Rp {finStats.totalPengeluaran.toLocaleString('id-ID')}</p>
          </div>

          {/* ICON LABA BERSIH DIGANTI MENJADI BIRD (AYAM) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-200 flex flex-col justify-center relative overflow-hidden group hover:border-teal-400 transition-all hover:shadow-md bg-gradient-to-br from-white to-teal-50/30">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none text-teal-900 group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-500"><Bird size={140} /></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2.5 bg-teal-100 rounded-xl text-teal-700 shrink-0 shadow-sm"><Bird size={20} /></div>
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Laba Bersih</p>
            </div>
            <p className={`text-3xl font-black relative z-10 tracking-tight ${labaBersih >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
              Rp {labaBersih.toLocaleString('id-ID')}
            </p>
          </div>

        </div>
      </div>

      {/* 3. GRAFIK SECTION */}
      <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-slate-200 w-full mt-2">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Grafik Pemasukan vs Pengeluaran</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tren Arus Kas {filterMode === 'harian' ? '7 hari terakhir' : 'bulan ini'}.
            </p>
          </div>
        </div>

        <div className="w-full h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                tickFormatter={(value) => `Rp ${value >= 1000000 ? value / 1000000 + 'Jt' : value >= 1000 ? value / 1000 + 'K' : value}`}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                formatter={(value: any, name: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, name]}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                itemStyle={{ fontWeight: 600, fontSize: '14px', paddingBottom: '4px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '25px', fontWeight: 600, fontSize: '13px' }} iconType="circle" />
              <Line 
                type="monotone" 
                name="Pemasukan"
                dataKey="Pemasukan" 
                stroke="#16a34a" 
                strokeWidth={4}
                dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#16a34a' }}
                activeDot={{ r: 8, strokeWidth: 0, fill: '#16a34a' }}
              />
              <Line 
                type="monotone" 
                name="Pengeluaran"
                dataKey="Pengeluaran" 
                stroke="#ef4444" 
                strokeWidth={4}
                dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#ef4444' }}
                activeDot={{ r: 8, strokeWidth: 0, fill: '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}