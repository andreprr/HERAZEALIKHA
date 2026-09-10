'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Search, Plus, Edit, Trash2, Box, Image as ImageIcon, 
  Tag, Loader2, Filter, PackageCheck, Ruler, Hash
} from 'lucide-react';

export default function KatalogBarangPage() {
  const [barangList, setBarangList] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');

  useEffect(() => {
    fetchBarang();
    fetchKategori();
  }, []);

  const fetchBarang = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil Data Katalog
      const { data: brg, error: errBrg } = await supabase
        .from('katalog_barang')
        .select('*')
        .order('created_at', { ascending: false });

      if (errBrg) throw errBrg;

      // 2. Ambil Transaksi Aktif untuk menghitung berapa yang sedang disewa
      const { data: activeRentals, error: errRentals } = await supabase
        .from('sewa')
        .select('id, status, sewa_items(barang_id, qty)')
        .in('status', ['booking', 'dibawa', 'terlambat']);

      if (errRentals) throw errRentals;

      // 3. Gabungkan Data (Hitung Sedang Disewa)
      const processedBrg = (brg || []).map(item => {
        let sedangDisewaQty = 0;

        activeRentals?.forEach(rental => {
          const rentedItems = rental.sewa_items.filter((si: any) => si.barang_id === item.id);
          rentedItems.forEach(rentedItem => {
            sedangDisewaQty += rentedItem.qty;
          });
        });

        return { ...item, sedang_disewa: sedangDisewaQty };
      });

      setBarangList(processedBrg);
    } catch (error: any) {
      toast.error('Gagal mengambil data barang.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKategori = async () => {
    const { data } = await supabase.from('kategori').select('*').order('nama', { ascending: true });
    if (data) setKategoriList(data);
  };

  const handleDelete = async (id: string, namaBarang: string) => {
    if (!window.confirm(`Hapus "${namaBarang}" dari katalog? Data yang dihapus tidak bisa dikembalikan.`)) return;
    
    try {
      const { error } = await supabase.from('katalog_barang').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Barang berhasil dihapus!');
      fetchBarang();
    } catch (error: any) {
      toast.error('Gagal menghapus barang.');
    }
  };

  // Logika Pencarian & Filter (Bisa mencari berdasarkan Nama atau SKU)
  const filteredData = barangList.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      item.nama_barang?.toLowerCase().includes(searchLower) || 
      item.sku?.toLowerCase().includes(searchLower);
    
    const matchKategori = filterKategori === '' || item.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  return (
    <div className="flex flex-col gap-6 h-full pb-8 pt-2 w-full max-w-full overflow-x-hidden bg-white">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-800 truncate flex items-center gap-2">
            <Box className="text-purple-700" /> Katalog Barang
          </h2>
          <p className="text-sm text-slate-500 mt-1 truncate">Kelola daftar gaun, kebaya, jas, dan perlengkapan lainnya.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Input Pencarian */}
          <div className="relative flex-1 sm:w-64 min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari nama atau SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-purple-50/50 border border-purple-200 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all text-slate-800"
            />
          </div>
          
          {/* Dropdown Kategori */}
          <div className="relative w-full sm:w-48 shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-purple-50/50 border border-purple-200 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all text-slate-800 appearance-none cursor-pointer truncate"
            >
              <option value="">Semua Kategori</option>
              {kategoriList.map(kat => (
                <option key={kat.id} value={kat.nama}>{kat.nama}</option>
              ))}
            </select>
          </div>
          
          {/* Tombol Tambah */}
          <Link href="/katalog-barang/tambah" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm shrink-0">
            <Plus size={18} />
            Tambah Barang
          </Link>
        </div>
      </div>

      {/* GRID KATALOG */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white">
          <Loader2 className="animate-spin text-purple-700 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-medium">Memuat katalog barang...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-12 text-center flex flex-col items-center">
          <Box className="text-purple-200 mb-4" size={60} />
          <h3 className="text-lg font-bold text-slate-700">Barang Tidak Ditemukan</h3>
          <p className="text-slate-500 text-sm mt-1">Coba sesuaikan kata kunci pencarian atau kategori Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredData.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              
              {/* Gambar Barang */}
              <div className="relative w-full h-40 bg-purple-50/50 border-b border-purple-100 flex items-center justify-center overflow-hidden shrink-0">
                {item.gambar_url ? (
                  <img 
                    src={item.gambar_url} 
                    alt={item.nama_barang} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                ) : (
                  <div className="flex flex-col items-center text-purple-300">
                    <ImageIcon size={32} className="mb-2" />
                    <span className="text-[10px] font-semibold">Tanpa Foto</span>
                  </div>
                )}
                
                {/* Badge Kategori */}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm border border-purple-100 flex items-center gap-1">
                  <Tag size={10} className="text-purple-700" />
                  <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">{item.kategori}</span>
                </div>
              </div>

              {/* Detail Barang */}
              <div className="p-3.5 flex flex-col flex-1">
                <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight mb-2" title={item.nama_barang}>
                  {item.nama_barang}
                </h3>
                
                {/* Rincian Spesifikasi */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                    <Hash size={12} className="text-slate-400" />
                    <span className="truncate">SKU: <span className="font-bold text-slate-700">{item.sku || '-'}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                    <Ruler size={12} className="text-slate-400" />
                    <span className="truncate">Varian/Ukuran: <span className="font-bold text-slate-700">{item.varian || '-'}</span></span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[10px] text-slate-600 font-medium">
                    <PackageCheck size={12} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-tight" title={item.kelengkapan}>
                      Kelengkapan: <span className="font-semibold text-slate-700">{item.kelengkapan || '-'}</span>
                    </span>
                  </div>
                </div>
                
                {/* 🔴 MENGGANTIKAN STOK MENJADI STATUS SEDANG DISEWA */}
                <div className="flex items-center gap-2 mb-3">
                  {item.sedang_disewa > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md">
                      <PackageCheck size={12} />
                      Sedang disewa: {item.sedang_disewa}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">
                      <Box size={12} />
                      Belum ada penyewa
                    </span>
                  )}
                </div>

                {/* HARGA SEWA */}
                <div className="mt-auto">
                  <p className="text-[10px] font-bold text-slate-500 mb-0.5">Harga Sewa</p>
                  <p className="font-black text-purple-700 text-base leading-none mb-3">
                    Rp {(item.harga || 0).toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Tombol Aksi */}
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-purple-100 mt-auto">
                  <Link 
                    href={`/katalog-barang/edit/${item.id}`} 
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors"
                  >
                    <Edit size={12} /> Edit
                  </Link>
                  <button 
                    onClick={() => handleDelete(item.id, item.nama_barang)}
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-bold transition-colors"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}