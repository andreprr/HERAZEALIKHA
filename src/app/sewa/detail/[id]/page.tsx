'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, User, Phone, IdCard, Calendar, Clock, 
  Package, Wallet, Printer, Loader2, CreditCard
} from 'lucide-react';

export default function DetailSewaPage() {
  const params = useParams();
  const id = params.id as string;

  const [sewa, setSewa] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data, error } = await supabase
          .from('sewa')
          .select(`*, sewa_items ( qty, harga, katalog_barang ( nama_barang, gambar_url ) )`)
          .eq('id', id).single();
        if (error) throw error;
        if (data) setSewa(data);
      } catch (error: any) {
        toast.error('Gagal memuat detail transaksi.');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[70vh]">
      <Loader2 size={40} className="text-pink-600 animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Memuat detail transaksi...</p>
    </div>
  );

  if (!sewa) return <div className="p-8 text-center text-slate-500">Data tidak ditemukan.</div>;

  const sisaBayar = sewa.total_harga - sewa.dp;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 min-h-screen pb-24 pt-2 w-full max-w-4xl mx-auto overflow-x-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white !important; color: black !important; }
          .print-hidden { display: none !important; }
        }
      `}} />

      <div className="flex items-center justify-between print-hidden gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/sewa" className="p-2 bg-white border border-pink-200 rounded-xl hover:bg-pink-50 transition-colors shadow-sm shrink-0">
            <ArrowLeft size={18} className="text-slate-600" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-800 truncate">Detail Transaksi</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{sewa.invoice}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl transition-colors shadow-sm shrink-0">
          <Printer size={16} /> <span className="hidden sm:inline">Cetak Struk</span>
        </button>
      </div>

      <div id="printable-invoice" className="bg-white rounded-2xl shadow-sm border border-pink-200 p-4 sm:p-6 md:p-10 w-full overflow-hidden">
        
        <div className="hidden print:block text-center border-b-2 border-slate-800 pb-6 mb-8">
          <h1 className="text-3xl font-extrabold tracking-widest text-black">HERAZEALIKHA</h1>
          <p className="text-sm font-medium mt-1 text-black">Sewa Gaun, Kebaya, dan Jas Pengantin Premium</p>
          <p className="text-xs mt-1 text-black">Rancaekek, Jawa Barat | Hubungi: {sewa.no_wa} (Customer Service)</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 sm:mb-8 border-b border-pink-100 pb-4 sm:pb-6 print:border-slate-300">
          <div>
            <p className="text-xs text-slate-500 print:text-gray-600 uppercase tracking-wider font-bold mb-1">No. Invoice</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-800 print:text-black break-all">{sewa.invoice}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border w-max ${
            sewa.status === 'booked' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            sewa.status === 'dibawa' ? 'bg-pink-50 text-pink-700 border-pink-200' :
            'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            Status: {sewa.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
          <div className="space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-pink-600 print:text-gray-500 uppercase tracking-wider border-b border-pink-100 print:border-gray-300 pb-2">Informasi Penyewa</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-50 print:bg-white print:border flex items-center justify-center text-pink-600 print:text-black shrink-0"><User size={18}/></div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 print:text-gray-600">Nama Lengkap</p>
                <p className="font-semibold text-slate-800 print:text-black truncate">{sewa.nama_penyewa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-50 print:bg-white print:border flex items-center justify-center text-pink-600 print:text-black shrink-0"><Phone size={18}/></div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 print:text-gray-600">WhatsApp</p>
                <p className="font-semibold text-slate-800 print:text-black truncate">{sewa.no_wa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-50 print:bg-white print:border flex items-center justify-center text-pink-600 print:text-black shrink-0"><IdCard size={18}/></div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 print:text-gray-600">Jaminan Ditahan</p>
                <p className="font-semibold text-slate-800 print:text-black truncate">{sewa.jenis_jaminan} - {sewa.no_jaminan}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-pink-600 print:text-gray-500 uppercase tracking-wider border-b border-pink-100 print:border-gray-300 pb-2">Jadwal Sewa</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-50 print:bg-white print:border flex items-center justify-center text-pink-600 print:text-black shrink-0"><Calendar size={18}/></div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 print:text-gray-600">Pengambilan</p>
                <p className="font-semibold text-slate-800 print:text-black truncate">{sewa.tanggal_bawa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 print:bg-white print:border flex items-center justify-center text-red-500 print:text-black shrink-0"><Clock size={18}/></div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 print:text-gray-600">Tenggat Kembali</p>
                <p className="font-semibold text-slate-800 print:text-black truncate">{sewa.tanggal_kembali} - {sewa.jam_kembali} WIB</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 w-full">
          <h3 className="text-sm font-bold text-pink-600 print:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Package size={16}/> Daftar Pesanan</h3>
          <div className="rounded-xl border border-pink-100 print:border-slate-400 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-pink-50 print:bg-slate-100 border-b border-pink-100 print:border-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-slate-700 print:text-black whitespace-nowrap">Item</th>
                    <th className="px-4 py-3 text-center text-slate-700 print:text-black whitespace-nowrap">Harga</th>
                    <th className="px-4 py-3 text-center text-slate-700 print:text-black whitespace-nowrap">Qty</th>
                    <th className="px-4 py-3 text-right text-slate-700 print:text-black whitespace-nowrap">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50 print:divide-slate-300">
                  {sewa.sewa_items?.map((item: any, index: number) => (
                    <tr key={index} className="print:bg-white hover:bg-pink-50/30 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800 print:text-black">{item.katalog_barang?.nama_barang}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-700 print:text-black whitespace-nowrap">Rp {item.harga.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-800 print:text-black">{item.qty}</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-800 print:text-black whitespace-nowrap">Rp {(item.harga * item.qty).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-pink-50/50 print:bg-white rounded-xl p-4 sm:p-5 border border-pink-100 print:border-slate-400 flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <div className="flex flex-row items-center justify-between w-full sm:w-auto gap-4 sm:gap-6">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 print:text-gray-600 mb-1 flex items-center gap-1"><Wallet size={14}/> Total Harga</p>
              <p className="font-bold text-slate-800 print:text-black text-sm sm:text-lg">Rp {sewa.total_harga.toLocaleString('id-ID')}</p>
            </div>
            <div className="w-px h-8 bg-pink-200 print:bg-slate-400"></div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500 print:text-gray-600 mb-1 flex items-center gap-1"><CreditCard size={14}/> DP / Panjar</p>
              <p className="font-bold text-slate-800 print:text-black text-sm sm:text-lg">Rp {sewa.dp.toLocaleString('id-ID')}</p>
            </div>
          </div>
          
          <div className="w-full sm:w-auto text-center sm:text-right p-4 bg-white print:bg-slate-50 rounded-xl border border-pink-200 print:border-slate-300 shadow-sm print:shadow-none mt-2 sm:mt-0">
            <p className="text-xs sm:text-sm font-semibold text-slate-500 print:text-black mb-0.5">Status Pembayaran</p>
            <p className={`text-xl sm:text-2xl font-black tracking-tight ${sisaBayar <= 0 ? 'text-green-600 print:text-green-600' : 'text-red-500 print:text-red-600'}`}>
              {sisaBayar > 0 ? `KURANG: Rp ${sisaBayar.toLocaleString('id-ID')}` : 'LUNAS'}
            </p>
          </div>
        </div>

        <div className="hidden print:block mt-12 text-center text-sm text-black">
          <p>Terima kasih telah mempercayakan momen spesial Anda bersama HERAZEALIKHA.</p>
          <p className="text-xs text-gray-500 mt-1">Harap membawa struk ini saat pengembalian barang.</p>
        </div>

      </div>
    </div>
  );
}