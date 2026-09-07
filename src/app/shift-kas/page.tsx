'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowRightLeft, FileText, Power, Wallet, Banknote, 
  CreditCard, CheckCircle, Clock, QrCode, Loader2, X, Printer,
  Settings, Plus, Trash2, CalendarDays, LockOpen, Lock, Calendar, History,
  ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';

const DEFAULT_SHIFTS = [
  { id: '1', nama: 'Shift Pagi', start: '07:00', end: '15:00' },
  { id: '2', nama: 'Shift Sore', start: '15:00', end: '23:00' },
  { id: '3', nama: 'Satu Harian Penuh', start: '00:00', end: '23:59' }
];

export default function ShiftKasPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const getTodayDateString = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
    return (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
  };
  
  const [selectedDate, setSelectedDate] = useState('');
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [saldoAwal, setSaldoAwal] = useState(500000); 
  
  // State untuk Tutup Shift
  const [uangFisikAktual, setUangFisikAktual] = useState(0); 
  const [uangSetoran, setUangSetoran] = useState(0);
  
  const [schedules, setSchedules] = useState<any[]>(DEFAULT_SHIFTS);
  const [activeShiftId, setActiveShiftId] = useState<string>('1');
  
  const [isModalBukaShiftOpen, setIsModalBukaShiftOpen] = useState(false);
  const [isModalTutupShiftOpen, setIsModalTutupShiftOpen] = useState(false);
  const [isModalJadwalOpen, setIsModalJadwalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setSelectedDate(getTodayDateString());

    const savedSchedules = localStorage.getItem('herazealikha_shifts');
    const savedShiftStatus = localStorage.getItem('herazealikha_shift_status');
    const savedActiveShift = localStorage.getItem('herazealikha_active_shift');
    const savedSaldoLaci = localStorage.getItem('herazealikha_saldo_laci');
    
    if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
    if (savedShiftStatus === 'open') setIsShiftOpen(true);
    if (savedActiveShift) setActiveShiftId(savedActiveShift);
    
    if (savedSaldoLaci) {
      setSaldoAwal(Number(savedSaldoLaci));
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isMounted]);

  const fetchShiftData = async () => {
    if (!selectedDate) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sewa')
        .select('*')
        .gte('created_at', `${selectedDate}T00:00:00.000Z`)
        .lte('created_at', `${selectedDate}T23:59:59.999Z`);

      if (error) throw error;
      if (data) setTransaksiList(data);
    } catch (error: any) {
      toast.error('Gagal mengambil data shift.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, [selectedDate]);

  const getSisaWaktu = () => {
    if (!isShiftOpen) return "Kasir Tutup";
    const activeShift = schedules.find(s => s.id === activeShiftId) || schedules[0];
    const endTimeStr = activeShift.end;
    
    const now = currentTime;
    const end = new Date(now);
    const [hours, minutes] = endTimeStr.split(':');
    end.setHours(Number(hours), Number(minutes), 0, 0);

    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Waktu Shift Habis";

    const sisaJam = Math.floor(diff / (1000 * 60 * 60));
    const sisaMenit = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const sisaDetik = Math.floor((diff % (1000 * 60)) / 1000);

    return `${sisaJam}j ${sisaMenit}m ${sisaDetik}d`;
  };

  const handleBukaShift = () => {
    setIsShiftOpen(true);
    localStorage.setItem('herazealikha_shift_status', 'open');
    localStorage.setItem('herazealikha_active_shift', activeShiftId);
    localStorage.setItem('herazealikha_saldo_laci', saldoAwal.toString());
    toast.success('Shift berhasil dibuka!');
    setIsModalBukaShiftOpen(false);
  };

  const handleTutupShift = () => {
    // Modal untuk shift depan adalah: Uang Fisik Aktual dikurangi Uang Setoran
    const modalShiftDepan = uangFisikAktual - uangSetoran;
    
    setIsShiftOpen(false);
    localStorage.setItem('herazealikha_shift_status', 'closed');
    localStorage.setItem('herazealikha_saldo_laci', modalShiftDepan.toString());
    
    toast.success('Sesi Kasir berhasil ditutup! Data mutasi shift disimpan.');
    setIsModalTutupShiftOpen(false);
  };

  const simpanJadwal = () => {
    localStorage.setItem('herazealikha_shifts', JSON.stringify(schedules));
    toast.success('Jadwal shift berhasil diperbarui!');
    setIsModalJadwalOpen(false);
  };

  const handleKonfirmasi = async (id: string) => {
    try {
      const { error } = await supabase.from('sewa').update({ status_pembayaran: 'diterima' }).eq('id', id);
      if (error) throw error;
      toast.success('Pembayaran berhasil dikonfirmasi!');
      setTransaksiList(prev => prev.map(item => item.id === id ? { ...item, status_pembayaran: 'diterima' } : item));
    } catch (error: any) {
      toast.error('Gagal mengonfirmasi pembayaran.');
    }
  };

  const activeShift = schedules.find(s => s.id === activeShiftId) || schedules[0];
  const isHariIni = isMounted && selectedDate === getTodayDateString();

  const filteredTransaksi = transaksiList.filter(item => {
    if (activeShift.start === '00:00' && activeShift.end === '23:59') return true;
    const itemTime = new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return itemTime >= activeShift.start && itemTime <= activeShift.end;
  });

  let uangKasMasuk = 0;
  let uangNonTunai = 0;
  const rincianMetode: Record<string, number> = {};
  const listNonTunai: any[] = [];

  filteredTransaksi.forEach(item => {
    const metode = item.metode_pembayaran || 'Tunai';
    const nominal = item.dp || 0; 
    if (!rincianMetode[metode]) rincianMetode[metode] = 0;
    rincianMetode[metode] += nominal;

    if (metode.toLowerCase() === 'tunai') uangKasMasuk += nominal;
    else { uangNonTunai += nominal; listNonTunai.push(item); }
  });

  const uangSeharusnya = saldoAwal + uangKasMasuk;
  const jumlahMenunggu = listNonTunai.filter(item => item.status_pembayaran === 'menunggu' || !item.status_pembayaran).length;

  const siapkanTutupShift = () => {
    // Default: Kasir menganggap uang fisik pas, dan akan menyetor semua uang masuk (meninggalkan modal utuh)
    setUangFisikAktual(uangSeharusnya);
    setUangSetoran(uangKasMasuk);
    setIsModalTutupShiftOpen(true);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col gap-6 h-full pb-8 pt-2 w-full max-w-full overflow-x-hidden relative">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #print-shift-report, #print-shift-report * { visibility: visible; }
          #print-shift-report { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white !important; color: black !important; }
          .print-hidden { display: none !important; }
        }
      `}} />

      {/* HEADER UTAMA */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full print-hidden bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-pink-200">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
            {!isHariIni ? <History size={24} /> : (isShiftOpen ? <LockOpen size={24} /> : <Lock size={24} />)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 truncate">Manajemen Kasir & Shift</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {currentTime.toLocaleTimeString('id-ID')} WIB
              </p>
              {isShiftOpen && isHariIni && (
                <p className="text-xs font-bold text-pink-600 bg-pink-100 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                  <Clock size={12}/> Sisa: {getSisaWaktu()}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Filter Tanggal */}
          <div className="relative flex items-center bg-pink-50 rounded-xl border border-pink-200">
            <Calendar className="absolute left-3 text-pink-500" size={16} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none pl-9 pr-3 py-2 cursor-pointer w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto bg-pink-50 p-1.5 rounded-xl border border-pink-200">
            <span className="text-xs font-semibold text-slate-500 pl-2 shrink-0">Shift:</span>
            <select 
              value={activeShiftId}
              onChange={(e) => setActiveShiftId(e.target.value)}
              disabled={isShiftOpen && isHariIni}
              className="bg-white text-sm font-bold text-pink-700 outline-none px-3 py-1.5 rounded-lg border border-pink-100 cursor-pointer w-full sm:w-40 truncate disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {schedules.map(shift => (
                <option key={shift.id} value={shift.id}>{shift.nama}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => setIsModalJadwalOpen(true)}
            disabled={isShiftOpen && isHariIni}
            className="flex items-center justify-center p-2 bg-white border border-pink-200 hover:bg-pink-50 text-slate-600 rounded-xl transition-colors shrink-0 shadow-sm disabled:opacity-50"
            title="Atur Jadwal Shift"
          >
            <Settings size={20} />
          </button>

          {!isHariIni ? (
             <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 border border-slate-200 text-slate-500 font-bold py-2 px-6 rounded-xl text-sm shrink-0 cursor-not-allowed" title="Anda sedang melihat data masa lalu">
               <History size={16} /> Mode Riwayat
             </div>
          ) : (
            isShiftOpen ? (
              <button onClick={siapkanTutupShift} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl text-sm transition-transform shadow-sm shrink-0">
                <Power size={18} /> Tutup Sesi
              </button>
            ) : (
              <button onClick={() => setIsModalBukaShiftOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl text-sm transition-transform shadow-sm shrink-0">
                <LockOpen size={18} /> Buka Shift
              </button>
            )
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 print-hidden">
          <Loader2 className="animate-spin text-pink-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Memuat data transaksi shift...</p>
        </div>
      ) : (!isShiftOpen && isHariIni) ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-pink-200 py-24 print-hidden">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4"><Lock size={40} /></div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Kasir Sedang Ditutup</h2>
          <p className="text-slate-500 text-center max-w-sm mb-6">Pilih jadwal shift Anda di menu atas, lalu klik tombol <b>Buka Shift</b> untuk mulai menerima transaksi.</p>
          <button onClick={() => setIsModalBukaShiftOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">
            Buka Shift Sekarang
          </button>
        </div>
      ) : (
        <div className="print-hidden space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-200 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0"><Wallet size={22} /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seharusnya Di Laci</p>
              </div>
              <p className="text-3xl font-black text-slate-800">Rp {uangSeharusnya.toLocaleString('id-ID')}</p>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Modal Awal (Rp {saldoAwal.toLocaleString('id-ID')}) + Kas Masuk</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-200 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none text-green-600"><Banknote size={100} /></div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2.5 bg-green-100 rounded-xl text-green-600 shrink-0"><Banknote size={22} /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uang Masuk (Tunai)</p>
              </div>
              <p className="text-3xl font-black text-slate-800 relative z-10">Rp {uangKasMasuk.toLocaleString('id-ID')}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-pink-200 flex flex-col justify-center relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none text-purple-600"><CreditCard size={100} /></div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2.5 bg-purple-100 rounded-xl text-purple-600 shrink-0"><CreditCard size={22} /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Non Tunai (Transfer/QR)</p>
              </div>
              <p className="text-3xl font-black text-slate-800 relative z-10">Rp {uangNonTunai.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-pink-200 flex flex-col">
              <div className="p-5 border-b border-pink-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-pink-600" /> Rincian Metode</h3>
                <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-1 rounded-md">{activeShift?.nama}</span>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                {Object.keys(rincianMetode).length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">Belum ada transaksi di shift ini.</p>
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

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-pink-200 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-pink-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle size={18} className="text-pink-600" /> Verifikasi Pembayaran</h3>
                {jumlahMenunggu > 0 && (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md flex items-center gap-1">
                    <Clock size={12} /> {jumlahMenunggu} Menunggu
                  </span>
                )}
              </div>
              
              <div className="overflow-x-auto w-full flex-1 min-h-[300px]">
                <table className="w-full min-w-[500px] text-left text-sm text-slate-600">
                  <thead className="bg-pink-50/50 text-slate-700 font-semibold border-b border-pink-100">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Waktu & Invoice</th>
                      <th className="px-5 py-3 whitespace-nowrap">Metode</th>
                      <th className="px-5 py-3 whitespace-nowrap">Nominal</th>
                      <th className="px-5 py-3 text-center whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-100">
                    {listNonTunai.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">Tidak ada transaksi non-tunai di shift ini.</td></tr>
                    ) : (
                      listNonTunai.map((item) => {
                        const isMenunggu = item.status_pembayaran !== 'diterima';
                        const itemTime = new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                        return (
                          <tr key={item.id} className={`${isMenunggu ? 'hover:bg-pink-50' : 'bg-slate-50/50'} transition-colors`}>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className={`text-xs mb-0.5 ${isMenunggu ? 'text-pink-600 font-semibold' : 'text-slate-400'}`}>{itemTime} WIB</div>
                              <div className={`font-bold ${isMenunggu ? 'text-slate-800' : 'text-slate-500'}`}>{item.invoice}</div>
                            </td>
                            <td className={`px-5 py-4 whitespace-nowrap font-medium ${isMenunggu ? 'text-blue-600' : 'text-slate-500'}`}>
                              {item.metode_pembayaran || 'Transfer'}
                            </td>
                            <td className={`px-5 py-4 whitespace-nowrap font-bold ${isMenunggu ? 'text-slate-800' : 'text-slate-500'}`}>
                              Rp {(item.dp || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              {isMenunggu ? (
                                <button onClick={() => handleKonfirmasi(item.id)} className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors shadow-sm">
                                  Konfirmasi Terima
                                </button>
                              ) : (
                                <span className="text-green-600 text-xs font-bold flex items-center justify-center gap-1"><CheckCircle size={14} /> Tervalidasi</span>
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
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL BUKA SHIFT */}
      {/* ========================================= */}
      {isModalBukaShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print-hidden">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-pink-100 flex justify-between items-center bg-pink-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><LockOpen size={20} className="text-green-600" /> Buka Shift Kasir</h3>
              <button onClick={() => setIsModalBukaShiftOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">Nominal di bawah ini adalah uang fisik sisa mutasi dari shift sebelumnya. Ubah jika Anda menambahkan modal manual.</p>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Uang Modal Awal Laci (Rp)</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-3 text-pink-500" size={20} />
                <input type="number" value={saldoAwal} onChange={(e) => setSaldoAwal(Number(e.target.value))} className="w-full bg-slate-50 border border-pink-200 text-slate-800 font-bold text-lg rounded-xl pl-10 pr-4 py-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all" />
              </div>
            </div>
            <div className="p-5 border-t border-pink-100 bg-slate-50">
              <button onClick={handleBukaShift} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm">Mulai Transaksi Shift Ini</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL TUTUP SHIFT (SETORAN & MUTASI) */}
      {/* ========================================= */}
      {isModalTutupShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print-hidden">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[95vh]">
            
            <div className="p-4 border-b border-pink-100 flex justify-between items-center bg-pink-50 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Power size={20} className="text-red-500" /> Hitung Tutup Shift</h3>
              <button onClick={() => setIsModalTutupShiftOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            
            <div id="print-shift-report" className="p-5 overflow-y-auto flex-1 text-sm">
              <div className="hidden print:block text-center mb-6 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-black">HERAZEALIKHA</h1>
                <p className="text-sm uppercase font-bold mt-1">LAPORAN {activeShift?.nama}</p>
                <p className="text-xs mt-1">Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
              </div>

              {/* Rincian Sistem */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center border-b border-dashed border-pink-200 pb-2 print:border-slate-300">
                  <span className="text-slate-600 print:text-black">Saldo Modal Laci</span>
                  <span className="font-bold text-slate-800 print:text-black">Rp {saldoAwal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-pink-200 pb-2 print:border-slate-300">
                  <span className="text-slate-600 print:text-black">Pemasukan Kas Tunai</span>
                  <span className="font-bold text-green-600 print:text-black">+ Rp {uangKasMasuk.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-lg print:bg-transparent print:p-0 print:border-b-2 print:border-black print:pb-2 print:pt-2">
                  <span className="text-slate-800 font-bold print:text-black">UANG SEHARUSNYA DI LACI</span>
                  <span className="font-black text-slate-800 text-base print:text-black">Rp {uangSeharusnya.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Input Action Kasir */}
              <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 space-y-4 print-hidden">
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                    <Wallet size={14} className="text-pink-600" /> 1. Uang Aktual Laci (Dihitung Fisik)
                  </label>
                  <input 
                    type="number" 
                    value={uangFisikAktual} 
                    onChange={(e) => setUangFisikAktual(Number(e.target.value))} 
                    className="w-full bg-white border border-pink-200 text-slate-800 font-bold text-lg rounded-lg px-3 py-2 outline-none focus:border-pink-500" 
                  />
                  {uangFisikAktual !== uangSeharusnya && (
                    <p className={`text-[10px] mt-1 font-bold ${uangFisikAktual < uangSeharusnya ? 'text-red-500' : 'text-green-600'}`}>
                      Selisih: {uangFisikAktual < uangSeharusnya ? 'Kurang' : 'Lebih'} Rp {Math.abs(uangFisikAktual - uangSeharusnya).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                    <ArrowUpFromLine size={14} className="text-pink-600" /> 2. Uang Disetorkan (Diambil dari Laci)
                  </label>
                  <input 
                    type="number" 
                    value={uangSetoran} 
                    onChange={(e) => setUangSetoran(Number(e.target.value))} 
                    className="w-full bg-white border border-pink-200 text-slate-800 font-bold text-lg rounded-lg px-3 py-2 outline-none focus:border-pink-500" 
                  />
                </div>

                <div className="pt-2 border-t border-pink-200">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                    <ArrowDownToLine size={14} className="text-pink-600" /> 3. Modal Uang Kembalian Shift Depan
                  </label>
                  <div className="bg-white px-3 py-2 rounded-lg border border-pink-200 font-black text-pink-600 text-lg">
                    Rp {(uangFisikAktual - uangSetoran).toLocaleString('id-ID')}
                  </div>
                </div>

              </div>

              {/* Versi Tampilan Print Struk */}
              <div className="hidden print:block space-y-2 mt-4">
                 <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-2">
                  <span className="text-black text-sm">Uang Fisik Aktual di Laci</span>
                  <span className="font-bold text-black">Rp {uangFisikAktual.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-2 mt-2">
                  <span className="text-black text-sm">Disisakan (Modal Shift Depan)</span>
                  <span className="font-bold text-black">Rp {(uangFisikAktual - uangSetoran).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-black font-bold text-sm">UANG SETORAN (DIAMBIL)</span>
                  <span className="font-black text-black text-lg">Rp {uangSetoran.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-pink-100 bg-slate-50 flex gap-3 print-hidden shrink-0">
              <button onClick={() => window.print()} className="flex-1 flex justify-center items-center gap-2 bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 font-bold py-2.5 rounded-xl text-sm transition-colors">
                <Printer size={16} /> Cetak Struk
              </button>
              <button onClick={handleTutupShift} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                Akhiri & Mutasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL JADWAL SHIFT */}
      {isModalJadwalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print-hidden">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-pink-100 flex justify-between items-center bg-pink-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Settings size={20} className="text-pink-600" /> Atur Jadwal Shift</h3>
              <button onClick={() => setIsModalJadwalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-slate-500 mb-4">Ubah jam operasional shift kasir toko Anda.</p>
              {schedules.map((shift, index) => (
                <div key={shift.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Shift</label>
                    <input type="text" value={shift.nama} onChange={(e) => { const n = [...schedules]; n[index].nama = e.target.value; setSchedules(n); }} className="w-full bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500" />
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mulai</label>
                    <input type="time" value={shift.start} onChange={(e) => { const n = [...schedules]; n[index].start = e.target.value; setSchedules(n); }} className="w-full bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 font-mono" />
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selesai</label>
                    <input type="time" value={shift.end} onChange={(e) => { const n = [...schedules]; n[index].end = e.target.value; setSchedules(n); }} className="w-full bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500 font-mono" />
                  </div>
                  <button onClick={() => { if(schedules.length===1) return; setSchedules(schedules.filter(s => s.id !== shift.id)); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                </div>
              ))}
              <button onClick={() => setSchedules([...schedules, { id: Date.now().toString(), nama: 'Shift Baru', start: '00:00', end: '00:00' }])} className="w-full py-3 border-2 border-dashed border-pink-200 text-pink-600 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-pink-50"><Plus size={16}/> Tambah Jadwal Baru</button>
            </div>
            <div className="p-5 border-t border-pink-100 bg-slate-50">
              <button onClick={simpanJadwal} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm">Simpan Jadwal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}