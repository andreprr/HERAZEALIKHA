'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Save, User, Calendar, CreditCard, 
  Loader2, ShieldCheck, Package, Plus, Minus, X, Search, Image as ImageIcon,
  CheckCircle, Upload
} from 'lucide-react';

export default function EditSewaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoice, setInvoice] = useState('');

  // State Form Pelanggan
  const [namaPenyewa, setNamaPenyewa] = useState('');
  const [noWa, setNoWa] = useState('');
  const [jenisJaminan, setJenisJaminan] = useState('KTP');
  const [namaPenjamin, setNamaPenjamin] = useState(''); 
  const [kelengkapan, setKelengkapan] = useState(''); 

  // State Form Waktu
  const [tanggalBawa, setTanggalBawa] = useState('');
  const [tanggalKembali, setTanggalKembali] = useState('');

  // State Finansial & Barang
  const [dp, setDp] = useState<number | ''>('');
  const [metodePembayaran, setMetodePembayaran] = useState('Tunai');
  const [items, setItems] = useState<any[]>([]);

  // State Modal Katalog
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [katalog, setKatalog] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 🔴 STATE MODAL PELUNASAN
  const [isPelunasanOpen, setIsPelunasanOpen] = useState(false);
  const [pelunasanMetode, setPelunasanMetode] = useState('Transfer');
  const [pelunasanFile, setPelunasanFile] = useState<File | null>(null);
  const [pelunasanPreview, setPelunasanPreview] = useState<string>('');
  const [isProcessingPelunasan, setIsProcessingPelunasan] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSewaDetail();
      fetchKatalog();
    }
  }, [id]);

  const fetchKatalog = async () => {
    try {
      const { data: brg, error: errBrg } = await supabase.from('katalog_barang').select('*').order('nama_barang');
      if (errBrg) throw errBrg;

      const { data: activeRentals, error: errRentals } = await supabase
        .from('sewa')
        .select('id, status, sewa_items(barang_id, qty)')
        .in('status', ['booking', 'dibawa', 'terlambat']);

      if (errRentals) throw errRentals;

      const processedKatalog = (brg || []).map(item => {
        let sedangDisewaQty = 0;
        activeRentals?.forEach(rental => {
          const rentedItems = rental.sewa_items.filter((si: any) => si.barang_id === item.id);
          rentedItems.forEach(rentedItem => { sedangDisewaQty += rentedItem.qty; });
        });
        return { ...item, sedang_disewa: sedangDisewaQty };
      });

      setKatalog(processedKatalog);
    } catch (error) {
      console.error('Gagal mengambil katalog', error);
    }
  };

  const fetchSewaDetail = async () => {
    setIsLoading(true);
    try {
      const { data: sewa, error: sewaError } = await supabase
        .from('sewa')
        .select('*')
        .eq('id', id)
        .single();

      if (sewaError) throw sewaError;

      const { data: sewaItems, error: itemsError } = await supabase
        .from('sewa_items')
        .select(`
          qty,
          harga,
          barang_id,
          katalog_barang (*)
        `)
        .eq('sewa_id', id);

      if (itemsError) throw itemsError;

      if (sewa) {
        setInvoice(sewa.invoice);
        setNamaPenyewa(sewa.nama_penyewa || '');
        setNoWa(sewa.no_wa || '');
        setJenisJaminan(sewa.jenis_jaminan || 'KTP');
        setNamaPenjamin(sewa.nomor_jaminan || ''); 
        setKelengkapan(sewa.kelengkapan || '');

        setTanggalBawa(sewa.tanggal_bawa ? sewa.tanggal_bawa.split(' ')[0] : '');
        setTanggalKembali(sewa.tanggal_kembali ? sewa.tanggal_kembali.split(' ')[0] : '');

        setDp(sewa.dp || 0);
        setMetodePembayaran(sewa.metode_pembayaran || 'Tunai');

        const formattedItems = sewaItems.map((si: any) => ({
          id: si.barang_id,
          nama_barang: si.katalog_barang?.nama_barang || 'Barang Dihapus',
          gambar_url: si.katalog_barang?.gambar_url,
          kategori: si.katalog_barang?.kategori || '-',
          harga: si.harga,
          qty: si.qty
        }));

        setItems(formattedItems);
      }
    } catch (error) {
      toast.error('Gagal memuat data transaksi');
      router.push('/sewa');
    } finally {
      setIsLoading(false);
    }
  };

  const totalHarga = items.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  const sisaBayar = totalHarga - (Number(dp) || 0);
  
  const addToCart = (barang: any) => {
    const existing = items.find(item => item.id === barang.id);
    if (existing) {
      setItems(items.map(item => item.id === barang.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setItems([...items, { ...barang, qty: 1 }]);
    }
    toast.success(`${barang.nama_barang} ditambahkan`);
  };

  const updateQty = (barangId: string, delta: number) => {
    const item = items.find(i => i.id === barangId);
    if (!item) return;
    
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      setItems(items.filter(i => i.id !== barangId));
      return;
    }
    setItems(items.map(i => i.id === barangId ? { ...i, qty: newQty } : i));
  };

  const filteredKatalog = katalog.filter(item => 
    item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileChangePelunasan = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
          setPelunasanFile(compressed);
          setPelunasanPreview(URL.createObjectURL(compressed));
        }, 'image/jpeg', 0.7);
      };
    };
  };

  // 🔴 Handle Submit Pelunasan (DENGAN LOGIKA MIX PAYMENT)
  const handleProsesPelunasan = async () => {
    setIsProcessingPelunasan(true);
    try {
      let buktiUrl = undefined;
      
      if (pelunasanFile) {
        const fileName = `pelunasan_${invoice}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('bukti-transfer')
          .upload(fileName, pelunasanFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('bukti-transfer').getPublicUrl(fileName);
        buktiUrl = urlData.publicUrl;
      }
      
      // LOGIKA PENYIMPANAN MIX PAYMENT (TUNAI + TRANSFER / BEDA METODE)
      let finalMetode = pelunasanMetode;
      if (Number(dp) > 0 && metodePembayaran !== pelunasanMetode && !metodePembayaran.startsWith('SPLIT|')) {
        // Gabungkan menjadi teks rahasia: SPLIT|MetodeAwal|NominalAwal|MetodeLunas|NominalLunas
        finalMetode = `SPLIT|${metodePembayaran}|${dp}|${pelunasanMetode}|${sisaBayar}`;
      }

      const payload: any = {
        dp: totalHarga, 
        metode_pembayaran: finalMetode,
        status_pembayaran: 'diterima'
      };
      
      if (buktiUrl) payload.bukti_pembayaran = buktiUrl;

      const { error } = await supabase.from('sewa').update(payload).eq('id', id);
      if (error) throw error;
      
      setDp(totalHarga);
      setMetodePembayaran(finalMetode);
      setIsPelunasanOpen(false);
      setPelunasanFile(null);
      setPelunasanPreview('');
      toast.success('Pelunasan berhasil diproses!');
    } catch(err) {
      toast.error('Gagal memproses pelunasan');
    } finally {
      setIsProcessingPelunasan(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPenyewa || !tanggalBawa || !tanggalKembali) {
      return toast.error('Harap lengkapi nama pelanggan dan tanggal penyewaan!');
    }
    if (items.length === 0) return toast.error('Daftar barang tidak boleh kosong!');

    setIsSubmitting(true);
    try {
      const { error: updateSewaError } = await supabase
        .from('sewa')
        .update({
          nama_penyewa: namaPenyewa,
          no_wa: noWa,
          jenis_jaminan: jenisJaminan,
          nomor_jaminan: namaPenjamin, 
          kelengkapan: kelengkapan,
          tanggal_bawa: tanggalBawa,
          tanggal_kembali: tanggalKembali,
          total_harga: totalHarga,
          dp: Number(dp) || 0,
          metode_pembayaran: metodePembayaran
        })
        .eq('id', id);

      if (updateSewaError) throw updateSewaError;

      await supabase.from('sewa_items').delete().eq('sewa_id', id);
      
      const newSewaItems = items.map(item => ({
        sewa_id: id,
        barang_id: item.id,
        qty: item.qty,
        harga: item.harga
      }));
      
      const { error: insertItemsError } = await supabase.from('sewa_items').insert(newSewaItems);
      if (insertItemsError) throw insertItemsError;

      toast.success('Data transaksi berhasil diperbarui!');
      router.push(`/sewa`);
    } catch (error: any) {
      toast.error('Gagal memperbarui transaksi: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] bg-white">
        <Loader2 size={40} className="text-purple-700 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-4xl mx-auto bg-white relative">
      
      <div className="flex items-center gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200">
        <button onClick={() => router.back()} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Edit Booking</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">{invoice}</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 mb-4">
            <User size={18} className="text-purple-600" /> Informasi Pelanggan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Penyewa</label>
              <input 
                type="text" value={namaPenyewa} onChange={(e) => setNamaPenyewa(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">No. WhatsApp</label>
              <input 
                type="text" value={noWa} onChange={(e) => setNoWa(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <ShieldCheck size={14} className="text-purple-600" /> Jenis Jaminan
              </label>
              <select 
                value={jenisJaminan} 
                onChange={(e) => {
                  setJenisJaminan(e.target.value);
                  setNamaPenjamin('');
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800 transition-colors"
              >
                <option value="KTP">KTP</option>
                <option value="SIM">SIM</option>
                <option value="Deposit">Deposit</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                {jenisJaminan === 'Deposit' ? 'Nominal Deposit' : 'Nama Pemilik Jaminan'}
              </label>
              {jenisJaminan === 'Deposit' ? (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                  <input 
                    type="text" 
                    value={namaPenjamin ? Number(namaPenjamin.replace(/\D/g, '')).toLocaleString('id-ID') : ''} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, ''); 
                      setNamaPenjamin(val);
                    }}
                    placeholder="Contoh: 50.000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800 transition-colors"
                  />
                </div>
              ) : (
                <input 
                  type="text" 
                  value={namaPenjamin} 
                  onChange={(e) => setNamaPenjamin(e.target.value)}
                  placeholder={`Nama di ${jenisJaminan}...`}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800 transition-colors"
                />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 mb-4">
            <Calendar size={18} className="text-purple-600" /> Jadwal Sewa & Kelengkapan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Tanggal Ambil</label>
              <input 
                type="date" value={tanggalBawa} onChange={(e) => setTanggalBawa(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase text-red-500">Batas Kembali</label>
              <input 
                type="date" value={tanggalKembali} onChange={(e) => setTanggalKembali(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 focus:bg-white focus:border-red-500 focus:outline-none text-sm font-semibold text-red-700"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kelengkapan / Aksesoris Manual</label>
            <input 
              type="text" value={kelengkapan} onChange={(e) => setKelengkapan(e.target.value)}
              placeholder="Contoh: Dasi 1, Sabuk 1, Peniti..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800 transition-colors"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3 mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Package size={18} className="text-purple-600" /> Daftar Barang
            </h3>
            <button 
              type="button" 
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Tambah Barang
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
              <p className="text-sm text-slate-400 font-medium">Belum ada barang dipilih.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                       {item.gambar_url ? (
                         <img src={item.gambar_url} alt={item.nama_barang} className="w-full h-full object-cover" />
                       ) : (
                         <ImageIcon className="text-slate-300" size={16} />
                       )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{item.nama_barang}</h4>
                      <p className="text-xs font-semibold text-purple-700">Rp {item.harga.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 bg-white border border-slate-200 rounded-lg p-1">
                    <button type="button" onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-purple-100 text-slate-600 rounded-md"><Minus size={12}/></button>
                    <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                    <button type="button" onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-purple-100 text-slate-600 rounded-md"><Plus size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3 mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={18} className="text-purple-600" /> Finansial & Pembayaran
            </h3>
            {sisaBayar > 0 && (
              <button 
                type="button" 
                onClick={() => setIsPelunasanOpen(true)}
                className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <CheckCircle size={14} /> Proses Pelunasan
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4">
            <span className="text-slate-600 font-bold text-sm">Total Tagihan Baru</span>
            <span className="text-xl font-black text-purple-800">Rp {totalHarga.toLocaleString('id-ID')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sudah Dibayar (DP / Lunas)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                <input 
                  type="text" 
                  value={dp ? Number(dp).toLocaleString('id-ID') : ''} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); 
                    setDp(val ? Number(val) : '');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Metode Bayar (Awal)</label>
              <select 
                value={metodePembayaran} onChange={(e) => setMetodePembayaran(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800"
              >
                {/* 🔴 Mencegah error tampilan jika metode sudah berupa teks Mix Payment */}
                {metodePembayaran.startsWith('SPLIT|') && (
                  <option value={metodePembayaran}>
                    {metodePembayaran.split('|')[1]} & {metodePembayaran.split('|')[3]} (Mix)
                  </option>
                )}
                <option value="Tunai">Tunai</option>
                <option value="Transfer">Transfer</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
          </div>
          
          {sisaBayar > 0 && (
            <div className="mt-4 flex items-center justify-between bg-red-50 p-3 rounded-xl border border-red-100">
              <span className="text-red-600 font-bold text-sm">Sisa Belum Dibayar</span>
              <span className="text-lg font-black text-red-600">Rp {sisaBayar.toLocaleString('id-ID')}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button 
            type="button" 
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl font-bold text-white bg-purple-700 hover:bg-purple-800 transition-colors flex items-center gap-2 shadow-sm"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Simpan Perubahan
          </button>
        </div>

      </form>

      {isPelunasanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-green-50/50">
              <h3 className="font-bold text-green-700 flex items-center gap-2">
                <CheckCircle size={18} /> Proses Pelunasan Tagihan
              </h3>
              <button onClick={() => setIsPelunasanOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Total Tagihan:</span>
                <span>Rp {totalHarga.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Sudah Dibayar (DP):</span>
                <span>Rp {Number(dp).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                <span>Sisa Pelunasan:</span>
                <span>Rp {sisaBayar.toLocaleString('id-ID')}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Metode Pelunasan</label>
                <select 
                  value={pelunasanMetode} 
                  onChange={e => setPelunasanMetode(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:outline-none text-sm font-bold text-slate-800"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer">Transfer</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>

              {pelunasanMetode !== 'Tunai' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <Upload size={14} className="text-green-600" /> Upload Bukti Pelunasan <span className="text-green-600 normal-case">(Wajib)</span>
                  </label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChangePelunasan}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50"
                  />
                  {pelunasanPreview && (
                    <div className="mt-3 p-2 border border-slate-200 rounded-xl bg-slate-50 flex justify-center h-32 relative">
                      <img src={pelunasanPreview} alt="Preview Bukti" className="h-full object-contain rounded-lg" />
                      <button onClick={() => { setPelunasanFile(null); setPelunasanPreview(''); }} className="absolute top-1 right-1 bg-white/80 p-1 rounded-md text-red-500 hover:text-red-700 shadow-sm"><X size={14}/></button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setIsPelunasanOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">Batal</button>
              <button 
                onClick={handleProsesPelunasan} 
                disabled={isProcessingPelunasan || (pelunasanMetode !== 'Tunai' && !pelunasanFile)}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isProcessingPelunasan ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Lunasi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package className="text-purple-600" /> Katalog Barang
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" placeholder="Cari nama barang..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              {filteredKatalog.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium text-sm">Barang tidak ditemukan</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredKatalog.map(item => {
                     const imageUrl = item.gambar_url || item.foto || item.foto_barang || item.image_url || item['katalog-foto'] || item.katalog_foto;
                     let finalImageUrl = null;
                     if (imageUrl) {
                       if (imageUrl.startsWith('http')) finalImageUrl = imageUrl;
                       else finalImageUrl = supabase.storage.from('katalog-foto').getPublicUrl(imageUrl).data.publicUrl;
                     }

                     return (
                      <div 
                        key={item.id} onClick={() => addToCart(item)}
                        className="bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-purple-400 hover:shadow-md transition-all flex flex-col overflow-hidden group select-none pb-2"
                      >
                        <div className="h-28 bg-slate-100 w-full flex items-center justify-center overflow-hidden relative border-b border-slate-100 shrink-0">
                          {finalImageUrl ? (
                            <img src={finalImageUrl} alt={item.nama_barang} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="text-slate-300" size={24} />
                          )}
                        </div>
                        <div className="p-2.5 flex flex-col flex-1 justify-between gap-1.5">
                          <h3 className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-2">{item.nama_barang}</h3>
                          <div className="flex flex-col gap-1 mt-auto">
                            <span className="font-black text-purple-700 text-xs">Rp {item.harga.toLocaleString('id-ID')}</span>
                            <div>
                              {item.sedang_disewa > 0 ? (
                                <span className="inline-block bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded w-fit">
                                  Sedang disewa: {item.sedang_disewa}
                                </span>
                              ) : (
                                <span className="inline-block bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded w-fit">
                                  Belum ada penyewa
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl transition-colors">
                Selesai Memilih
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}