'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowRightLeft, FileText, Power, Wallet, Banknote, 
  CreditCard, CheckCircle, Clock, QrCode, Loader2 
} from 'lucide-react';

export default function ShiftKasPage() {
  const [transaksiShift, setTransaksiShift] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mengambil data transaksi KHUSUS HARI INI (Shift aktif)
  const fetchShiftData = async () => {
    setIsLoading(true);
    try {
      // Ambil tanggal hari ini (YYYY-MM-DD)
      const hariIni = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sewa')
        .select('*')
        .gte('created_at', `${hariIni}T00:00:00.000Z`)
        .lte('created_at', `${hariIni}T23:59:59.999Z`);

      if (error) throw error;
      if (data) setTransaksiShift(data);
    } catch (error: any) {
      toast.error('Gagal mengambil data shift: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, []);

  // Fungsi Konfirmasi Pembayaran Non-Tunai
  const handleKonfirmasi = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sewa')
        .update({ status_pembayaran: 'diterima' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Pembayaran berhasil dikonfirmasi!');
      
      // Update state lokal tanpa harus refresh halaman
      setTransaksiShift(prev => 
        prev.map(item => item.id === id ? { ...item, status_pembayaran: 'diterima' } : item)
      );
    } catch (error: any) {
      toast.error('Gagal mengonfirmasi pembayaran.');
    }
  };

  // ==============================================
  // KALKULASI DATA DINAMIS
  // ==============================================
  
  let uangKasMasuk = 0;
  let uangNonTunai = 0;
  const rincianMetode: Record<string, number> = {};
  const listNonTunai: any[] = [];

  transaksiShift.forEach(item => {
    // Jika metode_pembayaran kosong, anggap sebagai 'Tunai'
    const metode = item.metode_pembayaran || 'Tunai';
    const nominal = item.dp || 0; // Menggunakan DP sebagai acuan uang masuk awal

    // Tambah ke rincian per metode
    if (!rincianMetode[metode]) rincianMetode[metode] = 0;
    rincianMetode[metode] += nominal;

    if (metode.toLowerCase() === 'tunai') {
      uangKasMasuk += nominal;
    } else {
      uangNonTunai += nominal;
      listNonTunai.push(item); // Masukkan ke tabel konfirmasi
    }
  });

  // Asumsi saldo awal di laci adalah Rp 500.000
  const saldoAwal = 500000;
  const uangSeharusnya = saldoAwal + uangKasMasuk;
  const jumlahMenunggu = listNonTunai.filter(item => item.status_pembayaran === 'menunggu' || !item.status_pembayaran).length;

  return (
    <div className="flex flex-col gap-6 h-full pb-8 pt-2 w-full max-w-full overflow-x-hidden">
      
      {/* 1. BAGIAN ATAS: HEADER & TOMBOL AKSI */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-800 truncate">Shift & Kas</h2>
          <p className="text-sm text-slate-500 mt-1 truncate">Kelola saldo laci kasir dan pantau pembayaran masuk hari ini.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 bg-white hover:bg-pink-50 border border-pink-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm">
            <ArrowRightLeft size={16} className="text-blue-500" />
            Mutasi Laci
          </button>
          
          <button className="flex items-center gap-2 bg-white hover:bg-pink-50 border border-pink-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm">
            <FileText size={16} className="text-amber-500" />
            Laporan
          </button>
          
          <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm ml-auto lg:ml-2">
            <Power size={16} />
            Tutup Shift
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-pink-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Menghitung kalkulasi shift hari ini...</p>
        </div>
      ) : (
        <>
          {/* 2. BAGIAN TENGAH: RINGKASAN SALDO (3 KARTU) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-200 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0">
                  <Wallet size={22} />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uang Seharusnya Di Laci</p>
              </div>
              <p className="text-3xl font-black text-slate-800">Rp {uangSeharusnya.toLocaleString('id-ID')}</p>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Saldo awal (Rp 500rb) + Penerimaan Tunai</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-200 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none text-green-600">
                <Banknote size={100} />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2.5 bg-green-100 rounded-xl text-green-600 shrink-0">
                  <Banknote size={22} />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uang Masuk (Kas Tunai)</p>
              </div>
              <p className="text-3xl font-black text-slate-800 relative z-10">Rp {uangKasMasuk.toLocaleString('id-ID')}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-200 flex flex-col justify-center relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none text-purple-600">
                <CreditCard size={100} />
              </div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2.5 bg-purple-100 rounded-xl text-purple-600 shrink-0">
                  <CreditCard size={22} />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Non Tunai (Tidak Di Laci)</p>
              </div>
              <p className="text-3xl font-black text-slate-800 relative z-10">Rp {uangNonTunai.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 3. BAGIAN BAWAH KIRI: RINCIAN METODE PEMBAYARAN */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-pink-200 flex flex-col">
              <div className="p-5 border-b border-pink-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-pink-600" /> Rincian Metode Pembayaran
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                
                {Object.keys(rincianMetode).length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-4">Belum ada transaksi hari ini.</p>
                ) : (
                  Object.entries(rincianMetode).map(([metode, total]) => (
                    <div key={metode} className="flex items-center justify-between p-3 rounded-xl bg-pink-50/50 border border-pink-100">
                      <div className="flex items-center gap-3">
                        {metode.toLowerCase() === 'tunai' ? <Banknote size={20} className="text-green-500" /> : 
                         metode.toLowerCase().includes('qris') ? <QrCode size={20} className="text-purple-500" /> : 
                         <CreditCard size={20} className="text-blue-500" />}
                        <span className="font-semibold text-sm text-slate-700">{metode}</span>
                      </div>
                      <span className="font-bold text-slate-800">Rp {total.toLocaleString('id-ID')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. BAGIAN BAWAH KANAN: KONFIRMASI NON TUNAI */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-pink-200 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-pink-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle size={18} className="text-pink-600" /> Konfirmasi Non Tunai
                </h3>
                {jumlahMenunggu > 0 && (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md flex items-center gap-1">
                    <Clock size={12} /> {jumlahMenunggu} Menunggu
                  </span>
                )}
              </div>
              
              <div className="overflow-x-auto w-full flex-1">
                <table className="w-full min-w-[500px] text-left text-sm text-slate-600">
                  <thead className="bg-pink-50/50 text-slate-700 font-semibold border-b border-pink-100">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Invoice & Nama</th>
                      <th className="px-5 py-3 whitespace-nowrap">Metode</th>
                      <th className="px-5 py-3 whitespace-nowrap">Nominal</th>
                      <th className="px-5 py-3 text-center whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-100">
                    
                    {listNonTunai.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                          Tidak ada transaksi non-tunai hari ini.
                        </td>
                      </tr>
                    ) : (
                      listNonTunai.map((item) => {
                        const isMenunggu = item.status_pembayaran !== 'diterima';
                        
                        return (
                          <tr key={item.id} className={`${isMenunggu ? 'hover:bg-pink-50' : 'bg-slate-50/50'} transition-colors`}>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className={`font-bold ${isMenunggu ? 'text-slate-800' : 'text-slate-500'}`}>{item.invoice}</div>
                              <div className={`text-xs ${isMenunggu ? 'text-slate-500' : 'text-slate-400'}`}>{item.nama_penyewa}</div>
                            </td>
                            <td className={`px-5 py-4 whitespace-nowrap font-medium ${isMenunggu ? 'text-blue-600' : 'text-slate-500'}`}>
                              {item.metode_pembayaran || 'Transfer'}
                            </td>
                            <td className={`px-5 py-4 whitespace-nowrap font-bold ${isMenunggu ? 'text-slate-800' : 'text-slate-500'}`}>
                              Rp {(item.dp || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              {isMenunggu ? (
                                <button 
                                  onClick={() => handleKonfirmasi(item.id)}
                                  className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors shadow-sm"
                                >
                                  Konfirmasi
                                </button>
                              ) : (
                                <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1">
                                  <CheckCircle size={14} /> Diterima
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}

                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}