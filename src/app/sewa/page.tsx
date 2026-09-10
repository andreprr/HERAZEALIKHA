'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { 
  Search, CalendarDays, Loader2, 
  Clock, Package, CheckCircle, Eye, CheckSquare, Edit3, Download,
  AlertCircle, AlertTriangle
} from 'lucide-react';

export default function BookingPage() { 
  const [sewaList, setSewaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Perlu tindakan');

  // State untuk Modal Konfirmasi
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: '',
    newStatus: '',
    title: '',
    message: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Fungsi untuk membuka modal konfirmasi
  const openConfirmModal = (id: string, newStatus: string, title: string, message: string) => {
    setConfirmModal({ isOpen: true, id, newStatus, title, message });
  };

  // Fungsi untuk mengeksekusi update status dari dalam modal
  const executeUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('sewa')
        .update({ status: confirmModal.newStatus })
        .eq('id', confirmModal.id);
        
      if (error) throw error;

      toast.success(`Status berhasil diubah menjadi ${confirmModal.newStatus === 'dibawa' ? 'SEDANG DISEWA' : confirmModal.newStatus.toUpperCase()}`);
      setConfirmModal({ ...confirmModal, isOpen: false });
      fetchSewa();
    } catch (error: any) {
      toast.error('Gagal mengubah status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 🔴 FUNGSI HITUNG DENDA (Rp 5.000 / Hari)
  const hitungDenda = (tanggalKembali: string, status: string) => {
    if (status === 'selesai' || !tanggalKembali) return { hari: 0, nominal: 0 };
    
    try {
      // Normalisasi format string tanggal agar terbaca oleh Date()
      let cleanStr = tanggalKembali.trim().replace(' ', 'T');
      if (cleanStr.length === 10) cleanStr += 'T23:59:00'; // Jika tidak ada jam, set ke akhir hari
      
      const expected = new Date(cleanStr).getTime();
      const now = new Date().getTime();
      
      if (now > expected) {
        const diffTime = now - expected;
        // Hitung selisih hari (dibulatkan ke atas agar lewat 1 menit/jam pun terhitung 1 hari keterlambatan)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return { 
          hari: diffDays, 
          nominal: diffDays * 5000 
        };
      }
      return { hari: 0, nominal: 0 };
    } catch (err) {
      return { hari: 0, nominal: 0 };
    }
  };

  const isTerlambat = (tanggalKembali: string, status: string) => {
    return hitungDenda(tanggalKembali, status).hari > 0;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    let cleanStr = dateString.trim().replace('T', ' ');
    if (cleanStr.length > 16) cleanStr = cleanStr.substring(0, 16);
    
    if (cleanStr.length === 10) {
      const [y, m, d] = cleanStr.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
    }

    const [datePart, timePart] = cleanStr.split(' ');
    const [y, m, d] = datePart.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}, ${timePart} WIB`;
  };

  const getKategoriStatus = (item: any) => {
    if (item.status === 'selesai') return 'Selesai';
    if (isTerlambat(item.tanggal_kembali, item.status)) return 'Terlambat';
    if (item.status === 'dibawa') return 'Sedang disewa';
    if (item.status === 'booking') return 'Akan diambil'; 
    return 'Lainnya';
  };

  const filteredData = sewaList.filter(item => {
    const matchSearch = 
      item.nama_penyewa?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.invoice?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const kategori = getKategoriStatus(item);
    let matchTab = false;
    
    if (activeTab === 'Semua') matchTab = true;
    else if (activeTab === 'Perlu tindakan') {
      const tagihanBelumLunas = ((item.total_harga || 0) - (item.dp || 0) + hitungDenda(item.tanggal_kembali, item.status).nominal) > 0;
      matchTab = kategori === 'Terlambat' || tagihanBelumLunas;
    } else {
      matchTab = kategori === activeTab;
    }

    return matchSearch && matchTab;
  });

  const totalKontrak = sewaList.length;
  const totalTerlambat = sewaList.filter(item => isTerlambat(item.tanggal_kembali, item.status)).length;

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.error("Tidak ada data untuk diekspor!");
      return;
    }

    const dataToExport = filteredData.map(item => {
      const infoDenda = hitungDenda(item.tanggal_kembali, item.status);
      const totalSemua = (item.total_harga || 0) + infoDenda.nominal;
      const sisa = totalSemua - (item.dp || 0);

      return {
        'Invoice': item.invoice,
        'Nama Pelanggan': item.nama_penyewa,
        'No. WA': item.no_wa,
        'Status': getKategoriStatus(item),
        'Tanggal Bawa': formatDate(item.tanggal_bawa),
        'Tanggal Kembali': formatDate(item.tanggal_kembali),
        'Terlambat (Hari)': infoDenda.hari,
        'Denda (Rp)': infoDenda.nominal,
        'Harga Sewa (Rp)': item.total_harga,
        'Total + Denda (Rp)': totalSemua,
        'Sudah Dibayar (Rp)': item.dp,
        'Sisa Tagihan (Rp)': sisa,
        'Jaminan': `${item.jenis_jaminan} - ${item.nomor_jaminan || '-'}`,
        'Kelengkapan': item.kelengkapan || '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    
    const wscols = [
      {wch: 15}, {wch: 25}, {wch: 15}, {wch: 15}, 
      {wch: 20}, {wch: 20}, {wch: 15}, {wch: 15}, 
      {wch: 15}, {wch: 20}, {wch: 15}, {wch: 15},
      {wch: 20}, {wch: 25}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Booking");

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Laporan_Booking_${dateStr}.xlsx`);
    toast.success("Berhasil mengekspor data ke Excel");
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-12 pt-2 w-full max-w-full bg-white">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="text-purple-700" /> Booking
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalKontrak} kontrak terdaftar • {totalTerlambat > 0 ? <span className="text-red-500 font-bold">{totalTerlambat} terlambat</span> : '0 terlambat'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Download size={18} />
            Export Excel
          </button>
        </div>
      </div>

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
            
            // Logika Denda & Tagihan
            const infoDenda = hitungDenda(item.tanggal_kembali, item.status);
            const totalHargaSewa = item.total_harga || 0;
            const sudahDibayar = item.dp || 0;
            const tagihanDenganDenda = totalHargaSewa + infoDenda.nominal;
            const sisaTagihan = tagihanDenganDenda - sudahDibayar;
            const isLunas = sisaTagihan <= 0;

            let badgeStyle = "bg-slate-100 text-slate-600";
            if (kategori === 'Selesai') badgeStyle = "bg-slate-100 text-slate-500";
            if (kategori === 'Akan diambil') badgeStyle = "bg-blue-50 text-blue-600 border border-blue-100";
            if (kategori === 'Sedang disewa') badgeStyle = "bg-purple-50 text-purple-700 border border-purple-100";
            if (kategori === 'Terlambat') badgeStyle = "bg-red-50 text-red-600 border border-red-100";

            return (
              <div key={item.id} className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${infoDenda.hari > 0 ? 'border-red-200' : 'border-purple-200'}`}>
                
                {kategori === 'Terlambat' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                )}

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
                  
                  <div className="flex items-center gap-2">
                    {kategori === 'Akan diambil' && (
                      <button 
                        onClick={() => openConfirmModal(
                          item.id, 
                          'dibawa', 
                          'Konfirmasi Pengambilan', 
                          'Apakah Anda yakin barang ini sudah diambil oleh penyewa? Status pesanan akan otomatis diubah menjadi SEDANG DISEWA.'
                        )}
                        className="text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Package size={14} /> Proses Ambil
                      </button>
                    )}
                    
                    {(kategori === 'Sedang disewa' || kategori === 'Terlambat') && (
                       <Link 
                        href={`/sewa/detail/${item.id}`} 
                        className="text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckSquare size={14} /> Proses Selesai
                      </Link>
                    )}
                    
                    <Link href={`/sewa/edit/${item.id}`} className="text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5" title="Edit Transaksi">
                      <Edit3 size={14} /> Edit
                    </Link>

                    <Link href={`/sewa/detail/${item.id}`} className="text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5">
                      <Eye size={14} /> Detail
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ambil</span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <CalendarDays size={14} className="text-purple-600" />
                      {formatDate(item.tanggal_bawa)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batas Kembali</span>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${kategori === 'Terlambat' ? 'text-red-500' : 'text-slate-700'}`}>
                      <Clock size={14} className={kategori === 'Terlambat' ? 'text-red-500' : 'text-purple-600'} />
                      {formatDate(item.tanggal_kembali)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 col-span-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai & Pembayaran</span>
                      <div className="flex gap-1.5 items-center">
                        {/* MUNCUL JIKA ADA DENDA */}
                        {infoDenda.hari > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-black bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            +{infoDenda.hari} Hari (+Rp {infoDenda.nominal.toLocaleString('id-ID')})
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${isLunas ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isLunas ? 'Lunas' : `Sisa: Rp ${sisaTagihan.toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-black text-purple-700 flex items-center gap-1.5">
                      Rp {tagihanDenganDenda.toLocaleString('id-ID')}
                      {infoDenda.nominal > 0 && <span className="text-xs font-semibold text-slate-500 line-through">Rp {totalHargaSewa.toLocaleString('id-ID')}</span>}
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

      {/* MODAL KONFIRMASI */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-slate-600">
                {confirmModal.message}
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                disabled={isUpdating}
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                disabled={isUpdating}
                onClick={executeUpdateStatus}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                Ya, Lanjutkan
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}