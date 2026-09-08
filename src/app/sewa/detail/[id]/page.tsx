'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, MessageCircle, FileText, User, 
  Calendar, ShoppingBag, CreditCard, Loader2, Printer, CheckCircle,
  PackageOpen, Upload
} from 'lucide-react';

export default function DetailSewaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [sewa, setSewa] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [isReturning, setIsReturning] = useState(false);
  const [isUploadingBukti, setIsUploadingBukti] = useState(false);
  const [hasUploadedPelunasan, setHasUploadedPelunasan] = useState(false);

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
          katalog_barang (id, nama_barang, stok, disewa_count)
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

  // PENGECEKAN TERLAMBAT BERBASIS WAKTU LOKAL
  const isTerlambat = (tanggalKembali: string, status: string) => {
    if (status === 'selesai' || !tanggalKembali) return false;
    try {
      let cleanStr = tanggalKembali.trim().replace('T', ' ');
      if (cleanStr.length === 10) cleanStr += ' 23:59';
      if (cleanStr.length > 16) cleanStr = cleanStr.substring(0, 16);

      const now = new Date();
      const yr = now.getFullYear();
      const mth = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hr = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const currentLocalStr = `${yr}-${mth}-${day} ${hr}:${min}`;

      return currentLocalStr > cleanStr;
    } catch (err) { return false; }
  };

  // FORMATTER TAMPILAN TANPA KONVERSI UTC
  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    let cleanStr = dateString.trim().replace('T', ' ');
    if (cleanStr.length > 16) cleanStr = cleanStr.substring(0, 16);
    
    if (cleanStr.length === 10) {
      const [y, m, d] = cleanStr.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
    }

    const [datePart, timePart] = cleanStr.split(' ');
    const [y, m, d] = datePart.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}, ${timePart} WIB`;
  };

  const handleUploadBukti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBukti(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `bukti-${id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('bukti-transfer')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('bukti-transfer')
        .getPublicUrl(fileName);

      const buktiUrl = publicUrlData.publicUrl;
      let finalUrl = buktiUrl;
      if (sewa.bukti_pembayaran) {
        finalUrl = `${sewa.bukti_pembayaran},${buktiUrl}`;
      }

      const { error: updateError } = await supabase
        .from('sewa')
        .update({ bukti_pembayaran: finalUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Bukti pembayaran baru berhasil ditambahkan!');
      setHasUploadedPelunasan(true); 
      fetchDetail(); 
    } catch (error: any) {
      toast.error('Gagal mengunggah bukti: ' + error.message);
    } finally {
      setIsUploadingBukti(false);
    }
  };

  const handleOpenReturnModal = () => {
    const method = (sewa.metode_pembayaran || '').toLowerCase();
    const isCash = method.includes('cash') || method.includes('tunai');
    
    if (!isCash && !sewa.bukti_pembayaran) {
      toast.error('Harap unggah bukti pembayaran Transfer/QRIS terlebih dahulu!', { duration: 4000 });
      return;
    }

    const initialReturnData = items.map(item => ({
      ...item, kondisi: 'siap_sewa' 
    }));
    setReturnItems(initialReturnData);
    setShowReturnModal(true);
  };

  const handleKondisiChange = (index: number, newKondisi: string) => {
    const updated = [...returnItems];
    updated[index].kondisi = newKondisi;
    setReturnItems(updated);
  };

  const submitPengembalian = async () => {
    setIsReturning(true);
    try {
      const { error: sewaErr } = await supabase.from('sewa').update({ status: 'selesai' }).eq('id', id);
      if (sewaErr) throw sewaErr;

      for (const item of returnItems) {
        const barangId = item.katalog_barang.id;
        const qty = item.qty;
        const kondisi = item.kondisi;

        const { data: kb } = await supabase.from('katalog_barang').select('stok, disewa_count').eq('id', barangId).single();
        const currentStok = kb?.stok || 0;
        const currentDisewaCount = kb?.disewa_count || 0;

        const newDisewaCount = currentDisewaCount + qty;
        const newStok = kondisi === 'siap_sewa' ? currentStok + qty : currentStok;

        await supabase.from('katalog_barang').update({ 
          stok: newStok, disewa_count: newDisewaCount 
        }).eq('id', barangId);

        if (kondisi !== 'siap_sewa') {
          await supabase.from('perawatan').insert([{
            barang_id: barangId, jenis: kondisi, qty: qty, catatan: `Dari pengembalian invoice: ${sewa.invoice}`, status: 'aktif'
          }]);
        }
      }

      toast.success('Pengembalian berhasil diproses!');
      setShowReturnModal(false);
      fetchDetail(); 

    } catch (error) {
      toast.error('Gagal memproses pengembalian barang.');
    } finally {
      setIsReturning(false);
    }
  };

  const handlePelunasan = async () => {
    const method = (sewa.metode_pembayaran || '').toLowerCase();
    const isCash = method.includes('cash') || method.includes('tunai');
    const buktiArray = sewa.bukti_pembayaran ? sewa.bukti_pembayaran.split(',') : [];
    
    if (!isCash && !hasUploadedPelunasan && buktiArray.length < 2) {
      if (!window.confirm('Sepertinya Anda belum mengunggah foto BUKTI PELUNASAN yang baru. Apakah yakin ingin melanjutkan tanpa bukti baru?')) {
        return; 
      }
    } else {
      if (!window.confirm('Apakah Anda yakin pelanggan ini sudah melunasi sisa tagihannya?')) return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from('sewa').update({ 
        dp: sewa.total_harga, status_pembayaran: 'diterima'
      }).eq('id', id);

      if (error) throw error;
      toast.success('Pembayaran berhasil dilunasi!');
      fetchDetail(); 
    } catch (error) {
      toast.error('Gagal memproses pelunasan.');
      setIsLoading(false);
    }
  };

  const handleKirimWA = () => { 
    let phone = sewa.no_wa.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    const pesan = `Halo Kak ${sewa.nama_penyewa},\n\nBerikut adalah ringkasan invoice/struk sewa dari HERAZEALIKHA.\nTerima kasih!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`, '_blank');
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
  
  const isMethodRequiresProof = sewa.metode_pembayaran && !sewa.metode_pembayaran.toLowerCase().includes('cash') && !sewa.metode_pembayaran.toLowerCase().includes('tunai');
  const buktiArray = sewa.bukti_pembayaran ? sewa.bukti_pembayaran.split(',') : [];
  
  const lateStatus = isTerlambat(sewa.tanggal_kembali, sewa.status);
  const displayStatus = lateStatus ? 'TERLAMBAT' : sewa.status;
  const statusColor = sewa.status === 'selesai' ? 'bg-green-100 text-green-700' :
                      lateStatus ? 'bg-red-100 text-red-700 border border-red-200' :
                      sewa.status === 'dibawa' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            /* Menghilangkan URL dan header default browser */
            @page { margin: 0; } 
            
            body { margin: 1cm; }
            body * { visibility: hidden; }
            #area-cetak, #area-cetak * { visibility: visible; }
            #area-cetak { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
            .print\\:hidden { display: none !important; }
          }
        `
      }} />

      <div id="area-cetak" className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-4xl mx-auto bg-white print:bg-white print:pb-0">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200 print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/sewa')} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200">
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
            <button onClick={handleKirimWA} className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm">
              <MessageCircle size={18} /> Chat WA
            </button>
            <button onClick={() => window.print()} className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm">
              <Printer size={18} /> Cetak (PDF)
            </button>
          </div>
        </div>

        <div className="hidden print:flex print:flex-col print:items-center text-center mb-6 pb-4 border-b-2 border-dashed border-gray-300">
          <img src="/logo.jpeg" alt="Logo" className="h-20 w-auto mb-2 object-contain" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} />
          <h1 className="text-2xl font-black text-black">HERAZEALIKHA</h1>
          <p className="text-sm text-gray-600">Jl. Purwo Km.11 GG.Koramil, Delitua - Medan</p>
          <p className="text-xs text-gray-500 mt-1">Invoice: {sewa.invoice}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 flex flex-col gap-4 print:border-gray-300 print:shadow-none print:p-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 print:border-gray-200">
              <User size={18} className="text-purple-600 print:text-black" /> Informasi Pelanggan
            </h3>
            <div className="space-y-3">
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">Nama Penyewa</p><p className="text-sm font-semibold text-slate-800">{sewa.nama_penyewa}</p></div>
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">No. WhatsApp</p><p className="text-sm font-semibold text-slate-800">{sewa.no_wa || '-'}</p></div>
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">Jaminan Identitas</p><p className="text-sm font-semibold text-slate-800">{sewa.jenis_jaminan || '-'} ({sewa.nomor_jaminan || '-'})</p></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 flex flex-col gap-4 print:border-gray-300 print:shadow-none print:p-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 print:border-gray-200">
              <Calendar size={18} className="text-purple-600 print:text-black" /> Jadwal & Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">Waktu Ambil</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDateTime(sewa.tanggal_bawa)}</p></div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Batas Kembali</p>
                <p className={`text-sm font-semibold mt-0.5 ${lateStatus ? 'text-red-600' : 'text-slate-800'}`}>{formatDateTime(sewa.tanggal_kembali)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Status Penyewaan</p>
                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg print:border print:border-gray-400 print:bg-white print:text-black ${statusColor}`}>
                  {displayStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden print:border-gray-300 print:shadow-none">
          <div className="p-5 border-b border-purple-100 bg-purple-50/50 print:bg-gray-100 print:border-gray-300">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 print:text-black">
              <ShoppingBag size={18} className="text-purple-600 print:text-black" /> Rincian Barang
            </h3>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600 print:text-black">
              <thead className="bg-white text-slate-700 font-semibold border-b border-purple-100 print:border-gray-300">
                <tr><th className="px-6 py-3">Nama Barang</th><th className="px-6 py-3 text-center">Harga Satuan</th><th className="px-6 py-3 text-center">Qty</th><th className="px-6 py-3 text-right">Subtotal</th></tr>
              </thead>
              <tbody className="divide-y divide-purple-50 print:divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 print:hover:bg-white">
                    <td className="px-6 py-4 font-semibold text-slate-800 print:text-black">{item.katalog_barang?.nama_barang || 'Item tidak ditemukan'}</td>
                    <td className="px-6 py-4 text-center">Rp {item.harga.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-center font-bold text-purple-700 print:text-black">{item.qty}x</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800 print:text-black">Rp {(item.harga * item.qty).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RINGKASAN PEMBAYARAN */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 ml-auto w-full md:w-[28rem] print:border-gray-300 print:shadow-none print:p-4 print:mt-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 mb-4 print:border-gray-200 print:text-black">
            <CreditCard size={18} className="text-purple-600 print:text-black" /> Ringkasan Pembayaran
          </h3>
          <div className="space-y-3 text-sm print:text-black">
            <div className="flex justify-between items-center text-slate-600 print:text-black"><span>Metode Bayar</span><span className="font-bold text-slate-800 print:text-black">{sewa.metode_pembayaran}</span></div>
            <div className="flex justify-between items-center text-slate-600 print:text-black"><span>Total Tagihan</span><span className="font-bold text-slate-800 print:text-black">Rp {total.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between items-center text-slate-600 print:text-black"><span>Sudah Dibayar (DP)</span><span className="font-bold text-green-600 print:text-black">Rp {dp.toLocaleString('id-ID')}</span></div>
            <div className="pt-3 mt-3 border-t border-dashed border-purple-200 print:border-gray-400 flex justify-between items-center">
              <span className="font-bold text-slate-800 print:text-black">Sisa Tagihan</span>
              <span className={`text-lg font-black print:text-black ${sisa > 0 ? 'text-red-600' : 'text-green-600'}`}>{sisa > 0 ? `Rp ${sisa.toLocaleString('id-ID')}` : 'LUNAS'}</span>
            </div>
            
            {/* FITUR UPLOAD BUKTI (MENAMPILKAN BANYAK GAMBAR) */}
            {isMethodRequiresProof && (
              <div className="pt-4 mt-3 border-t border-dashed border-purple-200 print:hidden">
                <span className="block font-bold text-slate-800 mb-2">Bukti Pembayaran</span>
                
                {buktiArray.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto mb-3 pb-2">
                    {buktiArray.map((url: string, idx: number) => (
                      <div key={idx} className="relative group shrink-0">
                        <a href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={`Bukti ${idx+1}`} className="w-24 h-24 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-opacity" />
                        </a>
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">
                          {idx === 0 ? 'Bukti DP' : `Pelunasan ${idx}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tombol Upload Bukti Pelunasan */}
                {(sisa > 0 || buktiArray.length === 0) && (
                  <div>
                    <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl cursor-pointer border border-purple-200 transition-colors">
                      {isUploadingBukti ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                      {isUploadingBukti ? 'Mengunggah...' : (buktiArray.length > 0 ? 'Unggah Bukti Pelunasan' : 'Unggah Bukti (Wajib)')}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadBukti} disabled={isUploadingBukti} />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1.5 text-center font-semibold">
                      {buktiArray.length > 0 ? '* Silakan unggah bukti khusus pelunasan (baru) jika via transfer.' : '* Bukti wajib diunggah untuk pelunasan/sewa.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {sisa > 0 && (
              <div className="pt-4 print:hidden">
                <button onClick={handlePelunasan} className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-green-100 text-slate-700 hover:text-green-700 font-bold py-3 rounded-xl transition-all shadow-sm text-sm border border-slate-200 hover:border-green-300">
                  <CheckCircle size={18} /> Konfirmasi Pelunasan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🔴 SYARAT & KETENTUAN (HANYA MUNCUL SAAT DICETAK PDF) */}
        <div className="hidden print:block mt-8 pt-4 border-t border-dashed border-gray-400">
          <h4 className="font-bold text-[11px] mb-2 text-black">Syarat & Ketentuan Penyewaan:</h4>
          <ol className="list-decimal pl-4 pr-2 text-[10px] text-black space-y-1 leading-tight">
            <li>Wajib membawa Identitas (KTP/dll) & melunasi pembayaran saat pengambilan barang.</li>
            <li>Uang muka (DP) atau sewa yang sudah dibayarkan tidak dapat dikembalikan / dibatalkan.</li>
            <li>Pengembalian barang wajib sesuai jadwal. Keterlambatan akan dikenakan denda / <i>charge</i> tambahan.</li>
            <li>Penyewa wajib menjaga barang. Segala bentuk kerusakan atau kehilangan menjadi tanggung jawab penyewa.</li>
            <li>Barang dikembalikan dalam keadaan apa adanya (Penyewa <b>tidak perlu</b> mencuci barang).</li>
            <li>Dengan menyewa, penyewa dianggap telah menyetujui seluruh ketentuan ini.</li>
          </ol>
          <p className="text-[10px] text-center font-bold mt-5 text-black">
            🤍 TERIMA KASIH sudah menyewa, menjaga, dan merawat barang kami 🤍
          </p>
        </div>

        {sewa.status === 'dibawa' && (
          <div className="mt-8 border-t border-purple-100 pt-8 print:hidden flex justify-end">
            <button 
              onClick={handleOpenReturnModal}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <PackageOpen size={20} />
              Proses Pengembalian Barang
            </button>
          </div>
        )}
      </div>

      {showReturnModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-purple-100 bg-purple-50/50">
              <h3 className="text-xl font-bold text-slate-800">Cek Kondisi Barang Kembali</h3>
              <p className="text-sm text-slate-500 mt-1">Pilih status barang. Barang rusak/kotor akan masuk daftar perawatan.</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {returnItems.map((item, index) => (
                <div key={item.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800">{item.katalog_barang?.nama_barang}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Disewa sebanyak: {item.qty} pcs</p>
                  </div>
                  
                  <select 
                    value={item.kondisi}
                    onChange={(e) => handleKondisiChange(index, e.target.value)}
                    className="w-full sm:w-48 px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="siap_sewa">✅ Aman (Siap Sewa)</option>
                    <option value="laundry">🧺 Perlu Laundry</option>
                    <option value="perbaikan">🔧 Perlu Perbaikan</option>
                    <option value="karantina">⚠️ Karantina (Rusak)</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button 
                disabled={isReturning}
                onClick={() => setShowReturnModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button 
                disabled={isReturning}
                onClick={submitPengembalian}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-pink-600 hover:bg-pink-700 transition-colors flex items-center gap-2"
              >
                {isReturning ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18} />}
                Simpan & Selesaikan Transaksi
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}