'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Save, User, Calendar, CreditCard, 
  Loader2, ShieldCheck
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
  const [nomorJaminan, setNomorJaminan] = useState('');

  // State Form Waktu
  const [tanggalBawa, setTanggalBawa] = useState('');
  const [jamBawa, setJamBawa] = useState('');
  const [tanggalKembali, setTanggalKembali] = useState('');
  const [jamKembali, setJamKembali] = useState('');

  // State Finansial
  const [dp, setDp] = useState<number | ''>('');
  const [metodePembayaran, setMetodePembayaran] = useState('Tunai');

  useEffect(() => {
    if (id) fetchSewaDetail();
  }, [id]);

  // 🔴 FUNGSI PEMISAH TANGGAL & JAM YANG AMAN (ANTI ERROR FORMAT)
  const parseDateTime = (dbString: string | null) => {
    if (!dbString) return { date: '', time: '12:00' };
    
    let cleanStr = dbString.trim().replace('T', ' ');
    
    if (cleanStr.includes(' ')) {
      const parts = cleanStr.split(' ');
      // Ambil maksimal 5 karakter (HH:mm) agar aman jika DB menyimpan detik (HH:mm:ss)
      return { date: parts[0], time: parts[1].substring(0, 5) };
    }
    
    return { date: cleanStr, time: '12:00' };
  };

  const fetchSewaDetail = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sewa')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setInvoice(data.invoice);
        setNamaPenyewa(data.nama_penyewa || '');
        setNoWa(data.no_wa || '');
        setJenisJaminan(data.jenis_jaminan || 'KTP');
        setNomorJaminan(data.nomor_jaminan || '');

        const bawaParsed = parseDateTime(data.tanggal_bawa);
        setTanggalBawa(bawaParsed.date);
        setJamBawa(bawaParsed.time);

        const kembaliParsed = parseDateTime(data.tanggal_kembali);
        setTanggalKembali(kembaliParsed.date);
        setJamKembali(kembaliParsed.time);

        setDp(data.dp || 0);
        setMetodePembayaran(data.metode_pembayaran || 'Tunai');
      }
    } catch (error) {
      toast.error('Gagal memuat data transaksi');
      router.push('/sewa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPenyewa || !tanggalBawa || !tanggalKembali || !jamBawa || !jamKembali) {
      return toast.error('Harap lengkapi nama pelanggan dan waktu penyewaan!');
    }

    setIsSubmitting(true);
    try {
      // Gabungkan kembali tanggal dan jam untuk disimpan ke DB sebagai Teks Murni (YYYY-MM-DD HH:mm)
      const waktuBawa = `${tanggalBawa} ${jamBawa}`;
      const waktuKembali = `${tanggalKembali} ${jamKembali}`;

      const { error } = await supabase
        .from('sewa')
        .update({
          nama_penyewa: namaPenyewa,
          no_wa: noWa,
          jenis_jaminan: jenisJaminan,
          nomor_jaminan: nomorJaminan,
          tanggal_bawa: waktuBawa,
          tanggal_kembali: waktuKembali,
          dp: Number(dp) || 0,
          metode_pembayaran: metodePembayaran
        })
        .eq('id', id);

      if (error) throw error;

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
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-3xl mx-auto bg-white">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200">
        <button onClick={() => router.back()} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Edit Transaksi</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">{invoice}</p>
        </div>
      </div>

      {/* FORM EDIT */}
      <form onSubmit={handleUpdate} className="space-y-6">
        
        {/* CARD PELANGGAN */}
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
                value={jenisJaminan} onChange={(e) => setJenisJaminan(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800 transition-colors"
              >
                <option value="KTP">KTP</option>
                <option value="SIM">SIM</option>
                <option value="Kartu Pelajar">Kartu Pelajar</option>
                <option value="Paspor">Paspor</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nomor Jaminan</label>
              <input 
                type="text" value={nomorJaminan} onChange={(e) => setNomorJaminan(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* CARD WAKTU & JADWAL */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 mb-4">
            <Calendar size={18} className="text-purple-600" /> Jadwal Sewa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Waktu Ambil</label>
              <div className="flex gap-2">
                <input 
                  type="date" value={tanggalBawa} onChange={(e) => setTanggalBawa(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800"
                  required
                />
                <input 
                  type="time" value={jamBawa} onChange={(e) => setJamBawa(e.target.value)}
                  className="w-28 px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase text-red-500">Batas Kembali</label>
              <div className="flex gap-2">
                <input 
                  type="date" value={tanggalKembali} onChange={(e) => setTanggalKembali(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 focus:bg-white focus:border-red-500 focus:outline-none text-sm font-semibold text-red-700"
                  required
                />
                <input 
                  type="time" value={jamKembali} onChange={(e) => setJamKembali(e.target.value)}
                  className="w-28 px-2 py-2.5 rounded-xl border border-red-200 bg-red-50 focus:bg-white focus:border-red-500 focus:outline-none text-sm font-semibold text-red-700"
                  required
                />
              </div>
            </div>

          </div>
        </div>

        {/* CARD FINANSIAL */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-purple-100 pb-3 mb-4">
            <CreditCard size={18} className="text-purple-600" /> Metode & Pembayaran
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sudah Dibayar (DP / Lunas)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                <input 
                  type="number" value={dp} onChange={(e) => setDp(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">*Ubah nominal jika pelanggan menambah pembayaran.</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Metode Bayar</label>
              <select 
                value={metodePembayaran} onChange={(e) => setMetodePembayaran(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:outline-none text-sm font-semibold text-slate-800"
              >
                <option value="Tunai">Tunai</option>
                <option value="Transfer">Transfer</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
          </div>
        </div>

        {/* AKSI SIMPAN */}
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
    </div>
  );
}