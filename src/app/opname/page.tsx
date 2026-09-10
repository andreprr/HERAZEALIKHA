'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Search, Loader2, Save, AlertCircle, CheckCircle2, Image as ImageIcon, Package } from 'lucide-react';

export default function StokOpnamePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [katalog, setKatalog] = useState<any[]>([]);
  const [rentedItems, setRentedItems] = useState<Record<string, number>>({});
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua kategori');

  // Opname State (Menyimpan jumlah FISIK DI TOKO)
  const [opnameInput, setOpnameInput] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil Data Katalog
      const { data: katalogData, error: katalogError } = await supabase
        .from('katalog_barang')
        .select('*')
        .order('nama_barang', { ascending: true });

      if (katalogError) throw katalogError;
      const items = katalogData || [];
      setKatalog(items);

      const categories = new Set<string>();
      items.forEach(item => {
        if (item.kategori) categories.add(item.kategori);
      });
      setKategoriList(Array.from(categories));

      // 2. Ambil Transaksi Aktif (Sedang Disewa / Terlambat)
      const { data: activeSewa } = await supabase
        .from('sewa')
        .select('id')
        .in('status', ['dibawa', 'terlambat']);

      const activeSewaIds = activeSewa?.map(s => s.id) || [];
      
      // 3. Ambil Item yang Sedang Disewa
      let rentedMap: Record<string, number> = {};
      if (activeSewaIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('sewa_items')
          .select('*')
          .in('sewa_id', activeSewaIds);

        itemsData?.forEach(it => {
          const idKatalog = it.katalog_id || it.barang_id || it.katalog_barang_id; 
          if (idKatalog) {
            rentedMap[idKatalog] = (rentedMap[idKatalog] || 0) + (it.qty || 0);
          }
        });
      }
      setRentedItems(rentedMap);

    } catch (error) {
      toast.error('Gagal memuat data opname.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setOpnameInput(prev => ({ ...prev, [id]: value }));
  };

  const handleSimpanSinkronisasi = async () => {
    const itemUntukDisinkron = katalog.filter(item => {
      const inputFisik = opnameInput[item.id];
      if (inputFisik === undefined || inputFisik === '') return false;
      
      const disewa = rentedItems[item.id] || 0;
      const seharusnyaDiToko = item.stok - disewa;
      
      return parseInt(inputFisik) !== seharusnyaDiToko;
    });

    if (itemUntukDisinkron.length === 0) {
      return toast('Tidak ada selisih stok yang perlu disinkronisasi.', { icon: 'ℹ️' });
    }

    if (!window.confirm(`Ada ${itemUntukDisinkron.length} barang yang stoknya akan disesuaikan. Lanjutkan?`)) return;

    setIsSaving(true);
    try {
      for (const item of itemUntukDisinkron) {
        const fisikDiToko = parseInt(opnameInput[item.id]);
        const disewa = rentedItems[item.id] || 0;
        
        // TOTAL STOK BARU = Fisik di Toko + Sedang Disewa
        const totalStokBaru = fisikDiToko + disewa; 

        const { error } = await supabase
          .from('katalog_barang')
          .update({ stok: totalStokBaru })
          .eq('id', item.id);
        
        if (error) throw error;
      }

      toast.success('Stok berhasil disinkronisasi!');
      setOpnameInput({});
      fetchData(); 
    } catch (error) {
      toast.error('Gagal menyinkronkan stok.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = katalog.filter(item => {
    const matchSearch = 
      item.nama_barang?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKategori = selectedKategori === 'Semua kategori' || item.kategori === selectedKategori;
    return matchSearch && matchKategori;
  });

  const totalVarian = katalog.length;
  let sudahDihitung = 0;
  let adaSelisih = 0;

  katalog.forEach(item => {
    const inputFisik = opnameInput[item.id];
    if (inputFisik !== undefined && inputFisik !== '') {
      sudahDihitung++;
      const disewa = rentedItems[item.id] || 0;
      const seharusnyaDiToko = item.stok - disewa;
      if (parseInt(inputFisik) !== seharusnyaDiToko) {
        adaSelisih++;
      }
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 pt-2">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-purple-700" /> Stok Opname
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Hitung fisik barang yang <b className="text-slate-700">ada di toko</b> (Abaikan yang sedang disewa).</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-purple-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama produk, SKU..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 font-medium"
          />
        </div>
        
        {kategoriList.length > 0 && (
          <select 
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="px-4 py-3 text-sm border border-purple-200 bg-slate-50 rounded-xl focus:outline-none focus:border-purple-500 font-bold text-slate-700"
          >
            <option value="Semua kategori">Semua Kategori</option>
            {kategoriList.map((kat, idx) => (
              <option key={idx} value={kat}>{kat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Varian</p>
          <p className="text-2xl font-black text-slate-800">{totalVarian}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sudah Dihitung</p>
          <p className="text-2xl font-black text-purple-700">{sudahDihitung}<span className="text-slate-400 text-sm font-semibold">/{totalVarian}</span></p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-center items-center text-center transition-colors ${adaSelisih > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-purple-200'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${adaSelisih > 0 ? 'text-red-500' : 'text-slate-400'}`}>Ada Selisih</p>
          <p className={`text-2xl font-black ${adaSelisih > 0 ? 'text-red-600' : 'text-slate-800'}`}>{adaSelisih}</p>
        </div>
      </div>

      {/* Grid Katalog Opname */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-purple-200">
          <Loader2 className="animate-spin mb-4 text-purple-600" size={40} />
          <p className="text-slate-500 font-medium">Memuat katalog & sinkronisasi sewa...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-purple-200 text-slate-500 font-medium">
          Produk yang dicari tidak ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredData.map((item) => {
            const disewa = rentedItems[item.id] || 0;
            const seharusnyaDiToko = item.stok - disewa;
            
            const inputFisik = opnameInput[item.id];
            const isFilled = inputFisik !== undefined && inputFisik !== '';
            const numInput = parseInt(inputFisik);
            
            const isSelisih = isFilled && numInput !== seharusnyaDiToko;
            const isMatch = isFilled && numInput === seharusnyaDiToko;

            let imageSrc = item.gambar_url;
            if (typeof imageSrc === 'string' && imageSrc.startsWith('[')) {
              try {
                const parsed = JSON.parse(imageSrc);
                imageSrc = parsed[0]; 
              } catch(e) {}
            }

            return (
              <div key={item.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${isSelisih ? 'border-red-400 ring-1 ring-red-400' : isMatch ? 'border-green-400 ring-1 ring-green-400' : 'border-purple-100'}`}>
                
                {/* Foto Produk */}
                <div className="aspect-square bg-slate-100 relative group border-b border-purple-50">
                  {imageSrc ? (
                    <img src={imageSrc} alt={item.nama_barang} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon size={32} className="mb-2 opacity-50" />
                      <span className="text-[10px] font-bold">NO IMAGE</span>
                    </div>
                  )}
                </div>

                {/* Info Produk */}
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug mb-1">{item.nama_barang}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-auto">
                    {item.sku || 'NO SKU'} • {item.varian || 'ALL SIZE'}
                  </p>
                  
                  {/* Rincian Stok (Total | Disewa | Di Toko) */}
                  <div className="flex justify-between items-center mt-3 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100 divide-x divide-slate-200">
                    <div className="text-center flex-1 px-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Milik</p>
                      <p className="text-sm font-black text-slate-700">{item.stok}</p>
                    </div>
                    <div className="text-center flex-1 px-1">
                      <p className="text-[9px] font-bold text-orange-400 uppercase">Disewa</p>
                      <p className="text-sm font-black text-orange-500">{disewa}</p>
                    </div>
                    <div className="text-center flex-1 px-1">
                      <p className="text-[9px] font-bold text-purple-500 uppercase">Di Toko</p>
                      <p className="text-sm font-black text-purple-700">{seharusnyaDiToko}</p>
                    </div>
                  </div>

                  {/* Input Fisik */}
                  <div className="relative mt-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Fisik di Toko (Aktual):</label>
                    <input 
                      type="number"
                      min="0"
                      placeholder="?"
                      value={inputFisik !== undefined ? inputFisik : ''}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className={`w-full h-11 text-center text-lg font-black border-2 rounded-xl focus:outline-none transition-colors placeholder:text-slate-300 placeholder:font-normal
                        ${!isFilled ? 'border-slate-200 bg-white text-slate-800 focus:border-purple-400' : 
                          isSelisih ? 'border-red-400 bg-red-50 text-red-700' : 
                          'border-green-400 bg-green-50 text-green-700'
                        }
                      `}
                    />
                    {isMatch && <CheckCircle2 size={20} className="absolute right-3 bottom-3 text-green-500" />}
                    {isSelisih && <AlertCircle size={20} className="absolute right-3 bottom-3 text-red-500" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      {sudahDihitung > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
          <div className="bg-slate-900/90 backdrop-blur-md p-2 pl-5 rounded-2xl shadow-2xl border border-slate-700 pointer-events-auto flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-300 font-bold">{adaSelisih} selisih fisik toko</p>
            </div>
            <button 
              onClick={handleSimpanSinkronisasi}
              disabled={isSaving || adaSelisih === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all
                ${adaSelisih > 0 
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Sesuaikan Sistem
            </button>
          </div>
        </div>
      )}

    </div>
  );
}