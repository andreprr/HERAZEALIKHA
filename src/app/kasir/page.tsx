'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Search, Plus, Minus, ShoppingCart, User, 
  Save, Package, Loader2, Store, ShieldCheck, Lock, Upload
} from 'lucide-react';

export default function KasirPage() {
  const router = useRouter();

  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [katalog, setKatalog] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKategori, setActiveKategori] = useState('Semua');

  // Cart & Transaction State
  const [cart, setCart] = useState<any[]>([]);
  const [namaPenyewa, setNamaPenyewa] = useState('');
  const [noWa, setNoWa] = useState('');
  
  // State Jaminan
  const [jenisJaminan, setJenisJaminan] = useState('KTP');
  const [nomorJaminan, setNomorJaminan] = useState('');

  // STATE TANGGAL & JAM
  const [tanggalBawa, setTanggalBawa] = useState(new Date().toISOString().split('T')[0]);
  const [jamBawa, setJamBawa] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  const [tanggalKembali, setTanggalKembali] = useState('');
  const [jamKembali, setJamKembali] = useState('17:00'); // Default jam kembali (sore)

  const [dp, setDp] = useState<number | ''>('');
  const [metodePembayaran, setMetodePembayaran] = useState('Tunai');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Upload Bukti Pembayaran
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');

  useEffect(() => {
    const shiftStatus = localStorage.getItem('herazealikha_shift_status');
    if (shiftStatus === 'open') {
      setIsShiftOpen(true);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: brg } = await supabase.from('katalog_barang').select('*').gt('stok', 0).order('nama_barang');
      const { data: kat } = await supabase.from('kategori').select('*').order('nama');
      
      if (brg) setKatalog(brg);
      if (kat) setKategoriList([{ nama: 'Semua' }, ...kat]);
    } catch (error) {
      toast.error('Gagal mengambil data katalog');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredKatalog = katalog.filter(item => {
    const matchSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKategori = activeKategori === 'Semua' || item.kategori === activeKategori;
    return matchSearch && matchKategori;
  });

  const addToCart = (barang: any) => {
    const existing = cart.find(item => item.id === barang.id);
    if (existing) {
      if (existing.qty >= barang.stok) return toast.error('Stok tidak mencukupi!');
      setCart(cart.map(item => item.id === barang.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...barang, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const barangAsli = katalog.find(b => b.id === id);
    
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== id));
      return;
    }
    if (newQty > barangAsli.stok) return toast.error('Stok maksimal tercapai!');
    
    setCart(cart.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };

  // Kompres Gambar Otomatis
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 900;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return toast.error('Gagal mengompres gambar.');
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          setCompressedFile(compressed);
          setPreviewImage(URL.createObjectURL(compressed));
        }, 'image/jpeg', 0.7);
      };
    };
  };

  const totalHarga = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  const sisaBayar = totalHarga - (Number(dp) || 0);

  const handleSimpanKasir = async () => {
    const shiftStatus = localStorage.getItem('herazealikha_shift_status');
    if (shiftStatus !== 'open') {
      toast.error('Kasir sedang ditutup! Harap buka shift terlebih dahulu.');
      setIsShiftOpen(false);
      return;
    }

    if (cart.length === 0) return toast.error('Keranjang kosong!');
    if (!namaPenyewa) return toast.error('Nama pelanggan wajib diisi!');
    if (!tanggalKembali) return toast.error('Tanggal kembali wajib diisi!');
    if (!jamKembali) return toast.error('Jam kembali wajib diisi!');

    setIsSubmitting(true);
    const statusPemb = metodePembayaran === 'Tunai' ? 'diterima' : 'menunggu';
    
    // Format gabungan tanggal & jam untuk disimpan ke database
    const waktuBawa = `${tanggalBawa} ${jamBawa}`;
    const waktuKembali = `${tanggalKembali} ${jamKembali}`;
    
    try {
      const invoice = `KSR-${Date.now()}`;
      let buktiUrl = null;

      if (compressedFile) {
        const fileName = `bukti_${invoice}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('bukti-transfer')
          .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('bukti-transfer')
          .getPublicUrl(fileName);

        buktiUrl = urlData.publicUrl;
      }
      
      const payload = {
        invoice, 
        nama_penyewa: namaPenyewa, 
        no_wa: noWa,
        jenis_jaminan: jenisJaminan,
        nomor_jaminan: nomorJaminan,
        tanggal_bawa: waktuBawa, // Disimpan beserta jam
        tanggal_kembali: waktuKembali, // Disimpan beserta jam
        status: 'dibawa', 
        total_harga: totalHarga, 
        dp: Number(dp) || 0,
        metode_pembayaran: metodePembayaran, 
        status_pembayaran: statusPemb,
        bukti_pembayaran: buktiUrl
      };

      const { data: sewaData, error: sewaError } = await supabase
        .from('sewa')
        .insert([payload])
        .select('id')
        .single();

      if (sewaError) throw sewaError;

      // Insert ke sewa_items & POTONG STOK DI KATALOG
      for (const item of cart) {
        await supabase.from('sewa_items').insert([{
          sewa_id: sewaData.id, 
          barang_id: item.id, 
          qty: item.qty, 
          harga: item.harga
        }]);

        await supabase.from('katalog_barang').update({
          stok: item.stok - item.qty
        }).eq('id', item.id);
      }

      toast.success('Transaksi Kasir berhasil disimpan!');
      router.push('/sewa'); 
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal memproses transaksi kasir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isShiftOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] bg-white rounded-2xl border border-purple-200 p-8 text-center max-w-2xl mx-auto my-auto">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-100">
          <Lock size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Kasir Tidak Dapat Melayani Transaksi</h2>
        <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
          Sesi shift atau kasir sedang tertutup. Anda harus membuka shift terlebih dahulu melalui menu <b>Manajemen Kasir & Shift</b> sebelum dapat melayani pelanggan.
        </p>
        <button 
          onClick={() => router.push('/shift-kas')} 
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors text-sm"
        >
          Buka Shift Sekarang
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)] w-full overflow-hidden p-2 bg-white">
      
      {/* KIRI: KATALOG PRODUK GRID */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
        
        <div className="p-4 border-b border-purple-100 bg-slate-50 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Store className="text-purple-700" /> Kasir Toko (Walk-in)
            </h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama gaun, jas, atau perlengkapan..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-purple-200 focus:border-purple-600 outline-none text-slate-800 text-sm shadow-sm"
              autoFocus
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {kategoriList.map(kat => (
              <button 
                key={kat.nama}
                onClick={() => setActiveKategori(kat.nama)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  activeKategori === kat.nama 
                    ? 'bg-purple-700 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {kat.nama}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="animate-spin mb-2 text-purple-700" size={32} /> Memuat katalog...
            </div>
          ) : filteredKatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Package size={48} className="mb-2 opacity-50" /> Tidak ada barang tersedia
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredKatalog.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => addToCart(item)}
                  className="bg-white border border-purple-100 rounded-xl p-3 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all flex flex-col h-32 relative overflow-hidden group select-none"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">{item.kategori}</span>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.nama_barang}</h3>
                  
                  <div className="mt-auto flex items-end justify-between">
                    <span className="font-black text-purple-700 text-xs">Rp {item.harga.toLocaleString('id-ID')}</span>
                    <span className="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded">Stok: {item.stok}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KANAN: KERANJANG & PEMBAYARAN KASIR */}
      <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-2xl shadow-sm border border-purple-200 flex flex-col shrink-0 overflow-hidden">
        
        <div className="p-4 border-b border-purple-100 bg-purple-50/30 space-y-2.5 shrink-0 overflow-y-auto max-h-[42vh]">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Pelanggan & No WA</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-white rounded-xl border border-purple-100 px-3 py-1.5">
                <User size={15} className="text-purple-600 shrink-0" />
                <input type="text" placeholder="Nama Pelanggan..." value={namaPenyewa} onChange={e => setNamaPenyewa(e.target.value)} className="w-full bg-transparent text-xs outline-none font-bold text-slate-800" />
              </div>
              <input type="text" placeholder="No WhatsApp..." value={noWa} onChange={e => setNoWa(e.target.value)} className="w-full bg-white rounded-xl border border-purple-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <ShieldCheck size={13} className="text-purple-700" /> Jaminan Identitas
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select 
                value={jenisJaminan} 
                onChange={e => setJenisJaminan(e.target.value)}
                className="bg-white rounded-xl border border-purple-100 px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="KTP">KTP</option>
                <option value="SIM">SIM</option>
                <option value="Kartu Pelajar">Kartu Pelajar</option>
                <option value="Paspor">Paspor</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              <input 
                type="text" 
                placeholder="Nomor Identitas..." 
                value={nomorJaminan} 
                onChange={e => setNomorJaminan(e.target.value)} 
                className="col-span-2 bg-white rounded-xl border border-purple-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 border-t border-purple-100 pt-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Tgl & Jam Ambil</label>
              <div className="flex gap-2">
                <input type="date" value={tanggalBawa} onChange={e => setTanggalBawa(e.target.value)} className="w-full bg-white rounded-xl border border-purple-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none" />
                <input type="time" value={jamBawa} onChange={e => setJamBawa(e.target.value)} className="w-24 bg-white rounded-xl border border-purple-100 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Tgl & Jam Kembali</label>
              <div className="flex gap-2">
                <input type="date" value={tanggalKembali} onChange={e => setTanggalKembali(e.target.value)} className="w-full bg-white rounded-xl border border-purple-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none" />
                <input type="time" value={jamKembali} onChange={e => setJamKembali(e.target.value)} className="w-24 bg-white rounded-xl border border-purple-100 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* List Keranjang */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
              <ShoppingCart size={40} className="mb-2" />
              <p className="text-xs font-medium">Belum ada barang dipilih</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-800 truncate">{item.nama_barang}</h4>
                    <p className="text-xs font-semibold text-purple-700">Rp {item.harga.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-purple-100 text-slate-600 rounded-md"><Minus size={12}/></button>
                    <span className="w-5 text-center text-xs font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-purple-100 text-slate-600 rounded-md"><Plus size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total & Checkout Kasir */}
        <div className="p-4 bg-white border-t border-purple-100 shrink-0 space-y-2.5 overflow-y-auto max-h-[35vh]">
          
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-bold text-sm">Total Belanja</span>
            <span className="text-lg font-black text-slate-800">Rp {totalHarga.toLocaleString('id-ID')}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Dibayar / DP (Rp)</label>
              <input type="number" placeholder="0" value={dp} onChange={e => setDp(Number(e.target.value))} className="w-full bg-slate-50 border border-purple-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-purple-600" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Metode Bayar</label>
              <select value={metodePembayaran} onChange={e => setMetodePembayaran(e.target.value)} className="w-full bg-slate-50 border border-purple-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-purple-600">
                <option>Tunai</option><option>Transfer</option><option>QRIS</option>
              </select>
            </div>

            {/* Input Upload Bukti: SEKARANG OPSIONAL */}
            {metodePembayaran !== 'Tunai' && (
              <div className="col-span-2 pt-2 border-t border-dashed border-purple-100">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Upload size={12} className="text-purple-700" /> Upload Bukti Pembayaran <span className="text-purple-600">(Opsional)</span>
                  </label>
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer border border-purple-200 rounded-xl p-1 bg-slate-50"
                />
                <p className="text-[9px] text-slate-400 mt-1 italic">*Bisa disusulkan lewat menu Detail Sewa atau Shift Kasir</p>
                {previewImage && (
                  <div className="mt-2 p-1.5 border border-purple-100 rounded-xl bg-slate-50 flex justify-center">
                    <img src={previewImage} alt="Preview Bukti" className="h-16 object-contain rounded-md" />
                  </div>
                )}
              </div>
            )}
          </div>

          {sisaBayar > 0 && (
            <div className="flex justify-between text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg mt-1">
              <span>Kurang Bayar:</span><span>Rp {sisaBayar.toLocaleString('id-ID')}</span>
            </div>
          )}

          <button 
            onClick={handleSimpanKasir} 
            disabled={isSubmitting || cart.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 mt-1 text-sm"
          >
            <Save size={16} /> {isSubmitting ? 'Memproses...' : 'Proses Transaksi Kasir'}
          </button>

        </div>
      </div>

    </div>
  );
}