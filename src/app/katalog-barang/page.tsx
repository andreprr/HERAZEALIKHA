'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Search, Plus, Edit, Trash2, Box, Image as ImageIcon, 
  Tag, Loader2, Filter
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
      const { data, error } = await supabase
        .from('katalog_barang')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setBarangList(data);
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

  // Logika Pencarian & Filter
  const filteredData = barangList.filter(item => {
    const matchSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKategori = filterKategori === '' || item.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  return (
    <div className="flex flex-col gap-6 h-full pb-8 pt-2 w-full max-w-full overflow-x-hidden">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-800 truncate flex items-center gap-2">
            <Box className="text-pink-600" /> Katalog Barang
          </h2>
          <p className="text-sm text-slate-500 mt-1 truncate">Kelola daftar gaun, kebaya, jas, dan perlengkapan lainnya.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Input Pencarian */}
          <div className="relative flex-1 sm:w-64 min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari nama barang..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-white shadow-sm border border-pink-200 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all text-slate-800"
            />
          </div>
          
          {/* Dropdown Kategori */}
          <div className="relative w-full sm:w-48 shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-white shadow-sm border border-pink-200 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all text-slate-800 appearance-none cursor-pointer truncate"
            >
              <option value="">Semua Kategori</option>
              {kategoriList.map(kat => (
                <option key={kat.id} value={kat.nama}>{kat.nama}</option>
              ))}
            </select>
          </div>
          
          {/* Tombol Tambah */}
          <Link href="/katalog-barang/tambah" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm shrink-0">
            <Plus size={18} />
            Tambah Barang
          </Link>
        </div>
      </div>

      {/* GRID KATALOG */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-pink-600 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-medium">Memuat katalog barang...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-pink-200 p-12 text-center flex flex-col items-center">
          <Box className="text-pink-200 mb-4" size={60} />
          <h3 className="text-lg font-bold text-slate-700">Barang Tidak Ditemukan</h3>
          <p className="text-slate-500 text-sm mt-1">Coba sesuaikan kata kunci pencarian atau kategori Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-5">
          {filteredData.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-pink-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              
              {/* Gambar Barang */}
              <div className="relative w-full aspect-[4/5] bg-pink-50 border-b border-pink-100 flex items-center justify-center overflow-hidden">
                {item.gambar_url ? (
                  <img 
                    src={item.gambar_url} 
                    alt={item.nama_barang} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                ) : (
                  <div className="flex flex-col items-center text-pink-300">
                    <ImageIcon size={40} className="mb-2" />
                    <span className="text-xs font-semibold">Tanpa Foto</span>
                  </div>
                )}
                
                {/* Badge Kategori */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm border border-pink-100 flex items-center gap-1">
                  <Tag size={12} className="text-pink-600" />
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{item.kategori}</span>
                </div>
              </div>

              {/* Detail Barang */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight mb-2">
                  {item.nama_barang}
                </h3>
                
                {/* INI BAGIAN STOK YANG BARU DITAMBAHKAN */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded-md ${
                    item.stok > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <Box size={12} />
                    {item.stok > 0 ? `Sisa Stok: ${item.stok}` : 'Stok Habis'}
                  </span>
                </div>

                <div className="mt-auto">
                  <p className="text-[10px] text-slate-500 mb-0.5">Harga Sewa</p>
                  <p className="font-black text-pink-600 text-lg leading-none mb-4">
                    Rp {item.harga.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Tombol Aksi */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-pink-100 mt-auto">
                  <Link 
                    href={`/katalog-barang/edit/${item.id}`} 
                    className="flex items-center justify-center gap-1.5 p-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Edit size={14} /> Edit
                  </Link>
                  <button 
                    onClick={() => handleDelete(item.id, item.nama_barang)}
                    className="flex items-center justify-center gap-1.5 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Trash2 size={14} /> Hapus
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