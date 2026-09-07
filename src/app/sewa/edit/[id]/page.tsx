'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Save, X, User, Phone, IdCard, Calendar, Clock, 
  Package, Plus, Trash2, Wallet, CreditCard, Loader2, Banknote
} from 'lucide-react';

export default function EditSewaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // State Pelanggan & Jadwal
  const [namaPenyewa, setNamaPenyewa] = useState('');
  const [noWa, setNoWa] = useState('');
  const [jenisJaminan, setJenisJaminan] = useState('KTP');
  const [noJaminan, setNoJaminan] = useState('');
  const [tanggalBawa, setTanggalBawa] = useState('');
  const [tanggalKembali, setTanggalKembali] = useState('');
  const [jamKembali, setJamKembali] = useState('');
  const [status, setStatus] = useState('booked');
  
  // State Pembayaran
  const [dp, setDp] = useState<number | ''>('');
  const [metodePembayaran, setMetodePembayaran] = useState('Tunai');
  
  // State Katalog & Keranjang
  const [katalog, setKatalog] = useState<any[]>([]);
  const [selectedBarang, setSelectedBarang] = useState('');
  const [qtyPesan, setQtyPesan] = useState<number>(1);
  const [cart, setCart] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ambil Data Katalog (untuk pilihan tambah barang)
  useEffect(() => {
    const fetchKatalog = async () => {
      const { data } = await supabase.from('katalog_barang').select('*').gt('stok', 0);
      if (data) setKatalog(data);
    };
    fetchKatalog();
  }, []);

  // Ambil Data Transaksi Lama
  useEffect(() => {
    const fetchSewaData = async () => {
      try {
        const { data, error } = await supabase
          .from('sewa')
          .select(`
            *,
            sewa_items (
              barang_id, qty, harga,
              katalog_barang ( nama_barang )
            )
          `)
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setNamaPenyewa(data.nama_penyewa || '');
          setNoWa(data.no_wa || '');
          setJenisJaminan(data.jenis_jaminan || 'KTP');
          setNoJaminan(data.nomor_jaminan || data.no_jaminan || ''); // Menangkap kedua kemungkinan nama kolom di DB
          setTanggalBawa(data.tanggal_bawa || '');
          setTanggalKembali(data.tanggal_kembali || '');
          setJamKembali(data.jam_kembali || '');
          setStatus(data.status || 'booked');
          setDp(data.dp ?? '');
          setMetodePembayaran(data.metode_pembayaran || 'Tunai');

          // Masukkan item lama ke state Keranjang (Cart)
          if (data.sewa_items) {
            const formattedCart = data.sewa_items.map((item: any) => ({
              barang_id: item.barang_id,
              nama_barang: item.katalog_barang?.nama_barang || 'Barang tidak diketahui',
              harga: item.harga,
              qty: item.qty,
              subtotal: item.harga * item.qty
            }));
            setCart(formattedCart);
          }
        }
      } catch (error: any) {
        toast.error('Gagal mengambil data transaksi.');
        router.push('/sewa');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchSewaData();
  }, [id, router]);

  // Fungsi Tambah Barang ke Keranjang (Edit)
  const tambahKeKeranjang = () => {
    if (!selectedBarang) return toast.error('Pilih barang terlebih dahulu!');
    if (qtyPesan < 1) return toast.error('Jumlah tidak valid!');

    const barang = katalog.find(b => b.id === selectedBarang);
    if (!barang) return;

    if (qtyPesan > barang.stok) return toast.error(`Stok tersisa saat ini hanya: ${barang.stok}`);

    const itemSudahAda = cart.find(item => item.barang_id === barang.id);
    if (itemSudahAda) return toast.error('Barang ini sudah ada di daftar pesanan, hapus dulu jika ingin mengubah jumlahnya.');

    setCart([...cart, {
      barang_id: barang.id,
      nama_barang: barang.nama_barang,
      harga: barang.harga,
      qty: qtyPesan,
      subtotal: barang.harga * qtyPesan
    }]);

    setSelectedBarang('');
    setQtyPesan(1);
  };

  const hapusDariKeranjang = (barang_id: string) => {
    setCart(cart.filter(item => item.barang_id !== barang_id));
  };

  // Kalkulasi Otomatis
  const totalHarga = cart.reduce((total, item) => total + item.subtotal, 0);
  const sisaBayar = totalHarga - (Number(dp) || 0);

  // Proses Simpan Perubahan
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return toast.error('Daftar pesanan tidak boleh kosong!');
    setIsSubmitting(true);

    const statusPembayaran = metodePembayaran === 'Tunai' ? 'diterima' : 'menunggu';

    try {
      // 1. Update data utama dengan menggunakan 'nomor_jaminan' agar konsisten dengan database
      const { error: sewaError } = await supabase.from('sewa').update({
        nama_penyewa: namaPenyewa, 
        no_wa: noWa, 
        jenis_jaminan: jenisJaminan,
        nomor_jaminan: noJaminan, // Disamakan menjadi nomor_jaminan
        tanggal_bawa: tanggalBawa, 
        tanggal_kembali: tanggalKembali,
        jam_kembali: jamKembali, 
        status, 
        total_harga: totalHarga, 
        dp: Number(dp) || 0,
        metode_pembayaran: metodePembayaran, 
        status_pembayaran: statusPembayaran
      }).eq('id', id);

      if (sewaError) throw sewaError;

      // 2. Hapus semua item lama di database (Trigger DB akan otomatis mengembalikan stok lama)
      const { error: deleteError } = await supabase.from('sewa_items').delete().eq('sewa_id', id);
      if (deleteError) throw deleteError;

      // 3. Masukkan item baru/yang sudah diperbarui dari keranjang
      const itemsToInsert = cart.map(item => ({
        sewa_id: id, 
        barang_id: item.barang_id, 
        qty: item.qty, 
        harga: item.harga
      }));

      const { error: insertError } = await supabase.from('sewa_items').insert(itemsToInsert);
      if (insertError) throw insertError;

      toast.success('Data transaksi berhasil diperbarui!');
      router.push('/sewa');
      router.refresh();

    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] bg-white">
      <Loader2 size={40} className="text-purple-700 animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Memuat data edit...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-5xl mx-auto overflow-x-hidden bg-white">
      
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">Edit Transaksi</h2>
          <p className="text-xs sm:text-sm text-slate-500 truncate">Perbarui data pelanggan, jadwal, dan barang sewaan.</p>
        </div>
        <Link href="/sewa" className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-purple-200 rounded-xl hover:bg-purple-50 shrink-0 text-sm shadow-sm transition-colors text-slate-600">
          <X size={16} /> <span className="hidden sm:inline">Batal</span>
        </Link>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-purple-200 w-full">
        <form onSubmit={handleUpdate} className="space-y-8 w-full">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-purple-700 border-b pb-2 border-purple-100">1. Data Penyewa</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">Nama Penyewa</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input type="text" value={namaPenyewa} onChange={e => setNamaPenyewa(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-slate-800" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">No. WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input type="tel" value={noWa} onChange={e => setNoWa(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-slate-800" required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">Jaminan</label>
                  <select value={jenisJaminan} onChange={e => setJenisJaminan(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600">
                    <option>KTP</option><option>SIM</option><option>KK</option><option>Kartu Pelajar</option><option>Paspor</option><option>Lainnya</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">No. Identitas</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input type="text" value={noJaminan} onChange={e => setNoJaminan(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-slate-800" required />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-purple-700 border-b pb-2 border-purple-100">2. Jadwal Sewa</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">Tgl Bawa</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input type="date" value={tanggalBawa} onChange={e => setTanggalBawa(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-slate-800" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">Status Transaksi</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none font-medium text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600">
                    <option value="booked">Booked (Booking)</option>
                    <option value="dibawa">Dibawa (Rented)</option>
                    <option value="selesai">Selesai (Returned)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">Tgl Kembali</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input type="date" value={tanggalKembali} onChange={e => setTanggalKembali(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-slate-800" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">Jam Kembali</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input type="time" value={jamKembali} onChange={e => setJamKembali(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm font-semibold rounded-xl bg-purple-50/50 border border-transparent outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-slate-800" required />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN PESANAN BARANG */}
          <div className="pt-4 border-t border-purple-100">
            <h3 className="text-sm font-bold text-purple-700 mb-4">3. Pesanan Barang</h3>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold mb-1.5 text-slate-700">Pilih Tambahan Barang</label>
                <div className="relative">
                  <Package className="absolute left-3 top-3 text-slate-400" size={16} />
                  <select value={selectedBarang} onChange={e => setSelectedBarang(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none truncate text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600">
                    <option value="">-- Pilih Barang Baru --</option>
                    {katalog.map(item => (
                      <option key={item.id} value={item.id}>{item.nama_barang} (Stok: {item.stok}) - Rp {item.harga.toLocaleString('id-ID')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="w-full sm:w-24">
                <label className="block text-xs font-semibold mb-1.5 text-left sm:text-center text-slate-700">Qty</label>
                <input type="number" min="1" value={qtyPesan} onChange={e => setQtyPesan(Number(e.target.value))} className="w-full px-3 py-2.5 text-sm rounded-xl text-left sm:text-center bg-purple-50/50 border border-transparent outline-none text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600" />
              </div>
              <button type="button" onClick={tambahKeKeranjang} className="w-full sm:w-auto bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shrink-0 shadow-sm transition-transform hover:scale-[1.02] hover:bg-purple-800">
                <Plus size={16} /> Tambah
              </button>
            </div>

            <div className="rounded-xl border border-purple-100 overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-purple-50 border-b border-purple-100">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap text-slate-700">Nama Barang</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap text-slate-700">Harga</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap text-slate-700">Qty</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap text-slate-700">Subtotal</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap text-slate-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 bg-white">
                    {cart.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada barang yang dipilih.</td></tr>
                    ) : (
                      cart.map(item => (
                        <tr key={item.barang_id} className="hover:bg-purple-50/40 transition-colors">
                          <td className="px-4 py-3 font-semibold whitespace-nowrap text-slate-800">{item.nama_barang}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap text-slate-700">Rp {item.harga.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-center text-slate-800">{item.qty}</td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700 whitespace-nowrap">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => hapusDariKeranjang(item.barang_id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus dari pesanan"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Total Harga */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-700">Total Harga (Otomatis)</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-3 text-slate-400" size={16} />
                <input type="text" value={`Rp ${totalHarga.toLocaleString('id-ID')}`} readOnly className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-100 text-slate-800 font-bold outline-none cursor-not-allowed border border-transparent" />
              </div>
            </div>
            
            {/* Metode Pembayaran */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-700">Metode Pembayaran</label>
              <div className="relative">
                <Banknote className="absolute left-3 top-3 text-slate-400" size={16} />
                <select value={metodePembayaran} onChange={e => setMetodePembayaran(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-purple-200 text-slate-800 outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600">
                  <option value="Tunai">Tunai (Cash)</option>
                  <option value="Transfer BCA">Transfer BCA</option>
                  <option value="Transfer Mandiri">Transfer Mandiri</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>
            </div>

            {/* Input DP */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-700">DP / Panjar (Rp)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 text-slate-400" size={16} />
                <input type="number" value={dp} onChange={e => setDp(Number(e.target.value))} placeholder="0" min="0" className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-purple-200 text-slate-800 outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600" />
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end md:border-l border-purple-200 md:pl-4 pt-2 md:pt-0 border-t md:border-t-0">
              <span className="text-xs font-semibold mb-1 text-slate-500">Sisa Pembayaran</span>
              <span className={`text-xl font-bold tracking-tight ${sisaBayar <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                Rp {sisaBayar > 0 ? sisaBayar.toLocaleString('id-ID') : '0 (LUNAS)'}
              </span>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end border-t border-purple-100">
            <button type="submit" disabled={isSubmitting || cart.length === 0} className="w-full sm:w-auto flex justify-center items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl text-sm disabled:opacity-50 transition-colors shadow-sm">
              <Save size={18} />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}