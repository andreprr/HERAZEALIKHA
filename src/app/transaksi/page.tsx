'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Search, CalendarDays, ArrowRightLeft, FileText, Loader2, 
  CheckCircle, Clock, Package, Eye, Printer, Calendar, Filter, Download, Trash2, Image as ImageIcon
} from 'lucide-react';

const DEFAULT_SHIFTS = [
  { id: '1', nama: 'Shift Pagi', start: '07:00', end: '15:00' },
  { id: '2', nama: 'Shift Sore', start: '15:00', end: '23:00' },
  { id: '3', nama: 'Satu Harian Penuh', start: '00:00', end: '23:59' }
];

export default function TransaksiPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'harian' | 'bulanan'>('harian');
  
  const today = new Date();
  const tzOffset = today.getTimezoneOffset() * 60000;
  const localISOTime = new Date(Date.now() - tzOffset).toISOString();
  
  const [filterTanggal, setFilterTanggal] = useState(localISOTime.split('T')[0]); 
  const [filterBulan, setFilterBulan] = useState(localISOTime.substring(0, 7)); 
  const [filterShift, setFilterShift] = useState('all');
  
  const [schedules, setSchedules] = useState<any[]>(DEFAULT_SHIFTS);
  
  useEffect(() => {
    setIsMounted(true);
    fetchTransaksi();

    const savedSchedules = localStorage.getItem('herazealikha_shifts');
    if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
  }, []);

  const fetchTransaksi = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sewa')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setTransaksiList(data);
    } catch (error: any) {
      toast.error('Gagal mengambil data transaksi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaksi = async (id: string, invoice: string) => {
    if (!window.confirm(`Hapus transaksi dengan invoice ${invoice}? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      await supabase.from('sewa_items').delete().eq('sewa_id', id);
      const { error } = await supabase.from('sewa').delete().eq('id', id);
      if (error) throw error;

      toast.success('Transaksi berhasil dihapus!');
      fetchTransaksi();
    } catch (error: any) {
      toast.error('Gagal menghapus transaksi.');
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const filteredData = transaksiList.filter(item => {
    const matchSearch = 
      item.nama_penyewa?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.invoice?.toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchWaktu = true;
    if (filterMode === 'harian') {
      matchWaktu = filterTanggal === '' || item.created_at.startsWith(filterTanggal);
    } else {
      matchWaktu = filterBulan === '' || item.created_at.startsWith(filterBulan);
    }

    let matchShift = true;
    if (filterShift !== 'all') {
      const selectedShift = schedules.find(s => s.id === filterShift);
      if (selectedShift && !(selectedShift.start === '00:00' && selectedShift.end === '23:59')) {
        const itemTime = new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        matchShift = itemTime >= selectedShift.start && itemTime <= selectedShift.end;
      }
    }

    return matchSearch && matchWaktu && matchShift;
  });

  const totalPemasukan = filteredData.reduce((sum, item) => sum + (item.dp || 0) + (item.status === 'selesai' ? (item.total_harga - item.dp) : 0), 0);
  const totalPotensi = filteredData.reduce((sum, item) => sum + (item.total_harga || 0), 0);

  // EXPORT EXCEL BESERTA BUKTI PEMBAYARAN
  const handleExportCSV = () => {
    if (filteredData.length === 0) return toast.error('Tidak ada data untuk diekspor');

    const headers = ['Waktu', 'Invoice', 'Nama Pelanggan', 'Status Sewa', 'Total Harga', 'Terbayar', 'Sisa', 'Status Pembayaran', 'Metode', 'Bukti Pembayaran (URL)'];
    
    const csvRows = filteredData.map(item => {
      const sisa = item.total_harga - (item.dp || 0);
      return [
        `"${formatDate(item.created_at)}"`,
        `"${item.invoice}"`,
        `"${item.nama_penyewa}"`,
        `"${item.status}"`,
        item.total_harga,
        item.dp || 0,
        sisa,
        `"${item.status_pembayaran}"`,
        `"${item.metode_pembayaran || 'Tunai'}"`,
        `"${item.bukti_pembayaran || '-'}"` // PERBAIKAN DI SINI
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const shiftName = filterShift === 'all' ? 'Semua_Shift' : schedules.find(s => s.id === filterShift)?.nama.replace(/\s+/g, '_');
    const timeLabel = filterMode === 'harian' ? filterTanggal : filterBulan;
    const fileName = `Laporan_Transaksi_${timeLabel}_${shiftName}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data Excel (CSV) beserta Bukti Pembayaran berhasil diunduh!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'booked': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase"><Clock size={12}/> Booking</span>;
      case 'dibawa': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold uppercase"><Package size={12}/> Rented</span>;
      case 'selesai': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase"><CheckCircle size={12}/> Selesai</span>;
      default: return null;
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col gap-6 h-full pb-8 pt-2 w-full max-w-full overflow-x-hidden relative bg-white">
      
      {/* CSS KHUSUS CETAK PDF / PRINT */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #print-report-area, #print-report-area * { visibility: visible; }
          #print-report-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            margin: 0; 
            padding: 10px; 
            background: white !important; 
            color: black !important;
          }
          .print-hidden { display: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 6px 8px !important; font-size: 10px !important; }
          th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />

      {/* HEADER UTAMA */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full print-hidden">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-800 truncate flex items-center gap-2">
            <ArrowRightLeft className="text-purple-700" /> Laporan Transaksi
          </h2>
          <p className="text-sm text-slate-500 mt-1 truncate">Export laporan ke PDF/Excel per hari, bulan, atau shift.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <button onClick={handleExportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-transform shadow-sm">
            <Download size={16} /> Excel (+ Bukti TF)
          </button>
          <button onClick={() => window.print()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-transform shadow-sm">
            <Printer size={16} /> PDF / Cetak
          </button>
        </div>
      </div>

      {/* KONTROL FILTER */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-200 print-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex bg-purple-50/50 rounded-xl border border-purple-100 p-1">
          <button onClick={() => setFilterMode('harian')} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${filterMode === 'harian' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-purple-700'}`}>Per Hari</button>
          <button onClick={() => setFilterMode('bulanan')} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${filterMode === 'bulanan' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-purple-700'}`}>Per Bulan</button>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600" size={16} />
          {filterMode === 'harian' ? (
            <input type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} className="w-full h-10 pl-9 pr-3 text-sm font-semibold rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 text-slate-800" />
          ) : (
            <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="w-full h-10 pl-9 pr-3 text-sm font-semibold rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 text-slate-800" />
          )}
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600" size={16} />
          <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className="w-full h-10 pl-9 pr-4 text-sm font-semibold rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 text-slate-800 cursor-pointer appearance-none">
            <option value="all">Semua Shift</option>
            {schedules.map(shift => <option key={shift.id} value={shift.id}>{shift.nama} ({shift.start}-{shift.end})</option>)}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Cari invoice/pelanggan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-white border border-purple-200 outline-none focus:border-purple-600 text-slate-800" />
        </div>
      </div>

      {/* AREA UTAMA / PRINT PDF WRAPPER */}
      <div id="print-report-area" className="flex flex-col gap-6 w-full">
        
        {/* Header khusus cetak PDF */}
        <div className="hidden print:block text-center pb-2 mb-2 border-b border-slate-300">
          <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">HERAZEALIKHA</h1>
          <p className="text-xs text-slate-600">Laporan Histori Transaksi & Pembayaran</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Periode: <b>{filterMode === 'harian' ? filterTanggal : filterBulan}</b> | Shift: <b>{filterShift === 'all' ? 'Semua Shift' : schedules.find(s => s.id === filterShift)?.nama}</b>
          </p>
        </div>

        {/* Ringkasan Angka */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-200 flex items-center gap-4 print:border-slate-300 print:shadow-none print:p-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pemasukan Kas (Real)</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">Rp {totalPemasukan.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-200 flex items-center gap-4 print:border-slate-300 print:shadow-none print:p-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Nilai Transaksi (Potensi)</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">Rp {totalPotensi.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* TABEL LAPORAN TRANSAKSI */}
        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden flex-1 flex flex-col w-full max-w-full print:border-none print:shadow-none">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[1000px] text-left text-sm text-slate-600 print:min-w-full">
              <thead className="bg-purple-50 text-slate-700 font-semibold border-b border-purple-100 print:bg-slate-100">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap w-[18%]">Waktu & Invoice</th>
                  <th className="px-6 py-4 w-[22%]">Pelanggan</th>
                  <th className="px-6 py-4 whitespace-nowrap w-[18%] text-right">Nilai Transaksi</th>
                  <th className="px-6 py-4 whitespace-nowrap w-[18%]">Pembayaran</th>
                  <th className="px-6 py-4 whitespace-nowrap w-[14%] text-center print-hidden">Bukti Pembayaran</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap w-[10%] print-hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="animate-spin text-purple-700 mx-auto mb-2" size={32} />
                      <p className="text-slate-500">Memuat riwayat transaksi...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Tidak ada transaksi pada filter waktu ini.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const sisaBayar = item.total_harga - (item.dp || 0);
                    return (
                      <tr key={item.id} className="hover:bg-purple-50/40 transition-colors group">
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-slate-500 mb-1">{formatDate(item.created_at)} WIB</div>
                          <div className="font-bold text-slate-800">{item.invoice}</div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800 mb-1">{item.nama_penyewa}</div>
                          <div className="print-hidden">{getStatusBadge(item.status)}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="font-black text-slate-800 text-base">
                            Rp {(item.total_harga || 0).toLocaleString('id-ID')}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Terbayar:</span>
                              <span className="font-semibold text-slate-800">Rp {(item.dp || 0).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Status:</span>
                              <span className="font-bold uppercase text-[10px] text-purple-700">{item.metode_pembayaran || 'Tunai'}</span>
                            </div>
                          </div>
                        </td>

                        {/* KOLOM BUKTI PEMBAYARAN (VIEW FOTO) */}
                        <td className="px-6 py-4 text-center whitespace-nowrap print-hidden">
                          {/* PERBAIKAN DI SINI: menggunakan item.bukti_pembayaran */}
                          {item.bukti_pembayaran ? (
                            <a 
                              href={item.bukti_pembayaran} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors"
                            >
                              <ImageIcon size={14} /> Lihat Foto
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Tidak ada foto</span>
                          )}
                        </td>

                        {/* KOLOM AKSI */}
                        <td className="px-6 py-4 text-center whitespace-nowrap print-hidden">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/sewa/detail/${item.id}`} className="p-2 text-slate-400 hover:text-purple-700 rounded-lg hover:bg-purple-50 transition-colors" title="Lihat Detail Transaksi">
                              <Eye size={18} />
                            </Link>
                            <button 
                              onClick={() => handleDeleteTransaksi(item.id, item.invoice)}
                              className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Hapus Transaksi"
                            >
                              <Trash2 size={18} />
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
    </div>
  );
}