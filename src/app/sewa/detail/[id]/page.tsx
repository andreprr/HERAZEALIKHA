'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, MessageCircle, FileText, User, 
  Calendar, ShoppingBag, CreditCard, Loader2, Printer, CheckCircle,
  PackageOpen, Upload, X
} from 'lucide-react';

export default function DetailSewaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [sewa, setSewa] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  // State Pengembalian
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [isKelengkapanSesuai, setIsKelengkapanSesuai] = useState(false); 
  const [isReturning, setIsReturning] = useState(false);
  
  const [isUploadingBukti, setIsUploadingBukti] = useState(false);

  // 🔴 STATE MODAL PELUNASAN
  const [showPelunasanModal, setShowPelunasanModal] = useState(false);
  const [pelunasanMetode, setPelunasanMetode] = useState('Transfer');
  const [pelunasanFile, setPelunasanFile] = useState<File | null>(null);
  const [pelunasanPreview, setPelunasanPreview] = useState<string>('');
  const [isProcessingPelunasan, setIsProcessingPelunasan] = useState(false);

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

  // UPLOAD BUKTI (MANUAL)
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
    setIsKelengkapanSesuai(false);
    setShowReturnModal(true);
  };

  const handleKondisiChange = (index: number, newKondisi: string) => {
    const updated = [...returnItems];
    updated[index].kondisi = newKondisi;
    setReturnItems(updated);
  };

  const submitPengembalian = async () => {
    if (!isKelengkapanSesuai) {
      return toast.error('Harap centang konfirmasi kesesuaian barang!');
    }

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

        const newDisewaCount = Math.max(0, currentDisewaCount - qty);
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

  // 🔴 COMPRESS BUKTI PELUNASAN
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

  // 🔴 SUBMIT PELUNASAN (MIX PAYMENT)
  const submitPelunasan = async () => {
    setIsProcessingPelunasan(true);
    try {
      let buktiUrl = undefined;
      
      // Upload Bukti (jika Transfer/QRIS)
      if (pelunasanFile) {
        const fileName = `pelunasan_${sewa.invoice}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('bukti-transfer')
          .upload(fileName, pelunasanFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('bukti-transfer').getPublicUrl(fileName);
        buktiUrl = urlData.publicUrl;
      }
      
      const dpCurrent = Number(sewa.dp) || 0;
      const sisa = (Number(sewa.total_harga) || 0) - dpCurrent;
      
      // LOGIKA MIX PAYMENT (Jika metode awal beda dengan metode lunas)
      let finalMetode = pelunasanMetode;
      if (dpCurrent > 0 && sewa.metode_pembayaran !== pelunasanMetode && !(sewa.metode_pembayaran || '').startsWith('SPLIT|')) {
        finalMetode = `SPLIT|${sewa.metode_pembayaran}|${dpCurrent}|${pelunasanMetode}|${sisa}`;
      } else if ((sewa.metode_pembayaran || '').startsWith('SPLIT|')) {
        finalMetode = sewa.metode_pembayaran; // Keep if already split
      }

      // Gabung dengan bukti sebelumnya jika ada
      let finalBuktiUrl = sewa.bukti_pembayaran;
      if (buktiUrl) {
        finalBuktiUrl = sewa.bukti_pembayaran ? `${sewa.bukti_pembayaran},${buktiUrl}` : buktiUrl;
      }

      const payload: any = {
        dp: sewa.total_harga, 
        metode_pembayaran: finalMetode,
        status_pembayaran: 'diterima'
      };
      
      if (buktiUrl) payload.bukti_pembayaran = finalBuktiUrl;

      const { error } = await supabase.from('sewa').update(payload).eq('id', id);
      if (error) throw error;
      
      toast.success('Pelunasan berhasil diproses!');
      setShowPelunasanModal(false);
      setPelunasanFile(null);
      setPelunasanPreview('');
      fetchDetail();
    } catch(err) {
      toast.error('Gagal memproses pelunasan');
    } finally {
      setIsProcessingPelunasan(false);
    }
  };

  const handleKirimWA = () => { 
    let phone = sewa.no_wa.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    
    const itemList = items.map(item => 
      `- ${item.katalog_barang?.nama_barang} (${item.qty}x) : Rp ${(item.harga * item.qty).toLocaleString('id-ID')}`
    ).join('\n');

    const sisa = (sewa.total_harga || 0) - (sewa.dp || 0);

    const pesan = `*INVOICE HERAZEALIKHA*
No: ${sewa.invoice}
------------------------
*Pelanggan:* ${sewa.nama_penyewa}
*Waktu Ambil:* ${formatDateTime(sewa.tanggal_bawa)}
*Batas Kembali:* ${formatDateTime(sewa.tanggal_kembali)}
*Jaminan:* ${sewa.jenis_jaminan} - ${sewa.nomor_jaminan || '-'}
${sewa.kelengkapan ? `*Kelengkapan:* ${sewa.kelengkapan}\n` : ''}------------------------
*Rincian Barang:*
${itemList}
------------------------
*Total Tagihan:* Rp ${(sewa.total_harga || 0).toLocaleString('id-ID')}
*Sudah Dibayar:* Rp ${(sewa.dp || 0).toLocaleString('id-ID')}
*Sisa Tagihan:* Rp ${sisa.toLocaleString('id-ID')}
------------------------
Terima kasih telah mempercayakan sewa di HERAZEALIKHA!`;

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
  
  // Deteksi tampilan jika mix payment di rincian
  let displayMetode = sewa.metode_pembayaran;
  if ((displayMetode || '').startsWith('SPLIT|')) {
    const parts = displayMetode.split('|');
    displayMetode = `${parts[1]} & ${parts[3]} (Mix)`;
  }

  const isMethodRequiresProof = sewa.metode_pembayaran && !sewa.metode_pembayaran.toLowerCase().includes('cash') && !sewa.metode_pembayaran.toLowerCase().includes('tunai') && !(sewa.metode_pembayaran || '').startsWith('SPLIT|');
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
            @page { margin: 0; size: 80mm auto; } 
            body { margin: 0; padding: 0; background: white; }
            .print\\:hidden { display: none !important; }
            #thermal-receipt { 
              display: block !important; 
              width: 76mm; 
              margin: 0 auto;
              font-family: 'Courier New', Courier, monospace; 
              color: black;
            }
          }
        `
      }} />

      {/* TAMPILAN WEB */}
      <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-4xl mx-auto bg-white print:hidden">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200">
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
              <MessageCircle size={18} /> Kirim Struk ke WA
            </button>
            <button onClick={() => window.print()} className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm">
              <Printer size={18} /> Cetak Struk
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 flex flex-col gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3">
              <User size={18} className="text-purple-600" /> Informasi Pelanggan
            </h3>
            <div className="space-y-3">
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">Nama Penyewa</p><p className="text-sm font-semibold text-slate-800">{sewa.nama_penyewa}</p></div>
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">No. WhatsApp</p><p className="text-sm font-semibold text-slate-800">{sewa.no_wa || '-'}</p></div>
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">Penjamin & Identitas</p><p className="text-sm font-semibold text-slate-800">{sewa.jenis_jaminan || '-'} ({sewa.nomor_jaminan || '-'})</p></div>
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">Kelengkapan Manual</p><p className="text-sm font-semibold text-slate-800">{sewa.kelengkapan || '-'}</p></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 flex flex-col gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3">
              <Calendar size={18} className="text-purple-600" /> Jadwal & Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[11px] font-bold text-slate-500 uppercase">Waktu Ambil</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{formatDateTime(sewa.tanggal_bawa)}</p></div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Batas Kembali</p>
                <p className={`text-sm font-semibold mt-0.5 ${lateStatus ? 'text-red-600' : 'text-slate-800'}`}>{formatDateTime(sewa.tanggal_kembali)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Status Penyewaan</p>
                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${statusColor}`}>
                  {displayStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
          <div className="p-5 border-b border-purple-100 bg-purple-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag size={18} className="text-purple-600" /> Rincian Barang
            </h3>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white text-slate-700 font-semibold border-b border-purple-100">
                <tr><th className="px-6 py-3">Nama Barang</th><th className="px-6 py-3 text-center">Harga Satuan</th><th className="px-6 py-3 text-center">Qty</th><th className="px-6 py-3 text-right">Subtotal</th></tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{item.katalog_barang?.nama_barang || 'Item tidak ditemukan'}</td>
                    <td className="px-6 py-4 text-center">Rp {item.harga.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-center font-bold text-purple-700">{item.qty}x</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800">Rp {(item.harga * item.qty).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RINGKASAN PEMBAYARAN */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 ml-auto w-full md:w-[28rem]">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 mb-4">
            <CreditCard size={18} className="text-purple-600" /> Ringkasan Pembayaran
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center text-slate-600"><span>Metode Bayar</span><span className="font-bold text-slate-800">{displayMetode}</span></div>
            <div className="flex justify-between items-center text-slate-600"><span>Total Tagihan</span><span className="font-bold text-slate-800">Rp {total.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between items-center text-slate-600"><span>Sudah Dibayar (DP)</span><span className="font-bold text-green-600">Rp {dp.toLocaleString('id-ID')}</span></div>
            <div className="pt-3 mt-3 border-t border-dashed border-purple-200 flex justify-between items-center">
              <span className="font-bold text-slate-800">Sisa Tagihan</span>
              <span className={`text-lg font-black ${sisa > 0 ? 'text-red-600' : 'text-green-600'}`}>{sisa > 0 ? `Rp ${sisa.toLocaleString('id-ID')}` : 'LUNAS'}</span>
            </div>
            
            {/* FITUR UPLOAD BUKTI (FALLBACK) */}
            {isMethodRequiresProof && (
              <div className="pt-4 mt-3 border-t border-dashed border-purple-200">
                <span className="block font-bold text-slate-800 mb-2">Bukti Pembayaran</span>
                
                {buktiArray.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto mb-3 pb-2">
                    {buktiArray.map((url: string, idx: number) => (
                      <div key={idx} className="relative group shrink-0">
                        <a href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={`Bukti ${idx+1}`} className="w-24 h-24 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-opacity" />
                        </a>
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">
                          {idx === 0 ? 'Bukti Awal' : `Tambahan ${idx}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(sisa > 0 || buktiArray.length === 0) && (
                  <div>
                    <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl cursor-pointer border border-purple-200 transition-colors">
                      {isUploadingBukti ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                      {isUploadingBukti ? 'Mengunggah...' : 'Unggah Bukti Tambahan'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadBukti} disabled={isUploadingBukti} />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* 🔴 TOMBOL PELUNASAN (MEMANGGIL MODAL) */}
            {sisa > 0 && (
              <div className="pt-4">
                <button 
                  onClick={() => setShowPelunasanModal(true)} 
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-green-100 text-slate-700 hover:text-green-700 font-bold py-3 rounded-xl transition-all shadow-sm text-sm border border-slate-200 hover:border-green-300"
                >
                  <CheckCircle size={18} /> Konfirmasi Pelunasan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TOMBOL PENGEMBALIAN */}
        {(sewa.status === 'dibawa' || lateStatus) && (
          <div className="mt-8 border-t border-purple-100 pt-8 flex justify-end">
            <button 
              onClick={handleOpenReturnModal}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <PackageOpen size={20} />
              Selesaikan Barang (Kembali)
            </button>
          </div>
        )}
      </div>

      {/* STRUK THERMAL */}
      <div id="thermal-receipt" className="hidden print:block text-black p-2 bg-white">
        <div className="text-center mb-4">
          <img src="/logo.jpeg" alt="Logo" className="w-16 mx-auto mb-1 grayscale" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} />
          <h1 className="text-lg font-black tracking-widest">HERAZEALIKHA</h1>
          <p className="text-[10px]">Jl. Purwo Km.11 GG.Koramil, Delitua<br/>Medan</p>
          <p className="text-[10px] mt-1">Invoice: {sewa.invoice}</p>
        </div>

        <div className="border-b border-dashed border-black mb-3"></div>

        <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
          <div>
            <p className="font-bold uppercase underline">Informasi Pelanggan</p>
            <p className="mt-1 font-bold text-[9px] uppercase">NAMA PENYEWA</p>
            <p className="leading-tight">{sewa.nama_penyewa}</p>
            <p className="mt-1 font-bold text-[9px] uppercase">NO. WHATSAPP</p>
            <p className="leading-tight">{sewa.no_wa || '-'}</p>
            <p className="mt-1 font-bold text-[9px] uppercase">JAMINAN IDENTITAS</p>
            <p className="leading-tight">{sewa.jenis_jaminan || '-'} ({sewa.nomor_jaminan || '-'})</p>
          </div>
          <div>
            <p className="font-bold uppercase underline">Jadwal & Status</p>
            <div className="flex gap-2 mt-1">
              <div>
                <p className="font-bold text-[9px] uppercase">WAKTU AMBIL</p>
                <p className="leading-tight">{formatDateTime(sewa.tanggal_bawa).replace(' ', '\n')}</p>
              </div>
              <div>
                <p className="font-bold text-[9px] uppercase">BATAS KEMBALI</p>
                <p className="leading-tight">{formatDateTime(sewa.tanggal_kembali).replace(' ', '\n')}</p>
              </div>
            </div>
            <p className="mt-2 font-bold text-[9px] uppercase">STATUS PENYEWAAN</p>
            <p className="leading-tight font-bold border border-black inline-block px-1 mt-0.5">{displayStatus.toUpperCase()}</p>
          </div>
        </div>

        <div className="border-b border-dashed border-black mb-3"></div>

        <div className="text-[11px] mb-3">
          <p className="font-bold mb-2 flex items-center gap-1">Rincian Barang</p>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black">
                <th className="font-normal pb-1">Nama Barang</th>
                <th className="font-normal pb-1 text-right">Harga Satuan</th>
                <th className="font-normal pb-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-1 align-top">{item.katalog_barang?.nama_barang}</td>
                  <td className="py-2 px-1 text-right align-top">Rp {item.harga.toLocaleString('id-ID')}</td>
                  <td className="py-2 pl-1 text-right font-bold align-top">{item.qty}x</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {sewa.kelengkapan && (
             <p className="mt-2 pt-2 border-t border-dotted border-black text-[10px]">
               <span className="font-bold">Kelengkapan Manual:</span> {sewa.kelengkapan}
             </p>
          )}
        </div>

        <div className="border-b border-dashed border-black mb-3"></div>

        <div className="text-[11px] mb-4 space-y-1">
          <p className="font-bold mb-2">Ringkasan Pembayaran</p>
          <div className="flex justify-between"><span>Metode Bayar</span><span>{displayMetode}</span></div>
          <div className="flex justify-between"><span>Total Tagihan</span><span>Rp {total.toLocaleString('id-ID')}</span></div>
          <div className="flex justify-between"><span>Sudah Dibayar (DP)</span><span>Rp {dp.toLocaleString('id-ID')}</span></div>
          <div className="flex justify-between font-bold text-[12px] pt-1 mt-1 border-t border-black">
            <span>Sisa Tagihan</span><span>{sisa > 0 ? `Rp ${sisa.toLocaleString('id-ID')}` : 'LUNAS'}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-black mb-3"></div>

        <div className="text-[9px] leading-tight">
          <p className="font-bold mb-1">Syarat & Ketentuan Penyewaan:</p>
          <ol className="list-decimal pl-3 pr-1 space-y-1">
            <li>Wajib membawa identitas (KTP/dll) & melunasi pembayaran saat pengambilan barang.</li>
            <li>Uang muka (DP) atau sewa yang sudah dibayarkan tidak dapat dikembalikan / dibatalkan.</li>
            <li>Pengembalian barang wajib sesuai jadwal. Keterlambatan dikenakan denda / charge tambahan.</li>
            <li>Segala bentuk kerusakan atau kehilangan barang menjadi tanggung jawab penyewa sepenuhnya.</li>
            <li>Barang dikembalikan dalam keadaan apa adanya (Penyewa tidak perlu mencuci barang).</li>
            <li>Dengan menyewa, penyewa dianggap telah menyetujui seluruh ketentuan ini.</li>
          </ol>
          <p className="text-center font-bold mt-4 mb-8">
            TERIMA KASIH sudah menyewa, menjaga, dan merawat barang kami
          </p>
        </div>
      </div>

      {/* 🔴 MODAL PELUNASAN TAGIHAN */}
      {showPelunasanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-green-50/50">
              <h3 className="font-bold text-green-700 flex items-center gap-2">
                <CheckCircle size={18} /> Proses Pelunasan Tagihan
              </h3>
              <button onClick={() => setShowPelunasanModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Total Tagihan:</span>
                <span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Sudah Dibayar (DP):</span>
                <span>Rp {dp.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                <span>Sisa Pelunasan:</span>
                <span>Rp {sisa.toLocaleString('id-ID')}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pilih Metode Pelunasan</label>
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
              <button onClick={() => setShowPelunasanModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">Batal</button>
              <button 
                onClick={submitPelunasan} 
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

      {/* MODAL PENGEMBALIAN */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-purple-100 bg-purple-50/50">
              <h3 className="text-xl font-bold text-slate-800">Cek Kondisi Barang Kembali</h3>
              <p className="text-sm text-slate-500 mt-1">Pastikan barang dan aksesoris kembali utuh. Pilih status untuk setiap barang.</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-2">
                <p className="text-sm font-bold text-amber-800 mb-1">Pengecekan Kelengkapan</p>
                <p className="text-xs text-amber-700 mb-4">Catatan Kelengkapan: <b>{sewa.kelengkapan || 'Tidak ada catatan kelengkapan (Aman)'}</b></p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="pt-0.5">
                    <input 
                      type="checkbox" 
                      checked={isKelengkapanSesuai} 
                      onChange={(e) => setIsKelengkapanSesuai(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">
                    Ya, saya telah memeriksa bahwa semua barang utama beserta kelengkapannya telah sesuai dan lengkap dikembalikan.
                  </span>
                </label>
              </div>

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
                disabled={isReturning || !isKelengkapanSesuai}
                onClick={submitPengembalian}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:hover:bg-pink-600 transition-colors flex items-center gap-2"
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