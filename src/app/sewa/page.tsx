'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Search, Plus, CalendarDays, Loader2, 
  Clock, Package, CheckCircle, AlertCircle, Eye, CheckSquare, Edit3
} from 'lucide-react';

export default function SewaPage() {
  const [sewaList, setSewaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Perlu tindakan');

  const tabs = ['Perlu tindakan', 'Akan diambil', 'Sedang disewa', 'Terlambat', 'Selesai', 'Semua'];

  useEffect(() => {
    fetchSewa();
  }, []);

  const fetchSewa = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sewa')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setSewaList(data);
    } catch (error: any) {
      toast.error('Gagal mengambil data sewa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, message: string) => {
    if (!window.confirm(message)) return;
    
    try {
      const { error } = await supabase.from('sewa').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      toast.success(`Status berhasil diubah menjadi ${newStatus.toUpperCase()}`);
      fetchSewa();
    } catch (error: any) {
      toast.error('Gagal mengubah status.');
    }
  };

  const isTerlambat = (tanggalKembali: string, status: string) => {
    if (status === 'selesai') return false;
    const today = new Date().toISOString().split('T')[0];
    return tanggalKembali < today;
  };

  const getKategoriStatus = (item: any) => {
    if (item.status === 'selesai') return 'Selesai';
    if (isTerlambat(item.tanggal_kembali, item.status)) return 'Terlambat';
    if (item.status === 'dibawa') return 'Sedang disewa';
    if (item.status === 'booked') return 'Akan diambil';
    return 'Lainnya';
  };

  const filteredData = sewaList.filter(item => {
    const matchSearch = 
      item.nama_penyewa.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.invoice.toLowerCase().includes(searchQuery.toLowerCase());
    
    const kategori = getKategoriStatus(item);
    let matchTab = false;
    
    if (activeTab === 'Semua') matchTab = true;
    else if (activeTab === 'Perlu tindakan') {
      matchTab = kategori === 'Terlambat' || (item.total_harga - (item.dp || 0)) > 0;
    } else {
      matchTab = kategori === activeTab;
    }

    return matchSearch && matchTab;
  });

  const totalKontrak = sewaList.length;
  const totalTerlambat = sewaList.filter(item => isTerlambat(item.tanggal_kembali, item.status)).length;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-12 pt-2 w-full max-w-full bg-white">
      
      {/* HEADER & TOMBOL AKSI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="text-purple-700" /> Sewa & Booking
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalKontrak} kontrak terdaftar • {totalTerlambat > 0 ? <span className="text-red-500 font-bold">{totalTerlambat} terlambat</span> : '0 terlambat'}
          </p>
        </div>
        
        <Link href="/sewa/tambah" className="flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm shrink-0">
          <Plus size={18} />
          Booking Baru
        </Link>
      </div>

      {/* SEARCH BAR & TAB FILTER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama pelanggan, nomor invoice..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 text-sm rounded-xl bg-slate-50 border border-purple-200 outline-none focus:border-purple-600 text-slate-800 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar border-t border-purple-100 pt-4">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            const showBadge = tab === 'Terlambat' && totalTerlambat > 0;

            return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  isActive 
                    ? 'bg-purple-700 text-white shadow-sm shadow-purple-200' 
                    : 'bg-purple-50/60 text-slate-600 hover:bg-purple-100/60 border border-purple-100'
                }`}
              >
                {tab === 'Selesai' && <CheckCircle size={13} />}
                {tab}
                {showBadge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full ml-1">{totalTerlambat}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* LIST KARTU SEWA */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-purple-200">
            <Loader2 className="animate-spin text-purple-700 mb-3" size={36} />
            <p className="text-slate-500 font-medium text-sm">Memuat data booking...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-purple-200 p-12 text-center flex flex-col items-center">
            <Package className="text-slate-300 mb-3" size={50} />
            <h3 className="text-base font-bold text-slate-700">Tidak ada data</h3>
            <p className="text-slate-400 text-xs mt-1">Belum ada kontrak pada kategori ini.</p>
          </div>
        ) : (
          filteredData.map((item) => {
            const kategori = getKategoriStatus(item);
            const totalHarga = item.total_harga || 0;
            const sudahDibayar = item.dp || 0;
            const sisaTagihan = totalHarga - sudahDibayar;
            const isLunas = sisaTagihan <= 0;

            let badgeStyle = "bg-slate-100 text-slate-600";
            if (kategori === 'Selesai') badgeStyle = "bg-slate-100 text-slate-500";
            if (kategori === 'Akan diambil') badgeStyle = "bg-blue-50 text-blue-600 border border-blue-100";
            if (kategori === 'Sedang disewa') badgeStyle = "bg-purple-50 text-purple-700 border border-purple-100";
            if (kategori === 'Terlambat') badgeStyle = "bg-red-50 text-red-600 border border-red-100";

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-purple-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                
                {kategori === 'Terlambat' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                )}

                {/* Header Kartu */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4 border-b border-purple-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-slate-800 text-lg">{item.nama_penyewa}</h3>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-extrabold uppercase tracking-wide ${badgeStyle}`}>
                        {kategori}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {item.invoice} {item.no_wa ? `• ${item.no_wa}` : ''}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {kategori === 'Akan diambil' && (
                      <button 
                        onClick={() => handleUpdateStatus(item.id, 'dibawa', 'Barang sudah diambil oleh pelanggan?')}
                        className="text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Package size={14} /> Proses Ambil
                      </button>
                    )}
                    {(kategori === 'Sedang disewa' || kategori === 'Terlambat') && (
                      <button 
                        onClick={() => handleUpdateStatus(item.id, 'selesai', 'Barang sudah dikembalikan? (Stok akan bertambah otomatis)')}
                        className="text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckSquare size={14} /> Selesaikan
                      </button>
                    )}
                    
                    {/* TOMBOL EDIT */}
                    <Link href={`/sewa/edit/${item.id}`} className="text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5" title="Edit Transaksi">
                      <Edit3 size={14} /> Edit
                    </Link>

                    <Link href={`/sewa/detail/${item.id}`} className="text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5">
                      <Eye size={14} /> Detail
                    </Link>
                  </div>
                </div>

                {/* Body Kartu (Grid) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ambil</span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <CalendarDays size={14} className="text-purple-600" />
                      {formatDate(item.tanggal_bawa)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kembali</span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <CalendarDays size={14} className="text-purple-600" />
                      {formatDate(item.tanggal_kembali)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batas Waktu</span>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${kategori === 'Terlambat' ? 'text-red-500' : 'text-slate-700'}`}>
                      <Clock size={14} className={kategori === 'Terlambat' ? 'text-red-500' : 'text-purple-600'} />
                      {formatDate(item.tanggal_kembali)} {item.jam_kembali || ''}
                    </div>
                  </div>

                  {/* INFORMASI PEMBAYARAN (LUNAS / DP) */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai & Pembayaran</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${isLunas ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isLunas ? 'Lunas' : `Sisa: Rp ${sisaTagihan.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                    <div className="text-sm font-black text-purple-700">
                      Rp {totalHarga.toLocaleString('id-ID')}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Sudah dibayar: Rp {sudahDibayar.toLocaleString('id-ID')}
                    </span>
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}