'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Scan, Check, Settings2, WashingMachine, ShieldAlert, Loader2, Plus, X, Wallet
} from 'lucide-react';

export default function PerawatanPage() {
  const [perawatanList, setPerawatanList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');

  // State untuk Tambah Perawatan Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [katalogList, setKatalogList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    barang_id: '',
    qty: 1,
    jenis: 'laundry',
    catatan: '',
    biaya: 0 // 🔴 State baru untuk Biaya Operasional
  });

  useEffect(() => {
    fetchPerawatan();
  }, []);

  const fetchPerawatan = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('perawatan')
        .select(`
          *,
          katalog_barang (nama_barang, sku, varian, stok, disewa_count)
        `)
        .eq('status', 'aktif')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPerawatanList(data || []);
    } catch (error) {
      toast.error('Gagal memuat data perawatan');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('katalog_barang')
        .select('id, nama_barang, sku, stok')
        .gt('stok', 0)
        .order('nama_barang', { ascending: true });
        
      if (error) throw error;
      setKatalogList(data || []);
    } catch (error) {
      toast.error('Gagal memuat daftar barang');
    }
  };

  const handleOpenAddModal = () => {
    fetchKatalog();
    setIsAddModalOpen(true);
  };

  // LOGIKA TAMBAH MANUAL
  const handleTambahPerawatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.barang_id) return toast.error('Pilih barang terlebih dahulu!');

    const barang = katalogList.find(k => k.id === formData.barang_id);
    if (!barang) return toast.error('Barang tidak ditemukan');
    if (formData.qty > barang.stok) return toast.error(`Stok maksimal yang tersedia hanya ${barang.stok}`);

    setIsSubmitting(true);
    try {
      // 1. Kurangi stok di katalog (KARENA BARANG MASUK KE RUANG PERAWATAN)
      const { error: errUpdate } = await supabase
        .from('katalog_barang')
        .update({ stok: barang.stok - formData.qty })
        .eq('id', formData.barang_id);

      if (errUpdate) throw errUpdate;

      // 2. Insert ke tabel perawatan
      const { error: errInsert } = await supabase
        .from('perawatan')
        .insert([{
          barang_id: formData.barang_id,
          qty: formData.qty,
          jenis: formData.jenis,
          catatan: formData.catatan || 'Dipindahkan manual dari etalase',
          status: 'aktif'
        }]);

      if (errInsert) throw errInsert;

      // 3. 🔴 OTOMATIS CATAT KE PENGELUARAN JIKA BIAYA > 0
      if (formData.biaya > 0) {
        const { error: errPengeluaran } = await supabase
          .from('pengeluaran')
          .insert([{
            nominal: formData.biaya,
            kategori: 'Perawatan/Laundry',
            tanggal: new Date().toISOString().split('T')[0],
            keterangan: `Biaya ${formData.jenis} untuk ${formData.qty}x ${barang.nama_barang}. ${formData.catatan}`
          }]);
        
        if (errPengeluaran) throw errPengeluaran;
      }

      toast.success('Barang dipindahkan ke perawatan & biaya tercatat!');
      setIsAddModalOpen(false);
      setFormData({ barang_id: '', qty: 1, jenis: 'laundry', catatan: '', biaya: 0 });
      fetchPerawatan();

    } catch (error: any) {
      toast.error('Gagal memproses data: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // LOGIKA SELESAI
  const handleSelesaiPerawatan = async (id: string, barangId: string, qty: number, namaBarang: string) => {
    if (!window.confirm(`Selesaikan perawatan untuk "${namaBarang}" dan kembalikan ke stok siap sewa?`)) return;

    try {
      const { error: errPerawatan } = await supabase
        .from('perawatan')
        .update({ status: 'selesai' })
        .eq('id', id);

      if (errPerawatan) throw errPerawatan;
      
      const { data: kb } = await supabase
        .from('katalog_barang')
        .select('stok')
        .eq('id', barangId)
        .single();
        
      if (kb) {
        await supabase
          .from('katalog_barang')
          .update({ stok: kb.stok + qty })
          .eq('id', barangId);
      }

      toast.success('Barang selesai dirawat & kembali ke etalase kasir!');
      fetchPerawatan();
    } catch (error) {
      toast.error('Gagal memproses pengembalian stok');
    }
  };

  const filteredData = perawatanList.filter(item => {
    const matchSearch = 
      item.katalog_barang?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.katalog_barang?.nama_barang?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchTab = activeTab === 'Semua' || item.jenis.toLowerCase() === activeTab.toLowerCase();
    
    return matchSearch && matchTab;
  });

  const countSemua = perawatanList.length;
  const countKarantina = perawatanList.filter(i => i.jenis.toLowerCase() === 'karantina').length;
  const countLaundry = perawatanList.filter(i => i.jenis.toLowerCase() === 'laundry').length;
  const countPerbaikan = perawatanList.filter(i => i.jenis.toLowerCase() === 'perbaikan').length;

  const totalHelai = perawatanList.reduce((acc, curr) => acc + (curr.qty || 1), 0);

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-5xl mx-auto bg-white/50">
      
      {/* HEADER & TOMBOL TAMBAH */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Perawatan</h2>
          <p className="text-slate-500 text-sm mt-1">{totalHelai} helai sedang tidak siap disewakan</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} /> Tambah Manual
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative w-full">
        <Scan className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Pindai kode helai (mis. U0042) atau nama barang..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-4 text-sm rounded-xl border border-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-slate-800 shadow-sm"
        />
      </div>

      {/* TABS FILTER */}
      <div className="flex flex-wrap items-center gap-3">
        <button 
          onClick={() => setActiveTab('Semua')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
            activeTab === 'Semua' ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {activeTab === 'Semua' && <Check size={16} />} Semua ({countSemua})
        </button>

        <button 
          onClick={() => setActiveTab('Karantina')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
            activeTab === 'Karantina' ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {activeTab === 'Karantina' ? <Check size={16} /> : <ShieldAlert size={16} />} Karantina ({countKarantina})
        </button>

        <button 
          onClick={() => setActiveTab('Laundry')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
            activeTab === 'Laundry' ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {activeTab === 'Laundry' ? <Check size={16} /> : <WashingMachine size={16} />} Laundry ({countLaundry})
        </button>

        <button 
          onClick={() => setActiveTab('Perbaikan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
            activeTab === 'Perbaikan' ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {activeTab === 'Perbaikan' ? <Check size={16} /> : <Settings2 size={16} />} Perbaikan ({countPerbaikan})
        </button>
      </div>

      {/* LIST DATA PERAWATAN */}
      <div className="flex flex-col mt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-purple-700 mb-4" size={32} />
            <p className="text-slate-500 text-sm">Memuat data...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
            Tidak ada barang dalam daftar {activeTab}.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-200">
            {filteredData.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-4 hover:bg-slate-50 transition-colors px-2 rounded-lg">
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    item.jenis.toLowerCase() === 'perbaikan' ? 'bg-blue-50 text-blue-600' : 
                    item.jenis.toLowerCase() === 'laundry' ? 'bg-indigo-50 text-indigo-600' : 
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {item.jenis.toLowerCase() === 'perbaikan' ? <Settings2 size={24} /> : 
                     item.jenis.toLowerCase() === 'laundry' ? <WashingMachine size={24} /> : 
                     <ShieldAlert size={24} />}
                  </div>

                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-800">
                      {item.katalog_barang?.sku || 'TANPA-SKU'} · {item.katalog_barang?.nama_barang}
                    </h3>
                    <p className="text-[13px] text-slate-500 mt-0.5">
                      {item.katalog_barang?.varian || '-'} · Qty: {item.qty}x · 
                      <span className="text-purple-600 font-bold ml-1">
                        Disewa {item.katalog_barang?.disewa_count || 0}x
                      </span>
                    </p>
                    {item.catatan && (
                       <p className="text-xs text-slate-400 mt-1 italic">"{item.catatan}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-16 sm:pl-0">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    item.jenis.toLowerCase() === 'perbaikan' ? 'bg-blue-100 text-blue-700' : 
                    item.jenis.toLowerCase() === 'laundry' ? 'bg-indigo-100 text-indigo-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {item.jenis}
                  </span>
                  
                  <button 
                    onClick={() => handleSelesaiPerawatan(item.id, item.barang_id, item.qty, item.katalog_barang?.nama_barang)}
                    className="px-6 py-2.5 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-xl text-sm font-bold transition-colors"
                  >
                    Pindahkan
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL TAMBAH PERAWATAN MANUAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-purple-100 bg-purple-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert size={20} className="text-pink-600"/> Pindahkan ke Perawatan
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleTambahPerawatan} className="p-6 space-y-4 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                Memindahkan barang ke sini akan <b>otomatis mengurangi stok</b> yang ada di etalase/kasir.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Pilih Barang Etalase</label>
                <select 
                  required
                  value={formData.barang_id}
                  onChange={(e) => setFormData({...formData, barang_id: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="" disabled>-- Pilih barang yang tersedia --</option>
                  {katalogList.map(b => (
                    <option key={b.id} value={b.id}>{b.sku} - {b.nama_barang} (Tersedia: {b.stok})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Jumlah (Qty)</label>
                  <input 
                    type="number" min="1" required
                    value={formData.qty}
                    onChange={(e) => setFormData({...formData, qty: Number(e.target.value)})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Kondisi</label>
                  <select 
                    value={formData.jenis}
                    onChange={(e) => setFormData({...formData, jenis: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="laundry">🧺 Laundry</option>
                    <option value="perbaikan">🔧 Perbaikan</option>
                    <option value="karantina">⚠️ Karantina</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                  <Wallet size={14}/> Biaya Perawatan / Operasional (Rp)
                </label>
                <input 
                  type="number" min="0" placeholder="0"
                  value={formData.biaya}
                  onChange={(e) => setFormData({...formData, biaya: Number(e.target.value)})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-700"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">*Jika diisi, akan otomatis tercatat ke Laporan Pengeluaran.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Keterangan / Catatan</label>
                <input 
                  type="text" placeholder="Contoh: Ditemukan robek di lemari..."
                  value={formData.catatan}
                  onChange={(e) => setFormData({...formData, catatan: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">Batal</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
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