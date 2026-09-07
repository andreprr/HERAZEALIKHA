'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Search, Plus, Eye, Edit, Trash2, CalendarDays, 
  Loader2, CheckCircle, Clock, Package, AlertCircle, CheckSquare, Banknote
} from 'lucide-react';

export default function SewaPage() {
  const [sewaList, setSewaList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSewa();
  }, []);

  const fetchSewa = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sewa')
        .select('id, invoice, nama_penyewa, created_at, total_harga, dp, status, metode_pembayaran, status_pembayaran')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setSewaList(data);
    } catch (error: any) {
      toast.error('Gagal mengambil data sewa.');
    } finally {
      setIsLoading(false);
    }
  };

  // LOGIKA PELUNASAN: Mengubah DP menjadi senilai Total Harga
  const handlePelunasan = async (id: string, totalHarga: number) => {
    if (!window.confirm('Tandai transaksi ini LUNAS? (Customer sudah membayar sisa tagihan)')) return;
    
    try {
      const { error } = await supabase
        .from('sewa')
        .update({ dp: totalHarga })
        .eq('id', id);

      if (error) throw error;

      toast.success('Pembayaran berhasil dilunasi!');
      fetchSewa();
    } catch (error: any) {
      toast.error('Gagal memproses pelunasan.');
    }
  };

  const handleSelesai = async (id: string) => {
    if (!window.confirm('Tandai transaksi selesai? (Barang dikembalikan & stok otomatis bertambah)')) return;
    
    try {
      const { error: updateError } = await supabase.from('sewa').update({ status: 'selesai' }).eq('id', id);
      if (updateError) throw updateError;

      toast.success('Transaksi Selesai! Stok barang otomatis dikembalikan.');
      fetchSewa();
    } catch (error: any) {
      toast.error('Gagal menyelesaikan transaksi.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    
    try {
      const { error } = await supabase.from('sewa').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Data sewa berhasil dihapus!');
      fetchSewa();
    } catch (error: any) {
      toast.error('Gagal menghapus data.');
    }
  };

  const filteredData = sewaList.filter(item => 
    item.nama_penyewa.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.invoice.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const getSewaBadge = (status: string) => {
    switch (status) {
      case 'booked': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase"><Clock size={12}/> Booking</span>;
      case 'dibawa': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-pink-100 text-pink-700 text-[10px] font-bold uppercase"><Package size={12}/> Dibawa</span>;
      case 'selesai': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase"><CheckCircle size={12}/> Selesai</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-8 pt-2 w-full max-w-full overflow-x-hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-800 truncate flex items-center gap-2">
            <CalendarDays className="text-pink-600" /> Daftar Sewa
          </h2>
          <p className="text-sm text-slate-500 mt-1 truncate">Kelola data penyewaan dan pantau status pesanan.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari invoice/nama..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-pink-50 border border-transparent focus:border-pink-500 text-slate-800 outline-none transition-all shadow-sm"
            />
          </div>
          
          <Link href="/sewa/tambah" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm shrink-0">
            <Plus size={18} />
            Sewa Baru
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-pink-200 overflow-hidden flex-1 flex flex-col w-full max-w-full">
        <div className="overflow-x-auto w-full min-h-[400px]">
          <table className="w-full min-w-[1000px] text-left text-sm text-slate-600">
            <thead className="bg-pink-50 text-slate-700 font-semibold border-b border-pink-100">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap w-[20%]">Invoice & Waktu</th>
                <th className="px-6 py-4 w-[20%]">Penyewa</th>
                <th className="px-6 py-4 whitespace-nowrap w-[15%]">Status Sewa</th>
                <th className="px-6 py-4 whitespace-nowrap w-[30%]">Tagihan & Pembayaran</th>
                <th className="px-6 py-4 text-center whitespace-nowrap w-[25%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-pink-600 mx-auto mb-2" size={32} />
                    <p className="text-slate-500">Memuat data sewa...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data penyewaan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const sisaBayar = item.total_harga - (item.dp || 0);
                  const isMenunggu = item.status_pembayaran === 'menunggu';
                  
                  return (
                    <tr key={item.id} className="hover:bg-pink-50/50 transition-colors">
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 mb-1">{item.invoice}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <CalendarDays size={12}/> {formatDate(item.created_at)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 truncate">{item.nama_penyewa}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSewaBadge(item.status)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 w-full max-w-[250px]">
                          <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500">Total / Bayar:</span>
                            <div className="text-right">
                              <span className="font-bold text-slate-800 block">Rp {item.total_harga.toLocaleString('id-ID')}</span>
                              <span className="text-xs text-green-600 font-semibold block">Rp {(item.dp || 0).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-pink-100">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-pink-200 bg-pink-50 text-slate-600">
                                {item.metode_pembayaran || 'Tunai'}
                              </span>
                              {isMenunggu ? (
                                <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5"><AlertCircle size={10}/> Menunggu Verifikasi</span>
                              ) : (
                                <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5"><CheckCircle size={10}/> Diterima</span>
                              )}
                            </div>
                            
                            {sisaBayar > 0 ? (
                              <span className="text-xs font-bold text-red-500">Sisa Rp {sisaBayar.toLocaleString('id-ID')}</span>
                            ) : (
                              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Lunas</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* TOMBOL PELUNASAN (Tampil jika masih ada sisa bayar) */}
                          {sisaBayar > 0 && (
                            <button 
                              onClick={() => handlePelunasan(item.id, item.total_harga)} 
                              className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors shadow-sm" 
                              title="Lunasi Pembayaran"
                            >
                              <Banknote size={16} />
                            </button>
                          )}

                          {/* TOMBOL SELESAI */}
                          {item.status !== 'selesai' && (
                            <button onClick={() => handleSelesai(item.id)} className="p-2 text-slate-400 hover:text-green-500 bg-white hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100" title="Tandai Selesai & Kembalikan Stok">
                              <CheckSquare size={16} />
                            </button>
                          )}

                          <Link href={`/sewa/detail/${item.id}`} className="p-2 text-slate-400 hover:text-blue-500 bg-white hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Lihat Detail">
                            <Eye size={16} />
                          </Link>
                          <Link href={`/sewa/edit/${item.id}`} className="p-2 text-slate-400 hover:text-amber-500 bg-white hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100" title="Edit">
                            <Edit size={16} />
                          </Link>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Hapus">
                            <Trash2 size={16} />
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