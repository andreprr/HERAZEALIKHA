'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  Search, Plus, Minus, ShoppingCart, User,
  Save, Package, Loader2, Store, ShieldCheck, Lock, Upload, Image as ImageIcon,
  CalendarCheck, ArrowRightLeft, CheckCircle, Printer, MessageCircle, X
} from 'lucide-react';

export default function KasirPage() {
  const router = useRouter();

  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [katalog, setKatalog] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKategori, setActiveKategori] = useState('Semua');

  // Helper tanggal lokal
  const getLocalDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // State Formulir Kasir (Diberi inisialisasi dari localStorage jika ada)
  const [cart, setCart] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draft_kasir_cart');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [namaPenyewa, setNamaPenyewa] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_nama') || '';
    return '';
  });

  const [noWa, setNoWa] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_nowa') || '';
    return '';
  });

  const [kelengkapan, setKelengkapan] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_kelengkapan') || '';
    return '';
  });

  const [tipeTransaksi, setTipeTransaksi] = useState<'Sewa' | 'Booking'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('draft_kasir_tipe') as any) || 'Sewa';
    return 'Sewa';
  });
  const isBooking = tipeTransaksi === 'Booking';

  const [jenisJaminan, setJenisJaminan] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_jaminan') || 'KTP';
    return 'KTP';
  });

  const [nomorJaminan, setNomorJaminan] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_nomor_jaminan') || '';
    return '';
  });

  const [tanggalBawa, setTanggalBawa] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_tgl_bawa') || getLocalDate();
    return getLocalDate();
  });

  const [tanggalPakai, setTanggalPakai] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_tgl_pakai') || '';
    return '';
  });

  const [tanggalKembali, setTanggalKembali] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_tgl_kembali') || '';
    return '';
  });

  const [dp, setDp] = useState<number | ''>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draft_kasir_dp');
      return saved ? Number(saved) : '';
    }
    return '';
  });

  const [metodePembayaran, setMetodePembayaran] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('draft_kasir_metode') || 'Tunai';
    return 'Tunai';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [successData, setSuccessData] = useState<any>(null);

  // 🔴 SIMPAN OTOMATIS KE LOCALSTORAGE SETIAP KALI STATE BERUBAH
  useEffect(() => {
    localStorage.setItem('draft_kasir_cart', JSON.stringify(cart));
    localStorage.setItem('draft_kasir_nama', namaPenyewa);
    localStorage.setItem('draft_kasir_nowa', noWa);
    localStorage.setItem('draft_kasir_kelengkapan', kelengkapan);
    localStorage.setItem('draft_kasir_tipe', tipeTransaksi);
    localStorage.setItem('draft_kasir_jaminan', jenisJaminan);
    localStorage.setItem('draft_kasir_nomor_jaminan', nomorJaminan);
    localStorage.setItem('draft_kasir_tgl_bawa', tanggalBawa);
    localStorage.setItem('draft_kasir_tgl_pakai', tanggalPakai);
    localStorage.setItem('draft_kasir_tgl_kembali', tanggalKembali);
    localStorage.setItem('draft_kasir_dp', dp !== '' ? String(dp) : '');
    localStorage.setItem('draft_kasir_metode', metodePembayaran);
  }, [cart, namaPenyewa, noWa, kelengkapan, tipeTransaksi, jenisJaminan, nomorJaminan, tanggalBawa, tanggalPakai, tanggalKembali, dp, metodePembayaran]);

  useEffect(() => {
    const shiftStatus = localStorage.getItem('herazealikha_shift_status');
    if (shiftStatus === 'open') {
      setIsShiftOpen(true);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: brg, error: errBrg } = await supabase.from('katalog_barang').select('*').order('nama_barang');
      const { data: kat, error: errKat } = await supabase.from('kategori').select('*').order('nama');

      if (errBrg) throw errBrg;
      if (errKat) throw errKat;

      const { data: activeRentals, error: errRentals } = await supabase
        .from('sewa')
        .select('id, status, sewa_items(barang_id, qty)')
        .in('status', ['booking', 'dibawa', 'terlambat']);

      if (errRentals) throw errRentals;

      const processedKatalog = brg.map(item => {
        let sedangDisewaQty = 0;
        activeRentals?.forEach(rental => {
          const rentedItems = rental.sewa_items.filter((si: any) => si.barang_id === item.id);
          rentedItems.forEach(rentedItem => {
            sedangDisewaQty += rentedItem.qty;
          });
        });
        return { ...item, sedang_disewa: sedangDisewaQty };
      });

      setKatalog(processedKatalog);
      if (kat) setKategoriList([{ nama: 'Semua' }, ...kat]);
    } catch (error) {
      toast.error('Gagal memuat data katalog');
    } finally { // <--- TYPO DIPERBAIKI DI SINI (sebelumnya fontally)
      setIsLoading(false);
    }
  };

  const filteredKatalog = katalog.filter(item => {
    const matchSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKategori = activeKategori === 'Semua' || item.kategori === activeKategori;
    return matchSearch && matchKategori;
  });

  const addToCart = (barang: any) => {
    const existing = cart.find(item => item.id === barang.id);
    if (existing) {
      setCart(cart.map(item => item.id === barang.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...barang, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== id));
      return;
    }

    setCart(cart.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };

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

  const totalHarga = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  const sisaBayar = totalHarga - (Number(dp) || 0);

  const handleSimpanKasir = async () => {
    const shiftStatus = localStorage.getItem('herazealikha_shift_status');
    if (shiftStatus !== 'open') {
      toast.error('Kasir sedang ditutup! Harap buka shift terlebih dahulu.');
      setIsShiftOpen(false);
      return;
    }

    if (cart.length === 0) return toast.error('Keranjang kosong!');
    if (!namaPenyewa) return toast.error('Nama pelanggan wajib diisi!');
    if (!tanggalBawa || !tanggalPakai || !tanggalKembali) return toast.error('Ketiga tanggal (Bawa, Pakai, Kembali) wajib diisi!');

    if (!isBooking && !nomorJaminan) {
      if (jenisJaminan === 'Deposit') return toast.error('Nominal Deposit wajib diisi karena disewa hari ini!');
      return toast.error(`Nama pemilik ${jenisJaminan} wajib diisi karena disewa hari ini!`);
    }

    setIsSubmitting(true);
    const statusPemb = metodePembayaran === 'Tunai' ? 'diterima' : 'menunggu';

    try {
      const invoice = `KSR-${Date.now()}`;
      let buktiUrl = null;

      if (compressedFile) {
        const fileName = `bukti_${invoice}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('bukti-transfer')
          .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('bukti-transfer')
          .getPublicUrl(fileName);

        buktiUrl = urlData.publicUrl;
      }

      const payload = {
        invoice,
        nama_penyewa: namaPenyewa,
        no_wa: noWa,
        jenis_jaminan: jenisJaminan,
        nomor_jaminan: nomorJaminan,
        tanggal_bawa: isBooking ? tanggalBawa : getLocalDate(),
        tanggal_pakai: tanggalPakai,
        tanggal_kembali: tanggalKembali,
        kelengkapan: kelengkapan,
        status: isBooking ? 'booking' : 'dibawa',
        total_harga: totalHarga,
        dp: Number(dp) || 0,
        metode_pembayaran: metodePembayaran,
        status_pembayaran: statusPemb,
        bukti_pembayaran: buktiUrl
      };

      const { data: sewaData, error: sewaError } = await supabase
        .from('sewa')
        .insert([payload])
        .select('id')
        .single();

      if (sewaError) throw sewaError;

      for (const item of cart) {
        await supabase.from('sewa_items').insert([{
          sewa_id: sewaData.id,
          barang_id: item.id,
          qty: item.qty,
          harga: item.harga
        }]);
      }

      toast.success(isBooking ? 'Booking berhasil disimpan!' : 'Transaksi Kasir berhasil disimpan!');

      // 🔴 BERSIHKAN LOCALSTORAGE DRAFT KASIR SAAT BERHASIL
      localStorage.removeItem('draft_kasir_cart');
      localStorage.removeItem('draft_kasir_nama');
      localStorage.removeItem('draft_kasir_nowa');
      localStorage.removeItem('draft_kasir_kelengkapan');
      localStorage.removeItem('draft_kasir_tipe');
      localStorage.removeItem('draft_kasir_jaminan');
      localStorage.removeItem('draft_kasir_nomor_jaminan');
      localStorage.removeItem('draft_kasir_tgl_bawa');
      localStorage.removeItem('draft_kasir_tgl_pakai');
      localStorage.removeItem('draft_kasir_tgl_kembali');
      localStorage.removeItem('draft_kasir_dp');
      localStorage.removeItem('draft_kasir_metode');

      setSuccessData({
        ...payload,
        cartItems: [...cart],
        sisaBayar: sisaBayar
      });

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal memproses transaksi kasir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi Reset / Transaksi Baru
  const handleTransaksiBaru = () => {
    localStorage.removeItem('draft_kasir_cart');
    localStorage.removeItem('draft_kasir_nama');
    localStorage.removeItem('draft_kasir_nowa');
    localStorage.removeItem('draft_kasir_kelengkapan');
    localStorage.removeItem('draft_kasir_tipe');
    localStorage.removeItem('draft_kasir_jaminan');
    localStorage.removeItem('draft_kasir_nomor_jaminan');
    localStorage.removeItem('draft_kasir_tgl_bawa');
    localStorage.removeItem('draft_kasir_tgl_pakai');
    localStorage.removeItem('draft_kasir_tgl_kembali');
    localStorage.removeItem('draft_kasir_dp');
    localStorage.removeItem('draft_kasir_metode');

    setSuccessData(null);
    setCart([]);
    setNamaPenyewa('');
    setNoWa('');
    setKelengkapan('');
    setDp('');
    setMetodePembayaran('Tunai');
    setNomorJaminan('');
    setTanggalPakai('');
    setTanggalKembali('');
    setCompressedFile(null);
    setPreviewImage('');
    fetchData();
  };

  // Fungsi Kirim WA
  const handleKirimWA = () => {
    if (!successData || !successData.no_wa) return toast.error('Nomor WhatsApp pelanggan tidak ada.');

    let phone = successData.no_wa.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const message = `Halo Kak *${successData.nama_penyewa}*,\n\nTerima kasih telah ${successData.status === 'booking' ? 'melakukan booking' : 'menyewa'} di *Herazealikha*.\n\n*INVOICE: ${successData.invoice}*\nTgl Ambil: ${successData.tanggal_bawa}\nTgl Kembali: ${successData.tanggal_kembali}\n\n*Detail Biaya:*\nTotal Harga: Rp ${successData.total_harga.toLocaleString('id-ID')}\nDibayar (DP): Rp ${successData.dp.toLocaleString('id-ID')}\n*Sisa Tagihan: Rp ${successData.sisaBayar.toLocaleString('id-ID')}*\n\nHarap simpan pesan ini sebagai bukti transaksi. Terima kasih!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!isShiftOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] bg-white rounded-2xl border border-purple-200 p-8 text-center max-w-2xl mx-auto my-auto print:hidden">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-100">
          <Lock size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Kasir Tidak Dapat Melayani Transaksi</h2>
        <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
          Sesi shift atau kasir sedang tertutup. Anda harus membuka shift terlebih dahulu melalui menu <b>Manajemen Kasir & Shift</b> sebelum dapat melayani pelanggan.
        </p>
        <button
          onClick={() => router.push('/shift-kas')}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors text-sm"
        >
          Buka Shift Sekarang
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)] w-full overflow-hidden p-2 bg-white print:hidden">

        {/* KIRI: KATALOG PRODUK GRID */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">

          <div className="p-4 border-b border-purple-100 bg-slate-50 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Store className="text-purple-700" /> Katalog Kasir
              </h2>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari nama gaun, jas, atau perlengkapan..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-purple-200 focus:border-purple-600 outline-none text-slate-800 text-sm shadow-sm"
                autoFocus
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {kategoriList.map(kat => (
                <button
                  key={kat.nama}
                  onClick={() => setActiveKategori(kat.nama)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeKategori === kat.nama
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {kat.nama}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="animate-spin mb-2 text-purple-700" size={32} /> Memuat katalog & data sewa...
              </div>
            ) : filteredKatalog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Package size={48} className="mb-2 opacity-50" /> Tidak ada barang tersedia
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredKatalog.map(item => (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-white border border-purple-100 rounded-xl cursor-pointer hover:border-purple-400 hover:shadow-md transition-all flex flex-col relative overflow-hidden group select-none pb-2"
                  >
                    <div className="h-36 bg-slate-100 w-full flex items-center justify-center overflow-hidden relative shrink-0">
                      {item.gambar_url ? (
                        <img src={item.gambar_url} alt={item.nama_barang} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-slate-300" size={32} />
                      )}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-purple-700 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                        {item.kategori}
                      </div>
                    </div>

                    <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                      <h3 className="font-bold text-slate-800 text-xs leading-tight line-clamp-2">{item.nama_barang}</h3>

                      <div className="flex flex-col gap-1.5 mt-auto">
                        <span className="font-black text-purple-700 text-sm">Rp {item.harga.toLocaleString('id-ID')}</span>

                        <div>
                          {item.sedang_disewa > 0 ? (
                            <span className="inline-block bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded w-fit">
                              Sedang disewa: {item.sedang_disewa}
                            </span>
                          ) : (
                            <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded w-fit">
                              Belum ada penyewa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KANAN: KERANJANG & PEMBAYARAN KASIR */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-2xl shadow-sm border border-purple-200 flex flex-col shrink-0 overflow-hidden">

          <div className="p-4 border-b border-purple-100 bg-purple-50/30 space-y-2.5 shrink-0 overflow-y-auto max-h-[55vh]">

            {/* PILIHAN TIPE TRANSAKSI (SEWA / BOOKING) */}
            <div className="flex bg-slate-200/50 p-1 rounded-xl mb-1 border border-slate-200">
              <button
                onClick={() => {
                  setTipeTransaksi('Sewa');
                  setTanggalBawa(getLocalDate());
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all ${!isBooking ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-500 hover:text-purple-700'}`}
              >
                <ArrowRightLeft size={14} /> Sewa Langsung
              </button>
              <button
                onClick={() => setTipeTransaksi('Booking')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all ${isBooking ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}
              >
                <CalendarCheck size={14} /> Booking
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Pelanggan & No WA</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-white rounded-xl border border-purple-100 px-3 py-1.5">
                  <User size={15} className="text-purple-600 shrink-0" />
                  <input type="text" placeholder="Nama Pelanggan..." value={namaPenyewa} onChange={e => setNamaPenyewa(e.target.value)} className="w-full bg-transparent text-xs outline-none font-bold text-slate-800" />
                </div>
                <input type="text" placeholder="No WhatsApp..." value={noWa} onChange={e => setNoWa(e.target.value)} className="w-full bg-white rounded-xl border border-purple-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">Tgl Bawa/Ambil</label>
                <input
                  type="date"
                  value={tanggalBawa}
                  disabled={!isBooking}
                  onChange={e => setTanggalBawa(e.target.value)}
                  className={`w-full rounded-xl border px-1.5 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-purple-500 ${!isBooking ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-purple-100'}`}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">Tgl Pakai</label>
                <input type="date" value={tanggalPakai} onChange={e => setTanggalPakai(e.target.value)} className="w-full bg-white rounded-xl border border-purple-100 px-1.5 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">Tgl Kembali</label>
                <input type="date" value={tanggalKembali} onChange={e => setTanggalKembali(e.target.value)} className="w-full bg-white rounded-xl border border-purple-100 px-1.5 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-purple-500" />
              </div>
            </div>

            <div className="border-t border-purple-100 pt-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-purple-700" /> Jaminan
                </div>
                <span className={isBooking ? "text-blue-500 normal-case text-[9px]" : "text-red-500 normal-case text-[9px]"}>
                  {isBooking ? "(Opsional utk Booking)" : "(Wajib Hari Ini)"}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={jenisJaminan}
                  onChange={e => {
                    setJenisJaminan(e.target.value);
                    setNomorJaminan('');
                  }}
                  className="bg-white rounded-xl border border-purple-100 px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="KTP">KTP</option>
                  <option value="SIM">SIM</option>
                  <option value="Deposit">Deposit</option>
                </select>

                {jenisJaminan === 'Deposit' ? (
                  <div className="col-span-2 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      placeholder={isBooking ? "Bisa diisi nanti..." : "Nominal Uang..."}
                      value={nomorJaminan ? Number(nomorJaminan.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setNomorJaminan(val);
                      }}
                      className="w-full bg-white rounded-xl border border-purple-100 pl-7 pr-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={isBooking ? "Bisa diisi nanti (Opsional)..." : `Nama Pemilik ${jenisJaminan}...`}
                    value={nomorJaminan}
                    onChange={e => setNomorJaminan(e.target.value)}
                    className="col-span-2 bg-white rounded-xl border border-purple-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                  />
                )}
              </div>
            </div>

            {/* 🔴 TEXTAREA KELENGKAPAN (VERTIKAL PER BARIS) */}
            <div className="border-t border-purple-100 pt-3">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                <span>Kelengkapan / Aksesoris (Opsional)</span>
                <span className="text-[9px] text-slate-400 font-normal">(Tekan Enter untuk baris baru)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Misal:&#10;- Dasi 1 pcs&#10;- Sabuk 1 pcs&#10;- Peniti hias"
                value={kelengkapan}
                onChange={e => setKelengkapan(e.target.value)}
                className="w-full bg-white rounded-xl border border-purple-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500 transition-colors leading-relaxed"
              />
            </div>

          </div>

          {/* List Keranjang */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                <ShoppingCart size={40} className="mb-2" />
                <p className="text-xs font-medium">Belum ada barang dipilih</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-800 truncate">{item.nama_barang}</h4>
                      <p className="text-xs font-semibold text-purple-700">Rp {item.harga.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-purple-100 text-slate-600 rounded-md"><Minus size={12} /></button>
                      <span className="w-5 text-center text-xs font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-purple-100 text-slate-600 rounded-md"><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total & Checkout Kasir */}
          <div className="p-4 bg-white border-t border-purple-100 shrink-0 space-y-2.5 overflow-y-auto max-h-[35vh]">

            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-bold text-sm">Total Belanja</span>
              <span className="text-lg font-black text-slate-800">Rp {totalHarga.toLocaleString('id-ID')}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Dibayar / DP (Rp)</label>
                <input
                  type="text"
                  placeholder="0"
                  value={dp !== '' ? Number(dp).toLocaleString('id-ID') : ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setDp(val ? Number(val) : '');
                  }}
                  className="w-full bg-slate-50 border border-purple-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Metode Bayar</label>
                <select value={metodePembayaran} onChange={e => setMetodePembayaran(e.target.value)} className="w-full bg-slate-50 border border-purple-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-purple-600">
                  <option>Tunai</option><option>Transfer</option><option>QRIS</option>
                </select>
              </div>

              {metodePembayaran !== 'Tunai' && (
                <div className="col-span-2 pt-2 border-t border-dashed border-purple-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Upload size={12} className="text-purple-700" /> Upload Bukti Pembayaran <span className="text-purple-600">(Opsional)</span>
                    </label>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer border border-purple-200 rounded-xl p-1 bg-slate-50"
                  />
                  {previewImage && (
                    <div className="mt-2 p-1.5 border border-purple-100 rounded-xl bg-slate-50 flex justify-center">
                      <img src={previewImage} alt="Preview Bukti" className="h-16 object-contain rounded-md" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {sisaBayar > 0 && (
              <div className="flex justify-between text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg mt-1">
                <span>Kurang Bayar:</span><span>Rp {sisaBayar.toLocaleString('id-ID')}</span>
              </div>
            )}

            <button
              onClick={handleSimpanKasir}
              disabled={isSubmitting || cart.length === 0}
              className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 mt-1 text-sm ${isBooking ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-700 hover:bg-purple-800'
                }`}
            >
              <Save size={16} /> {isSubmitting ? 'Memproses...' : (isBooking ? 'Simpan Pre-Booking' : 'Selesaikan Transaksi')}
            </button>

          </div>
        </div>
      </div>

      {/* POPUP SUKSES TRANSAKSI */}
      {successData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 relative animate-in zoom-in-95 duration-200">

            <button onClick={handleTransaksiBaru} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>

            <h2 className="text-xl font-black text-slate-800 mb-1">Transaksi Berhasil!</h2>
            <p className="text-xs font-medium text-slate-500 mb-5">Invoice: <span className="text-slate-800 font-bold">{successData.invoice}</span></p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-left">
              <p className="text-xs text-slate-500 mb-1">Pelanggan</p>
              <p className="text-sm font-bold text-slate-800 mb-3">{successData.nama_penyewa}</p>

              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500">Total Harga</span>
                <span className="text-sm font-bold text-slate-800">Rp {successData.total_harga.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500">Dibayar</span>
                <span className="text-sm font-bold text-green-600">Rp {successData.dp.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                <span className="text-xs text-slate-500 font-semibold">Sisa Tagihan</span>
                <span className="text-sm font-black text-red-500">Rp {successData.sisaBayar.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleKirimWA}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors shadow-sm text-sm"
              >
                <MessageCircle size={18} /> Kirim Struk ke WhatsApp
              </button>

              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors shadow-sm text-sm"
              >
                <Printer size={18} /> Cetak Struk (Printer Thermal)
              </button>

              <button
                onClick={handleTransaksiBaru}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-purple-600 hover:text-purple-700 text-slate-600 font-bold py-2.5 rounded-xl transition-colors text-sm mt-2"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRUK THERMAL YANG HANYA MUNCUL SAAT DI PRINT */}
      {successData && (
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
        `}} />
      )}

      {successData && (
        <div id="thermal-receipt" className="hidden print:block text-black p-2 bg-white">
          <div className="text-center mb-4">
            <img src="/gambar.jpeg" alt="Logo" className="w-16 mx-auto mb-1 grayscale" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} />
            <h1 className="text-lg font-black tracking-widest">HERAZEALIKHA</h1>
            <p className="text-[10px]">Jl. Purwo Km.11 GG.Koramil, Delitua<br />Medan</p>
            <p className="text-[10px] mt-1">Invoice: {successData.invoice}</p>
          </div>

          <div className="border-b border-dashed border-black mb-3"></div>

          <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
            <div>
              <p className="font-bold uppercase underline">Informasi Pelanggan</p>
              <p className="mt-1 font-bold text-[9px] uppercase">NAMA PENYEWA</p>
              <p className="leading-tight">{successData.nama_penyewa}</p>
              <p className="mt-1 font-bold text-[9px] uppercase">NO. WHATSAPP</p>
              <p className="leading-tight">{successData.no_wa || '-'}</p>
              <p className="mt-1 font-bold text-[9px] uppercase">JAMINAN IDENTITAS</p>
              <p className="leading-tight">{successData.jenis_jaminan || '-'} ({successData.nomor_jaminan || '-'})</p>
            </div>
            <div>
              <p className="font-bold uppercase underline">Jadwal & Status</p>
              <div className="flex gap-2 mt-1">
                <div>
                  <p className="font-bold text-[9px] uppercase">WAKTU AMBIL</p>
                  <p className="leading-tight">{successData.tanggal_bawa}</p>
                </div>
                <div>
                  <p className="font-bold text-[9px] uppercase">BATAS KEMBALI</p>
                  <p className="leading-tight">{successData.tanggal_kembali}</p>
                </div>
              </div>
              <p className="mt-2 font-bold text-[9px] uppercase">STATUS PENYEWAAN</p>
              <p className="leading-tight font-bold border border-black inline-block px-1 mt-0.5">{successData.status.toUpperCase()}</p>
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
                {successData.cartItems.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 pr-1 align-top">{item.nama_barang}</td>
                    <td className="py-2 px-1 text-right align-top">Rp {item.harga.toLocaleString('id-ID')}</td>
                    <td className="py-2 pl-1 text-right font-bold align-top">{item.qty}x</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Support format baris vertikal saat di-print thermal */}
            {successData.kelengkapan && (
              <div className="mt-2 pt-2 border-t border-dotted border-black text-[10px] whitespace-pre-line">
                <span className="font-bold">Kelengkapan Manual:</span>
                <p className="leading-tight">{successData.kelengkapan}</p>
              </div>
            )}
          </div>

          <div className="border-b border-dashed border-black mb-3"></div>

          <div className="text-[11px] mb-4 space-y-1">
            <p className="font-bold mb-2">Ringkasan Pembayaran</p>
            <div className="flex justify-between"><span>Metode Bayar</span><span>{successData.metode_pembayaran}</span></div>
            <div className="flex justify-between"><span>Total Tagihan</span><span>Rp {successData.total_harga.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span>Sudah Dibayar (DP)</span><span>Rp {successData.dp.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between font-bold text-[12px] pt-1 mt-1 border-t border-black">
              <span>Sisa Tagihan</span><span>{successData.sisaBayar > 0 ? `Rp ${successData.sisaBayar.toLocaleString('id-ID')}` : 'LUNAS'}</span>
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
      )}
    </>
  );
}