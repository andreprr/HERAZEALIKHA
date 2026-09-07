'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Save, X, User, Phone, IdCard, Calendar, Clock, 
  Package, Plus, Trash2, Wallet, CreditCard, Banknote
} from 'lucide-react';

export default function TambahSewaPage() {
  const router = useRouter();

  const [namaPenyewa, setNamaPenyewa] = useState('');
  const [noWa, setNoWa] = useState('');
  const [jenisJaminan, setJenisJaminan] = useState('KTP');
  const [noJaminan, setNoJaminan] = useState('');
  const [tanggalBawa, setTanggalBawa] = useState('');
  const [tanggalKembali, setTanggalKembali] = useState('');
  const [jamKembali, setJamKembali] = useState('12:00');
  const [status, setStatus] = useState('booked');
  
  const [dp, setDp] = useState<number | ''>('');
  const [metodePembayaran, setMetodePembayaran] = useState('Tunai');

  const [katalog, setKatalog] = useState<any[]>([]);
  const [selectedBarang, setSelectedBarang] = useState('');
  const [qtyPesan, setQtyPesan] = useState<number>(1);
  const [cart, setCart] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchKatalog = async () => {
      const { data } = await supabase.from('katalog_barang').select('*').gt('stok', 0);
      if (data) setKatalog(data);
    };
    fetchKatalog();
  }, []);

  const tambahKeKeranjang = () => {
    if (!selectedBarang) return toast.error('Pilih barang terlebih dahulu!');
    if (qtyPesan < 1) return toast.error('Jumlah tidak valid!');

    const barang = katalog.find(b => b.id === selectedBarang);
    if (!barang) return;

    if (qtyPesan > barang.stok) return toast.error(`Stok tidak cukup! Tersedia: ${barang.stok}`);

    const itemSudahAda = cart.find(item => item.barang_id === barang.id);
    if (itemSudahAda) return toast.error('Barang ini sudah ada di keranjang.');

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

  const hapusDariKeranjang = (id: string) => {
    setCart(cart.filter(item => item.barang_id !== id));
  };

  const totalHarga = cart.reduce((total, item) => total + item.subtotal, 0);
  const sisaBayar = totalHarga - (Number(dp) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return toast.error('Keranjang barang masih kosong!');
    setIsSubmitting(true);

    const statusPembayaran = metodePembayaran === 'Tunai' ? 'diterima' : 'menunggu';

    try {
      const invoice = `INV-${Date.now()}`;
      const { data: sewaData, error: sewaError } = await supabase
        .from('sewa')
        .insert([{
          invoice, nama_penyewa: namaPenyewa, no_wa: noWa, jenis_jaminan: jenisJaminan,
          no_jaminan: noJaminan, tanggal_bawa: tanggalBawa, tanggal_kembali: tanggalKembali,
          jam_kembali: jamKembali, status, total_harga: totalHarga, dp: Number(dp) || 0,
          metode_pembayaran: metodePembayaran, status_pembayaran: statusPembayaran
        }])
        .select('id').single();

      if (sewaError) throw sewaError;

      const itemsToInsert = cart.map(item => ({
        sewa_id: sewaData.id, barang_id: item.barang_id, qty: item.qty, harga: item.harga
      }));
      const { error: itemsError } = await supabase.from('sewa_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast.success('Transaksi sewa berhasil disimpan!');
      router.push('/sewa');
      router.refresh();

    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-5xl mx-auto overflow-x-hidden bg-white">
      
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">Form Sewa Baru</h2>
          <p className="text-xs sm:text-sm text-slate-500 truncate">Buat transaksi penyewaan barang baru.</p>
        </div>
        <Link href="/sewa" className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-purple-200 rounded-xl hover:bg-purple-50 shrink-0 text-sm shadow-sm transition-colors text-slate-600">
          <X size={16} /> <span className="hidden sm:inline">Batal</span>
        </Link>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-purple-200">
        <form onSubmit={handleSubmit} className="space-y-8">
          
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
                    <option>KTP</option><option>SIM</option><option>KK</option>
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

          <div className="pt-4 border-t border-purple-100">
            <h3 className="text-sm font-bold text-purple-700 mb-4">3. Pesanan Barang</h3>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold mb-1.5 text-slate-700">Pilih Barang dari Katalog</label>
                <div className="relative">
                  <Package className="absolute left-3 top-3 text-slate-400" size={16} />
                  <select value={selectedBarang} onChange={e => setSelectedBarang(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-purple-50/50 border border-transparent outline-none truncate text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600">
                    <option value="">-- Pilih Barang --</option>
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
                            <button type="button" onClick={() => hapusDariKeranjang(item.barang_id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
            
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-700">Total Harga (Otomatis)</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-3 text-slate-400" size={16} />
                <input type="text" value={`Rp ${totalHarga.toLocaleString('id-ID')}`} readOnly className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-100 text-slate-800 font-bold outline-none cursor-not-allowed border border-transparent" />
              </div>
            </div>
            
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

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-700">DP / Panjar (Rp)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 text-slate-400" size={16} />
                <input type="number" value={dp} onChange={e => setDp(Number(e.target.value))} placeholder="0" min="0" className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-purple-200 text-slate-800 outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600" />
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end md:border-l border-purple-200 md:pl-4 pt-2 md:pt-0 border-t md:border-t-0">
              <span className="text-xs font-semibold mb-1 text-slate-500">Sisa Tagihan</span>
              <span className={`text-xl font-bold tracking-tight ${sisaBayar <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                Rp {sisaBayar > 0 ? sisaBayar.toLocaleString('id-ID') : '0 (LUNAS)'}
              </span>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end border-t border-purple-100">
            <button type="submit" disabled={isSubmitting || cart.length === 0} className="w-full sm:w-auto flex justify-center items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl text-sm disabled:opacity-50 transition-colors shadow-sm">
              <Save size={18} />
              {isSubmitting ? 'Memproses...' : 'Simpan Transaksi Sewa'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}