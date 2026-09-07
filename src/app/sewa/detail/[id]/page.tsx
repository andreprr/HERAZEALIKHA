'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Printer, CheckCircle, Clock, Package, 
  CalendarDays, User, ShieldCheck, Banknote, Loader2
} from 'lucide-react';

export default function DetailSewaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [sewa, setSewa] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Modal Pelunasan
  const [isModalPelunasanOpen, setIsModalPelunasanOpen] = useState(false);
  const [nominalPelunasan, setNominalPelunasan] = useState(0);
  const [metodeBayar, setMetodeBayar] = useState('Tunai');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const { data: sewaData, error: sewaError } = await supabase
        .from('sewa')
        .select('*')
        .eq('id', id)
        .single();

      if (sewaError) throw sewaError;
      setSewa(sewaData);
      
      const sisa = (sewaData.total_harga || 0) - (sewaData.dp || 0);
      setNominalPelunasan(sisa > 0 ? sisa : 0);

      const { data: itemData, error: itemError } = await supabase
        .from('sewa_items')
        .select(`*, katalog_barang(nama_barang, kategori)`)
        .eq('sewa_id', id);

      if (itemError) throw itemError;
      if (itemData) setItems(itemData);

    } catch (error: any) {
      toast.error('Gagal memuat detail transaksi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePelunasan = async () => {
    if (nominalPelunasan <= 0) return toast.error('Nominal pelunasan tidak valid!');

    setIsSubmitting(true);
    try {
      const dpBaru = (sewa.dp || 0) + Number(nominalPelunasan);
      
      const { error } = await supabase
        .from('sewa')
        .update({ 
          dp: dpBaru,
          status_pembayaran: metodeBayar === 'Tunai' ? 'diterima' : 'menunggu'
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Pelunasan berhasil disimpan!');
      setIsModalPelunasanOpen(false);
      fetchDetail();
    } catch (error: any) {
      toast.error('Gagal memproses pelunasan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white">
        <Loader2 size={40} className="text-purple-700 animate-spin mb-2" />
        <p className="text-slate-500 text-sm">Memuat detail transaksi...</p>
      </div>
    );
  }

  if (!sewa) {
    return (
      <div className="text-center py-20 bg-white">
        <p className="text-slate-500">Data transaksi tidak ditemukan.</p>
        <button onClick={() => router.back()} className="mt-4 text-purple-700 font-bold text-sm">Kembali</button>
      </div>
    );
  }

  const totalHarga = sewa.total_harga || 0;
  const sudahDibayar = sewa.dp || 0;
  const sisaTagihan = totalHarga - sudahDibayar;
  const isLunas = sisaTagihan <= 0;

  return (
    <div className="flex flex-col gap-6 h-full pb-12 pt-2 w-full max-w-4xl mx-auto bg-white">
      
      {/* CSS KHUSUS CETAK STRUK DENGAN LOGO */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #print-receipt-area, #print-receipt-area * { visibility: visible; }
          #print-receipt-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            margin: 0; 
            padding: 20px; 
            background: white !important; 
            color: black !important; 
          }
          .print-hidden { display: none !important; }
        }
      `}} />

      {/* HEADER NAVIGASI & AKSI */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-purple-200 print-hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-purple-700 font-bold text-sm transition-colors">
          <ArrowLeft size={18} /> Kembali
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm">
            <Printer size={16} /> Cetak Struk
          </button>
          {!isLunas && (
            <button onClick={() => setIsModalPelunasanOpen(true)} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm">
              <Banknote size={16} /> Lunasi Tagihan
            </button>
          )}
        </div>
      </div>

      {/* AREA UTAMA & PRINT STRUK */}
      <div id="print-receipt-area" className="bg-white rounded-2xl shadow-sm border border-purple-200 p-6 sm:p-8 space-y-6">
        
        {/* LOGO TOKO */}
        <div className="flex flex-col items-center justify-center text-center border-b border-purple-100 pb-5">
          <img src="/logo.jpeg" alt="Herazealikha Logo" className="h-32 w-auto object-contain mb-2" />
        </div>

        {/* Top Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-100 pb-5">
          <div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
              Invoice #{sewa.invoice}
            </span>
            <h1 className="text-2xl font-black text-slate-800 mt-2">{sewa.nama_penyewa}</h1>
            <p className="text-xs text-slate-400 mt-0.5">No WhatsApp: {sewa.no_wa || '-'}</p>
          </div>
          
          <div className="text-left sm:text-right">
            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide ${
              sewa.status === 'selesai' ? 'bg-slate-100 text-slate-600' :
              sewa.status === 'dibawa' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              Status: {sewa.status}
            </span>
            <p className="text-xs text-slate-400 mt-1">Dibuat pada: {new Date(sewa.created_at).toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Info Sewa & Jaminan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-purple-100">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jadwal Sewa</span>
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <CalendarDays size={14} className="text-purple-600" />
              {formatDate(sewa.tanggal_bawa)} s/d {formatDate(sewa.tanggal_kembali)}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jaminan Identitas</span>
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <ShieldCheck size={14} className="text-purple-600" />
              {sewa.jenis_jaminan || 'KTP'} ({sewa.nomor_jaminan || 'Tidak diisi'})
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Metode Pembayaran</span>
            <div className="text-xs font-bold text-slate-700">
              {sewa.metode_pembayaran || 'Tunai'} ({sewa.status_pembayaran})
            </div>
          </div>
        </div>

        {/* Tabel Item Barang */}
        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <Package size={16} className="text-purple-700" /> Barang Disewa
          </h3>
          <div className="border border-purple-100 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-purple-50/50 font-semibold text-slate-700 border-b border-purple-100">
                <tr>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3 text-right">Harga Satuan</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/30">
                    <td className="px-4 py-3 font-bold text-slate-800">{item.katalog_barang?.nama_barang || 'Barang'}</td>
                    <td className="px-4 py-3 text-center">{item.qty} pcs</td>
                    <td className="px-4 py-3 text-right">Rp {item.harga?.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">Rp {(item.harga * item.qty).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ringkasan Keuangan */}
        <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-100 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Total Nilai Sewa:</span>
            <span>Rp {totalHarga.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Sudah Dibayar (DP / Awal):</span>
            <span className="text-green-600 font-bold">Rp {sudahDibayar.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-sm font-black pt-2 border-t border-purple-200">
            <span className="text-slate-800">Sisa Tagihan:</span>
            <span className={sisaTagihan > 0 ? 'text-red-500 text-base' : 'text-green-600 text-base'}>
              {sisaTagihan > 0 ? `Rp ${sisaTagihan.toLocaleString('id-ID')}` : 'LUNAS'}
            </span>
          </div>
        </div>

      </div>

      {/* MODAL PELUNASAN */}
      {isModalPelunasanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print-hidden">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-purple-100 bg-purple-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Banknote size={18} className="text-green-600" /> Pelunasan Tagihan Sewa
              </h3>
              <button onClick={() => setIsModalPelunasanOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Total Harga:</span><span className="font-bold">Rp {totalHarga.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Sudah Dibayar:</span><span className="font-bold text-green-600">Rp {sudahDibayar.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-black text-red-500"><span>Sisa Tagihan:</span><span>Rp {sisaTagihan.toLocaleString('id-ID')}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nominal Pelunasan (Rp)</label>
                <input 
                  type="number" 
                  value={nominalPelunasan} 
                  onChange={(e) => setNominalPelunasan(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-purple-200 text-slate-800 font-black text-lg rounded-xl px-4 py-2.5 outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Metode Pembayaran</label>
                <select 
                  value={metodeBayar} 
                  onChange={(e) => setMetodeBayar(e.target.value)}
                  className="w-full bg-slate-50 border border-purple-200 text-slate-800 font-bold text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-600"
                >
                  <option>Tunai</option>
                  <option>Transfer</option>
                  <option>QRIS</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-purple-100 bg-slate-50 flex gap-2">
              <button 
                onClick={() => setIsModalPelunasanOpen(false)}
                className="flex-1 bg-white border border-purple-200 text-slate-600 hover:bg-purple-50 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handlePelunasan}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Lunas'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}