'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Plus, X, Wallet, Search, Loader2, Check, Banknote, CalendarDays, ArrowDownToLine, Trash2
} from 'lucide-react';

export default function KasKeluarPage() {
  const [kasKeluarList, setKasKeluarList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State Modal Tambah
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nama: '',
    nominal: '',
    keterangan: ''
  });

  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetchKasKeluar();
    const role = localStorage.getItem('userRole') || 'KASIR';
    setUserRole(role);
  }, []);

  const fetchKasKeluar = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pengeluaran')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKasKeluarList(data || []);
    } catch (error) {
      toast.error('Gagal memuat data kas keluar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTambahKasKeluar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.keterangan || !formData.nominal) {
      return toast.error('Nama, Jumlah Uang, dan Keterangan wajib diisi!');
    }

    setIsSubmitting(true);
    try {
      // Menggabungkan Nama dan Keterangan dengan pemisah " | " agar aman disimpan ke DB
      const mergedKeterangan = `${formData.nama.trim()} | ${formData.keterangan.trim()}`;

      const { error } = await supabase
        .from('pengeluaran')
        .insert([{
          nominal: Number(formData.nominal),
          keterangan: mergedKeterangan,
          tanggal: new Date().toISOString().split('T')[0]
        }]);

      if (error) throw error;

      toast.success('Pengeluaran berhasil dicatat!');
      setIsAddModalOpen(false);
      setFormData({ nama: '', nominal: '', keterangan: '' });
      fetchKasKeluar();

    } catch (error: any) {
      toast.error('Gagal menyimpan data: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Hapus catatan kas keluar ini?`)) return;

    try {
      const { error } = await supabase.from('pengeluaran').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Catatan berhasil dihapus!');
      fetchKasKeluar();
    } catch (error) {
      toast.error('Gagal menghapus data.');
    }
  };

  const filteredData = kasKeluarList.filter(item => 
    item.keterangan?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPengeluaran = filteredData.reduce((acc, curr) => acc + (curr.nominal || 0), 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  // Fungsi untuk memisahkan kembali Nama dan Keterangan saat ditampilkan
  const getDisplayDetails = (rawKeterangan: string) => {
    if (!rawKeterangan) return { nama: 'Pengeluaran', ket: '-' };
    const parts = rawKeterangan.split(' | ');
    if (parts.length > 1) {
      return { nama: parts[0], ket: parts[1] };
    }
    return { nama: 'Kas Keluar', ket: rawKeterangan };
  };

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-5xl mx-auto bg-white/50">
      
      {/* HEADER & TOMBOL TAMBAH */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowDownToLine className="text-red-500" /> Kas Keluar
          </h2>
          <p className="text-slate-500 text-sm mt-1">Catat semua pengeluaran atau biaya operasional</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} /> Tambah Kas Keluar
        </button>
      </div>

      {/* SUMMARY & SEARCH BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Box */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm shrink-0">
            <Banknote size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-0.5">Total Ditampilkan</p>
            <p className="text-2xl font-black text-slate-800">Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Search */}
        <div className="md:col-span-2 relative h-full min-h-[4rem]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama atau keterangan..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full pl-12 pr-4 text-sm rounded-2xl border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-slate-800 shadow-sm outline-none"
          />
        </div>
      </div>

      {/* LIST DATA KAS KELUAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-red-500 mb-4" size={32} />
            <p className="text-slate-500 text-sm">Memuat data kas keluar...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            Belum ada catatan pengeluaran.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {filteredData.map((item) => {
              const { nama, ket } = getDisplayDetails(item.keterangan);
              
              return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-slate-50 transition-colors">
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{nama}</h3>
                      <p className="text-sm text-slate-600 mb-1">{ket}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <CalendarDays size={12} /> {formatDate(item.tanggal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pl-16 sm:pl-0">
                    <div className="text-right">
                      <p className="text-lg font-black text-red-600">
                        - Rp {item.nominal.toLocaleString('id-ID')}
                      </p>
                    </div>
                    
                    {/* Tombol Hapus hanya muncul untuk OWNER */}
                    {userRole === 'OWNER' && (
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                        title="Hapus Catatan"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL TAMBAH KAS KELUAR */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-red-100 bg-red-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ArrowDownToLine size={20} className="text-red-600"/> Form Kas Keluar
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleTambahKasKeluar} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Nama</label>
                <input 
                  type="text" required autoFocus
                  placeholder="Contoh: Budi, PLN, Toko Plastik"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Uang Keluar (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input 
                    type="number" min="1" required
                    placeholder="0"
                    value={formData.nominal}
                    onChange={(e) => setFormData({...formData, nominal: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-lg font-black focus:ring-2 focus:ring-red-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Keterangan</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Contoh: Beli token listrik bulan ini..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3 shrink-0 mt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">Batal</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Check size={18}/>} Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}