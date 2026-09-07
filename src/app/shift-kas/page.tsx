'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowRightLeft, FileText, Power, Wallet, Banknote, 
  CreditCard, CheckCircle, Clock, QrCode, Loader2, X,
  Settings, Plus, Trash2, CalendarDays, LockOpen, Lock, Calendar, History,
  ArrowDownToLine, ArrowUpFromLine, ShieldCheck, Upload, Image as ImageIcon
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

  // State Modal Verifikasi Bukti TF & Upload File
  const [selectedTransaksi, setSelectedTransaksi] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // FITUR AUTO-COMPRESS GAMBAR SEBELUM UPLOAD
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          setCompressedFile(compressed);
          setPreviewImage(URL.createObjectURL(compressed));
        }, 'image/jpeg', 0.7);
      };
    };
  };

  // LOGIKA UPLOAD KE SUPABASE STORAGE & SIMPAN DATA
  const handleVerifikasiBuktiTf = async () => {
    if (!selectedTransaksi) return;

    setIsSubmitting(true);
    try {
      let publicUrl = selectedTransaksi.bukti_transfer;

      if (compressedFile) {
        const fileName = `bukti_${selectedTransaksi.invoice}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('bukti-transfer')
          .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('bukti-transfer')
          .getPublicUrl(fileName);

        publicUrl = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('sewa')
        .update({ 
          status_pembayaran: 'diterima',
          bukti_transfer: publicUrl
        })
        .eq('id', selectedTransaksi.id);

      if (updateError) throw updateError;
      
      toast.success('Bukti transfer diunggah & pembayaran disetujui!');
      setSelectedTransaksi(null);
      setPreviewImage('');
      setCompressedFile(null);
      fetchShiftData();
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal mengunggah bukti transfer.');
    } finally {
      setIsSubmitting(false);
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
    
    const isNonTunai = metode.toLowerCase() !== 'tunai';

    if (!rincianMetode[metode]) rincianMetode[metode] = 0;
    rincianMetode[metode] += nominal;

    if (!isNonTunai) {
      uangKasMasuk += nominal;
    } else { 
      uangNonTunai += nominal; 
      listNonTunai.push(item); 
    }
  });

  const uangSeharusnya = saldoAwal + uangKasMasuk;
  const jumlahMenunggu = listNonTunai.filter(item => item.status_pembayaran === 'menunggu' || !item.status_pembayaran).length;

  const siapkanTutupShift = () => {
    setUangFisikAktual(uangSeharusnya);
    setUangSetoran(uangKasMasuk);
    setIsModalTutupShiftOpen(true);
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col gap-6 h-full pb-8 pt-2 w-full max-w-full overflow-x-hidden relative bg-white">
      
      {/* HEADER UTAMA */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-purple-200">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            {!isHariIni ? <History size={24} /> : (isShiftOpen ? <LockOpen size={24} /> : <Lock size={24} />)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 truncate">Manajemen Kasir & Shift</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {currentTime.toLocaleTimeString('id-ID')} WIB
              </p>
              {isShiftOpen && isHariIni && (
                <p className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                  <Clock size={12}/> Sisa: {getSisaWaktu()}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative flex items-center bg-purple-50 rounded-xl border border-purple-200">
            <Calendar className="absolute left-3 text-purple-600" size={16} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none pl-9 pr-3 py-2 cursor-pointer w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto bg-purple-50 p-1.5 rounded-xl border border-purple-200">
            <span className="text-xs font-semibold text-slate-500 pl-2 shrink-0">Shift:</span>
            <select 
              value={activeShiftId}
              onChange={(e) => setActiveShiftId(e.target.value)}
              disabled={isShiftOpen && isHariIni}
              className="bg-white text-sm font-bold text-purple-700 outline-none px-3 py-1.5 rounded-lg border border-purple-100 cursor-pointer w-full sm:w-40 truncate disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {schedules.map(shift => (
                <option key={shift.id} value={shift.id}>{shift.nama}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => setIsModalJadwalOpen(true)}
            disabled={isShiftOpen && isHariIni}
            className="flex items-center justify-center p-2 bg-white border border-purple-200 hover:bg-purple-50 text-slate-600 rounded-xl transition-colors shrink-0 shadow-sm disabled:opacity-50"
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
              <button onClick={() => setIsModalBukaShiftOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl text-sm transition-transform shadow-sm shrink-0">
                <LockOpen size={18} /> Buka Shift
              </button>
            )
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white">
          <Loader2 className="animate-spin text-purple-700 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Memuat data transaksi shift...</p>
        </div>
      ) : (!isShiftOpen && isHariIni) ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-purple-200 py-24">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4"><Lock size={40} /></div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Kasir Sedang Ditutup</h2>
          <p className="text-slate-500 text-center max-w-sm mb-6">Pilih jadwal shift Anda di menu atas, lalu klik tombol <b>Buka Shift</b> untuk mulai menerima transaksi.</p>
          <button onClick={() => setIsModalBukaShiftOpen(true)} className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">
            Buka Shift Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0"><Wallet size={22} /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seharusnya Di Laci</p>
              </div>
              <p className="text-3xl font-black text-slate-800">Rp {uangSeharusnya.toLocaleString('id-ID')}</p>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Modal Awal (Rp {saldoAwal.toLocaleString('id-ID')}) + Kas Masuk</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none text-green-600"><Banknote size={100} /></div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2.5 bg-green-100 rounded-xl text-green-600 shrink-0"><Banknote size={22} /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uang Masuk (Tunai)</p>
              </div>
              <p className="text-3xl font-black text-slate-800 relative z-10">Rp {uangKasMasuk.toLocaleString('id-ID')}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col justify-center relative overflow-hidden">
               <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none text-purple-600"><CreditCard size={100} /></div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2.5 bg-purple-100 rounded-xl text-purple-700 shrink-0"><CreditCard size={22} /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Non Tunai (Transfer/QR)</p>
              </div>
              <p className="text-3xl font-black text-slate-800 relative z-10">Rp {uangNonTunai.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-purple-200 flex flex-col">
              <div className="p-5 border-b border-purple-100 flex justify-between items-center bg-white">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-purple-700" /> Rincian Metode</h3>
                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-md">{activeShift?.nama}</span>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-4">
                {Object.keys(rincianMetode).length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">Belum ada transaksi di shift ini.</p>
                ) : (
                  Object.entries(rincianMetode).map(([metode, total]) => (
                    <div key={metode} className="flex items-center justify-between p-3 rounded-xl bg-purple-50/40 border border-purple-100">
                      <div className="flex items-center gap-3">
                        {metode.toLowerCase() === 'tunai' ? <Banknote size={20} className="text-green-600" /> : 
                         metode.toLowerCase().includes('qris') ? <QrCode size={20} className="text-purple-700" /> : 
                         <CreditCard size={20} className="text-blue-600" />}
                        <span className="font-semibold text-sm text-slate-700">{metode}</span>
                      </div>
                      <span className="font-bold text-slate-800">Rp {total.toLocaleString('id-ID')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-purple-200 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-purple-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle size={18} className="text-purple-700" /> Verifikasi Pembayaran & Bukti Transfer</h3>
                {jumlahMenunggu > 0 && (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md flex items-center gap-1">
                    <Clock size={12} /> {jumlahMenunggu} Menunggu
                  </span>
                )}
              </div>
              
              <div className="overflow-x-auto w-full flex-1 min-h-[300px]">
                <table className="w-full min-w-[600px] text-left text-sm text-slate-600">
                  <thead className="bg-purple-50/50 text-slate-700 font-semibold border-b border-purple-100">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Waktu & Invoice</th>
                      <th className="px-5 py-3 whitespace-nowrap">Pelanggan</th>
                      <th className="px-5 py-3 whitespace-nowrap">Metode / Nominal</th>
                      <th className="px-5 py-3 text-center whitespace-nowrap">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {listNonTunai.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">Tidak ada transaksi non-tunai atau pelunasan transfer/QRIS di shift ini.</td></tr>
                    ) : (
                      listNonTunai.map((item) => {
                        const isMenunggu = item.status_pembayaran !== 'diterima';
                        const itemTime = new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                        return (
                          <tr key={item.id} className={`${isMenunggu ? 'hover:bg-purple-50/40' : 'bg-slate-50/50'} transition-colors`}>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className={`text-xs mb-0.5 ${isMenunggu ? 'text-purple-700 font-semibold' : 'text-slate-400'}`}>{itemTime} WIB</div>
                              <div className={`font-bold ${isMenunggu ? 'text-slate-800' : 'text-slate-500'}`}>{item.invoice}</div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-800">
                              {item.nama_penyewa}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="font-bold text-slate-800">Rp {(item.dp || 0).toLocaleString('id-ID')}</div>
                              <div className="text-xs text-purple-700 font-medium">{item.metode_pembayaran || 'Transfer'}</div>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <button 
                                onClick={() => {
                                  setSelectedTransaksi(item);
                                  setPreviewImage(item.bukti_transfer || '');
                                  setCompressedFile(null);
                                }}
                                className={`font-semibold py-1.5 px-4 rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-1.5 ${
                                  isMenunggu 
                                    ? 'bg-purple-700 hover:bg-purple-800 text-white' 
                                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                }`}
                              >
                                <ShieldCheck size={14} /> {isMenunggu ? 'Verifikasi / Upload Bukti' : 'Ubah / Lihat Bukti'}
                              </button>
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
      {/* MODAL UPLOAD FILE BUKTI TRANSFER */}
      {/* ========================================= */}
      {selectedTransaksi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-purple-100 bg-purple-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShieldCheck size={18} className="text-purple-700" /> Upload Bukti Transfer (Auto-Compress)
              </h3>
              <button onClick={() => setSelectedTransaksi(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Invoice:</span><span className="font-bold">{selectedTransaksi.invoice}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pelanggan:</span><span className="font-bold">{selectedTransaksi.nama_penyewa}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Nominal:</span><span className="font-bold text-green-600">Rp {(selectedTransaksi.dp || 0).toLocaleString('id-ID')}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                  <Upload size={14} className="text-purple-700" /> Pilih File Gambar Bukti TF / QRIS
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer border border-purple-200 rounded-xl p-1 bg-slate-50"
                />
                <p className="text-[10px] text-slate-400 mt-1">Sistem otomatis mengompres ukuran gambar agar ringan disimpan.</p>
              </div>

              {previewImage && (
                <div className="border border-purple-200 rounded-xl p-2 bg-slate-50 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase">Preview Gambar</span>
                  <img src={previewImage} alt="Preview Bukti TF" className="h-40 object-contain rounded-lg" />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-purple-100 bg-slate-50 flex gap-2">
              <button 
                onClick={() => setSelectedTransaksi(null)}
                className="flex-1 bg-white border border-purple-200 text-slate-600 hover:bg-purple-50 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleVerifikasiBuktiTf}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? 'Mengunggah...' : <><CheckCircle size={14} /> Setujui & Simpan</>}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL BUKA SHIFT */}
      {isModalBukaShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-purple-100 flex justify-between items-center bg-purple-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><LockOpen size={20} className="text-green-600" /> Buka Shift Kasir</h3>
              <button onClick={() => setIsModalBukaShiftOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">Nominal di bawah ini adalah uang fisik sisa mutasi dari shift sebelumnya. Ubah jika Anda menambahkan modal manual.</p>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Uang Modal Awal Laci (Rp)</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-3 text-purple-700" size={20} />
                <input type="number" value={saldoAwal} onChange={(e) => setSaldoAwal(Number(e.target.value))} className="w-full bg-slate-50 border border-purple-200 text-slate-800 font-bold text-lg rounded-xl pl-10 pr-4 py-3 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all" />
              </div>
            </div>
            <div className="p-5 border-t border-purple-100 bg-slate-50">
              <button onClick={handleBukaShift} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm">Mulai Transaksi Shift Ini</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TUTUP SHIFT */}
      {isModalTutupShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 border-b border-purple-100 flex justify-between items-center bg-purple-50 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Power size={20} className="text-red-500" /> Hitung Tutup Shift</h3>
              <button onClick={() => setIsModalTutupShiftOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 text-sm">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center border-b border-dashed border-purple-200 pb-2">
                  <span className="text-slate-600">Saldo Modal Laci</span>
                  <span className="font-bold text-slate-800">Rp {saldoAwal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-purple-200 pb-2">
                  <span className="text-slate-600">Pemasukan Kas Tunai</span>
                  <span className="font-bold text-green-600">+ Rp {uangKasMasuk.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-lg">
                  <span className="text-slate-800 font-bold">UANG SEHARUSNYA DI LACI</span>
                  <span className="font-black text-slate-800 text-base">Rp {uangSeharusnya.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                    <Wallet size={14} className="text-purple-700" /> 1. Uang Aktual Laci (Dihitung Fisik)
                  </label>
                  <input type="number" value={uangFisikAktual} onChange={(e) => setUangFisikAktual(Number(e.target.value))} className="w-full bg-white border border-purple-200 text-slate-800 font-bold text-lg rounded-lg px-3 py-2 outline-none focus:border-purple-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                    <ArrowUpFromLine size={14} className="text-purple-700" /> 2. Uang Disetorkan (Diambil dari Laci)
                  </label>
                  <input type="number" value={uangSetoran} onChange={(e) => setUangSetoran(Number(e.target.value))} className="w-full bg-white border border-purple-200 text-slate-800 font-bold text-lg rounded-lg px-3 py-2 outline-none focus:border-purple-600" />
                </div>
                <div className="pt-2 border-t border-purple-200">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
                    <ArrowDownToLine size={14} className="text-purple-700" /> 3. Modal Uang Kembalian Shift Depan
                  </label>
                  <div className="bg-white px-3 py-2 rounded-lg border border-purple-200 font-black text-purple-700 text-lg">
                    Rp {(uangFisikAktual - uangSetoran).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-purple-100 bg-slate-50 flex gap-3 shrink-0">
              <button onClick={handleTutupShift} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">Akhiri & Mutasi</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL JADWAL SHIFT */}
      {isModalJadwalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-purple-100 flex justify-between items-center bg-purple-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Settings size={20} className="text-purple-700" /> Atur Jadwal Shift</h3>
              <button onClick={() => setIsModalJadwalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-slate-500 mb-4">Ubah jam operasional shift kasir toko Anda.</p>
              {schedules.map((shift, index) => (
                <div key={shift.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Shift</label>
                    <input type="text" value={shift.nama} onChange={(e) => { const n = [...schedules]; n[index].nama = e.target.value; setSchedules(n); }} className="w-full bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600" />
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mulai</label>
                    <input type="time" value={shift.start} onChange={(e) => { const n = [...schedules]; n[index].start = e.target.value; setSchedules(n); }} className="w-full bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600 font-mono" />
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selesai</label>
                    <input type="time" value={shift.end} onChange={(e) => { const n = [...schedules]; n[index].end = e.target.value; setSchedules(n); }} className="w-full bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600 font-mono" />
                  </div>
                  <button onClick={() => { if(schedules.length===1) return; setSchedules(schedules.filter(s => s.id !== shift.id)); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                </div>
              ))}
              <button onClick={() => setSchedules([...schedules, { id: Date.now().toString(), nama: 'Shift Baru', start: '00:00', end: '00:00' }])} className="w-full py-3 border-2 border-dashed border-purple-200 text-purple-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-purple-50"><Plus size={16}/> Tambah Jadwal Baru</button>
            </div>
            <div className="p-5 border-t border-purple-100 bg-slate-50">
              <button onClick={simpanJadwal} className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm">Simpan Jadwal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}