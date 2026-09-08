'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Search, Loader2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StokOpnamePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [katalog, setKatalog] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua kategori');

  // Opname State: menyimpan input fisik dari user (key: id barang, value: angka fisik)
  const [opnameInput, setOpnameInput] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchKatalog();
  }, []);

  const fetchKatalog = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('katalog_barang')
        .select('*')
        .order('nama_barang', { ascending: true });

      if (error) throw error;
      
      const items = data || [];
      setKatalog(items);

      // Ekstrak kategori unik jika kolom kategori ada, jika tidak abaikan
      const categories = new Set<string>();
      items.forEach(item => {
        if (item.kategori) categories.add(item.kategori);
      });
      setKategoriList(Array.from(categories));

    } catch (error) {
      toast.error('Gagal memuat data katalog.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setOpnameInput(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSimpanSinkronisasi = async () => {
    // Ambil item yang sudah diisi dan ada perbedaan dengan sistem
    const itemUntukDisinkron = katalog.filter(item => {
      const inputFisik = opnameInput[item.id];
      if (inputFisik === undefined || inputFisik === '') return false;
      return parseInt(inputFisik) !== item.stok;
    });

    if (itemUntukDisinkron.length === 0) {
      return toast('Tidak ada selisih stok yang perlu disinkronisasi.', { icon: 'ℹ️' });
    }

    if (!window.confirm(`Ada ${itemUntukDisinkron.length} barang yang stoknya akan diubah menyesuaikan fisik. Lanjutkan?`)) return;

    setIsSaving(true);
    try {
      for (const item of itemUntukDisinkron) {
        const stokBaru = parseInt(opnameInput[item.id]);
        const { error } = await supabase
          .from('katalog_barang')
          .update({ stok: stokBaru })
          .eq('id', item.id);
        
        if (error) throw error;
      }

      toast.success('Stok berhasil disinkronisasi!');
      setOpnameInput({}); // Reset form
      fetchKatalog(); // Refresh data sistem
    } catch (error) {
      toast.error('Gagal menyinkronkan stok.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Data
  const filteredData = katalog.filter(item => {
    const matchSearch = 
      item.nama_barang?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.varian?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchKategori = selectedKategori === 'Semua kategori' || item.kategori === selectedKategori;
    
    return matchSearch && matchKategori;
  });

  // Hitung Statistik
  const totalVarian = katalog.length;
  let sudahDihitung = 0;
  let adaSelisih = 0;

  katalog.forEach(item => {
    const inputFisik = opnameInput[item.id];
    if (inputFisik !== undefined && inputFisik !== '') {
      sudahDihitung++;
      if (parseInt(inputFisik) !== item.stok) {
        adaSelisih++;
      }
    }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Stok Opname</h1>
        <p className="text-slate-500 mt-1">{totalVarian} varian · {sudahDihitung}/{totalVarian} sudah dihitung</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari produk, SKU, ukuran, warna..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
        
        {kategoriList.length > 0 && (
          <select 
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-500"
          >
            <option value="Semua kategori">Semua kategori</option>
            {kategoriList.map((kat, idx) => (
              <option key={idx} value={kat}>{kat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Ringkasan */}
      <div className="flex flex-wrap gap-12 bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm text-sm">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Varian</p>
          <p className="text-xl font-black text-slate-800">{totalVarian}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sudah Dihitung</p>
          <p className="text-xl font-black text-slate-800">{sudahDihitung}<span className="text-slate-400 text-sm font-semibold">/{totalVarian}</span></p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ada Selisih</p>
          <p className={`text-xl font-black ${adaSelisih > 0 ? 'text-red-600' : 'text-slate-800'}`}>{adaSelisih}</p>
        </div>
      </div>

      {/* List Opname */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mb-3 text-purple-600" size={32} />
            Memuat data katalog...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Produk yang dicari tidak ditemukan.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {filteredData.map((item) => {
              const inputFisik = opnameInput[item.id];
              const isFilled = inputFisik !== undefined && inputFisik !== '';
              const numInput = parseInt(inputFisik);
              const isSelisih = isFilled && numInput !== item.stok;
              const isMatch = isFilled && numInput === item.stok;

              return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px]">{item.nama_barang}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5 uppercase">
                      {item.sku || 'TANPA SKU'} <span className="mx-1.5 font-normal">·</span> {item.varian || '-'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 self-end sm:self-auto">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Sistem</p>
                      <p className="text-lg font-black text-slate-800">{item.stok}</p>
                    </div>

                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        placeholder="?"
                        value={inputFisik !== undefined ? inputFisik : ''}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        className={`w-20 sm:w-24 h-12 text-center text-lg font-bold border-2 rounded-xl focus:outline-none focus:ring-0 transition-colors placeholder:text-slate-300
                          ${!isFilled ? 'border-slate-200 bg-white text-slate-800 focus:border-purple-400' : 
                            isSelisih ? 'border-red-400 bg-red-50 text-red-700' : 
                            'border-green-400 bg-green-50 text-green-700'
                          }
                        `}
                      />
                      {isMatch && <CheckCircle2 size={16} className="absolute -right-2 -top-2 text-green-500 bg-white rounded-full" />}
                      {isSelisih && <AlertCircle size={16} className="absolute -right-2 -top-2 text-red-500 bg-white rounded-full" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {sudahDihitung > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
          <div className="bg-white p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 pointer-events-auto flex items-center gap-4">
            <div className="px-2">
              <p className="text-xs text-slate-500 font-semibold">{adaSelisih} barang perlu disinkron</p>
            </div>
            <button 
              onClick={handleSimpanSinkronisasi}
              disabled={isSaving || adaSelisih === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all
                ${adaSelisih > 0 
                  ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Sesuaikan Stok Sistem
            </button>
          </div>
        </div>
      )}

    </div>
  );
}