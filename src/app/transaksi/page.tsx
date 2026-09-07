'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Search, CalendarDays, ArrowRightLeft, FileText, Loader2, 
  CheckCircle, Clock, Package, Eye, Printer, Filter
} from 'lucide-react';

export default function TransaksiPage() {
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  
  useEffect(() => {
    const fetchTransaksi = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('sewa')
          .select('id, invoice, nama_penyewa, created_at, total_harga, dp, status')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setTransaksiList(data);
      } catch (error: any) {
        toast.error('Gagal mengambil data transaksi.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransaksi();
  }, []);

  // Format Tanggal
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Logika Filter
  const filteredData = transaksiList.filter(item => {
    const matchSearch = 
      item.nama_penyewa.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.invoice.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Filter berdasarkan format YYYY-MM
    const itemMonth = item.created_at.substring(0, 7); 
    const matchBulan = filterBulan === '' || itemMonth === filterBulan;

    return matchSearch && matchBulan;
  });

  // Hitung Total Ringkasan (Hanya dari data yang terfilter)
  const totalPemasukan = filteredData.reduce((sum, item) => sum + (item.dp || 0) + (item.status === 'selesai' ? (item.total_harga - item.dp) : 0), 0);
  const totalPotensi = filteredData.reduce((sum, item) => sum + item.total_harga, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'booked': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase"><Clock size={12}/> Booking</span>;
      case 'dibawa': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-pink-100 text-pink-700 text-[10px] font-bold uppercase"><Package size={12}/> Rented</span>;
      case 'selesai': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase"><CheckCircle size={12}/> Selesai</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-8 pt-2 w-full max-w-full overflow-x-hidden">
      
      {/* Header & Filter */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-800 truncate flex items-center gap-2">
            <ArrowRightLeft className="text-pink-600" /> Riwayat Transaksi
          </h2>
          <p className="text-sm text-slate-500 mt-1 truncate">Pantau arus kas dan riwayat pembayaran pelanggan.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Pencarian */}
          <div className="relative flex-1 sm:w-64 min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari invoice/nama..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-white shadow-sm border border-pink-200 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all text-slate-800"
            />
          </div>
          
          {/* Filter Bulan */}
          <div className="relative w-full sm:w-48 shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="month" 
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-white shadow-sm border border-pink-200 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Kartu Ringkasan Finansial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uang Masuk (Riil)</p>
            <p className="text-2xl font-black text-slate-800 mt-1">Rp {totalPemasukan.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <CalendarDays size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Nilai Transaksi</p>
            <p className="text-2xl font-black text-slate-800 mt-1">Rp {totalPotensi.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Tabel Transaksi */}
      <div className="bg-white rounded-2xl shadow-sm border border-pink-200 overflow-hidden flex-1 flex flex-col w-full max-w-full">
        
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[900px] text-left text-sm text-slate-600">
            <thead className="bg-pink-50 text-slate-700 font-semibold border-b border-pink-100">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap w-[25%]">Waktu & Invoice</th>
                <th className="px-6 py-4 w-[25%]">Pelanggan</th>
                <th className="px-6 py-4 whitespace-nowrap w-[20%] text-right">Nilai Transaksi</th>
                <th className="px-6 py-4 whitespace-nowrap w-[20%]">Status Pembayaran</th>
                <th className="px-6 py-4 text-center whitespace-nowrap w-[10%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-pink-600 mx-auto mb-2" size={32} />
                    <p className="text-slate-500">Memuat riwayat transaksi...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada transaksi pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const sisaBayar = item.total_harga - item.dp;
                  
                  return (
                    <tr key={item.id} className="hover:bg-pink-50/50 transition-colors group">
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-slate-500 mb-1">{formatDate(item.created_at)}</div>
                        <div className="font-bold text-slate-800">{item.invoice}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 truncate">{item.nama_penyewa}</div>
                        <div className="mt-1">{getStatusBadge(item.status)}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-[11px] text-slate-500 mb-0.5">Total Harga:</div>
                        <div className="font-black text-slate-800 text-base">
                          Rp {item.total_harga.toLocaleString('id-ID')}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">DP/Bayar:</span>
                            <span className="font-semibold text-slate-800">Rp {item.dp.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Sisa:</span>
                            {sisaBayar > 0 ? (
                              <span className="font-bold text-red-500">Rp {sisaBayar.toLocaleString('id-ID')}</span>
                            ) : (
                              <span className="font-bold text-green-500">LUNAS</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/sewa/detail/${item.id}`}
                            className="p-2 text-slate-400 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors"
                            title="Lihat Detail Transaksi"
                          >
                            <Eye size={18} />
                          </Link>
                          <button
                            onClick={() => window.open(`/sewa/detail/${item.id}`, '_blank')}
                            className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Cetak Struk"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}