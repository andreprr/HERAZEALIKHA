'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, MessageCircle, FileText, User, 
  Calendar, ShoppingBag, CreditCard, Loader2, ShieldCheck, Phone, Printer, CheckCircle
} from 'lucide-react';

export default function DetailSewaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [sewa, setSewa] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const { data: sewaData, error: sewaError } = await supabase
        .from('sewa')
        .select('*')
        .eq('id', id)
        .single();

      if (sewaError) throw sewaError;
      setSewa(sewaData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('sewa_items')
        .select(`
          *,
          katalog_barang (nama_barang)
        `)
        .eq('sewa_id', id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

    } catch (error: any) {
      toast.error('Gagal memuat detail transaksi.');
      router.push('/sewa');
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi Kirim WA (Teks sangat bersih tanpa simbol apapun)
  const handleKirimWA = () => {
    if (!sewa) return;
    if (!sewa.no_wa || sewa.no_wa === '-') {
      toast.error('Nomor WhatsApp pelanggan tidak tersedia.');
      return;
    }

    let phone = sewa.no_wa.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }

    const pesan = `Halo Kak ${sewa.nama_penyewa},
    
Berikut adalah lampiran PDF struk invoice penyewaan perlengkapan dari HERAZEALIKHA. 

Mohon disimpan dan ditunjukkan saat pengambilan atau pengembalian barang ya Kak. Terima kasih!`;

    const encodedPesan = encodeURIComponent(pesan);
    window.open(`https://wa.me/${phone}?text=${encodedPesan}`, '_blank');
  };

  // Fungsi Cetak Struk (Simpan sebagai PDF)
  const handleCetak = () => {
    window.print();
  };

  // Fungsi Pelunasan Pembayaran
  const handlePelunasan = async () => {
    if (!window.confirm('Apakah Anda yakin pelanggan ini sudah melunasi sisa tagihannya?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('sewa')
        .update({ 
          dp: sewa.total_harga, // Update DP menjadi sama dengan total harga (Lunas)
          status_pembayaran: 'diterima'
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Pembayaran berhasil dilunasi!');
      fetchDetail(); // Refresh data
    } catch (error) {
      toast.error('Gagal memproses pelunasan.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] bg-white">
        <Loader2 size={40} className="text-purple-700 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat detail transaksi...</p>
      </div>
    );
  }

  if (!sewa) return null;

  const total = sewa.total_harga || 0;
  const dp = sewa.dp || 0;
  const sisa = total - dp;

  return (
    <>
      {/* CSS Injection Khusus Cetak: Menyembunyikan Sidebar & Topbar secara paksa */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #area-cetak, #area-cetak * {
              visibility: visible;
            }
            #area-cetak {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `
      }} />

      <div id="area-cetak" className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-4xl mx-auto bg-white print:bg-white print:pb-0">
        
        {/* HEADER & AKSI - Disembunyikan saat dicetak (print:hidden) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/sewa')}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-purple-700" size={22} /> Detail Transaksi
              </h2>
              <p className="text-sm font-semibold text-slate-500 mt-1">{sewa.invoice}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleKirimWA}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm"
            >
              <MessageCircle size={18} />
              Buka Chat WA
            </button>

            <button 
              onClick={handleCetak}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm"
            >
              <Printer size={18} />
              Cetak (Save PDF)
            </button>
          </div>
        </div>

        {/* TAMPILAN KHUSUS CETAK: Header Toko */}
        <div className="hidden print:flex print:flex-col print:items-center text-center mb-6 pb-4 border-b-2 border-dashed border-gray-300">
          <img 
            src="/logo.jpeg" 
            alt="Hera Zealikha Logo" 
            className="h-20 w-auto mb-2 object-contain"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} 
          />
          <h1 className="text-2xl font-black text-black">Hera Zealikha</h1>
          <p className="text-sm text-gray-600">Sewa Gaun & Perlengkapan</p>
          <p className="text-xs text-gray-500 mt-1">Invoice: {sewa.invoice}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 flex flex-col gap-4 print:border-gray-300 print:shadow-none print:p-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 print:border-gray-200">
              <User size={18} className="text-purple-600 print:text-black" /> Informasi Pelanggan
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase print:text-gray-500">Nama Penyewa</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 print:text-black">{sewa.nama_penyewa}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase print:text-gray-500">No. WhatsApp</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone size={14} className="text-slate-400 print:text-gray-500" />
                  <p className="text-sm font-semibold text-slate-800 print:text-black">{sewa.no_wa || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase print:text-gray-500">Jaminan Identitas</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck size={14} className="text-purple-500 print:text-gray-500" />
                  <p className="text-sm font-semibold text-slate-800 print:text-black">{sewa.jenis_jaminan || '-'} ({sewa.nomor_jaminan || '-'})</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 flex flex-col gap-4 print:border-gray-300 print:shadow-none print:p-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 print:border-gray-200">
              <Calendar size={18} className="text-purple-600 print:text-black" /> Jadwal & Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase print:text-gray-500">Tanggal Ambil</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 print:text-black">{new Date(sewa.tanggal_bawa).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase print:text-gray-500">Tanggal Kembali</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 print:text-black">{new Date(sewa.tanggal_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-1 print:text-gray-500">Status Penyewaan</p>
                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg print:border print:border-gray-400 print:bg-white print:text-black ${
                  sewa.status === 'selesai' ? 'bg-green-100 text-green-700' :
                  sewa.status === 'dibawa' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {sewa.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TABEL BARANG YANG DISEWA */}
        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden print:border-gray-300 print:shadow-none">
          <div className="p-5 border-b border-purple-100 bg-purple-50/50 print:bg-gray-100 print:border-gray-300">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 print:text-black">
              <ShoppingBag size={18} className="text-purple-600 print:text-black" /> Rincian Barang
            </h3>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 print:text-black">
              <thead className="bg-white text-slate-700 font-semibold border-b border-purple-100 print:border-gray-300">
                <tr>
                  <th className="px-6 py-3">Nama Barang</th>
                  <th className="px-6 py-3 text-center">Harga Satuan</th>
                  <th className="px-6 py-3 text-center">Qty</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50 print:divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 print:hover:bg-white">
                    <td className="px-6 py-4 font-semibold text-slate-800 print:text-black">{item.katalog_barang?.nama_barang || 'Item tidak ditemukan'}</td>
                    <td className="px-6 py-4 text-center">Rp {item.harga.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-center font-bold text-purple-700 print:text-black">{item.qty}x</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800 print:text-black">
                      Rp {(item.harga * item.qty).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RINGKASAN PEMBAYARAN & TOMBOL PELUNASAN */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 ml-auto w-full md:w-96 print:border-gray-300 print:shadow-none print:p-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 mb-4 print:border-gray-200 print:text-black">
            <CreditCard size={18} className="text-purple-600 print:text-black" /> Ringkasan Pembayaran
          </h3>
          <div className="space-y-3 text-sm print:text-black">
            <div className="flex justify-between items-center text-slate-600 print:text-black">
              <span>Metode Bayar</span>
              <span className="font-semibold text-slate-800 print:text-black">{sewa.metode_pembayaran}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 print:text-black">
              <span>Total Tagihan</span>
              <span className="font-bold text-slate-800 print:text-black">Rp {total.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 print:text-black">
              <span>Sudah Dibayar (DP)</span>
              <span className="font-bold text-green-600 print:text-black">Rp {dp.toLocaleString('id-ID')}</span>
            </div>
            
            <div className="pt-3 mt-3 border-t border-dashed border-purple-200 print:border-gray-400 flex justify-between items-center">
              <span className="font-bold text-slate-800 print:text-black">Sisa Tagihan</span>
              <span className={`text-lg font-black print:text-black ${sisa > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {sisa > 0 ? `Rp ${sisa.toLocaleString('id-ID')}` : 'LUNAS'}
              </span>
            </div>
            
            {/* TOMBOL PELUNASAN */}
            {sisa > 0 && (
              <div className="pt-4 print:hidden">
                <button 
                  onClick={handlePelunasan}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all shadow-sm text-sm"
                >
                  <CheckCircle size={18} /> Konfirmasi Pelunasan
                </button>
              </div>
            )}

          </div>
        </div>

        {/* FOOTER KHUSUS CETAK */}
        <div className="hidden print:block text-center mt-12 text-sm text-gray-500">
          <p>Terima kasih telah menyewa di Hera Zealikha.</p>
          <p>Barang yang sudah disewa harus dikembalikan sesuai tanggal yang telah disepakati.</p>
        </div>

      </div>
    </>
  );
}