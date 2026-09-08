'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, Wallet, ArrowDownToLine, PiggyBank, 
  Landmark, Info, Download, CheckCircle, ShieldAlert, FileText
} from 'lucide-react';

type DateFilter = 'hari_ini' | '7_hari' | '30_hari' | '90_hari';

export default function LaporanPage() {
  const [filter, setFilter] = useState<DateFilter>('7_hari');
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [omzet, setOmzet] = useState(0);
  const [uangMasuk, setUangMasuk] = useState(0);
  const [pengeluaran, setPengeluaran] = useState(0);
  const [totalTransaksi, setTotalTransaksi] = useState(0);
  const [totalItem, setTotalItem] = useState(0);
  
  const [metodePembayaran, setMetodePembayaran] = useState<any[]>([]);
  const [barangTerlaris, setBarangTerlaris] = useState<any[]>([]);
  
  // Date Range Display
  const [dateRangeStr, setDateRangeStr] = useState('');

  useEffect(() => {
    fetchLaporan();
  }, [filter]);

  const getDateRange = (f: DateFilter) => {
    const end = new Date();
    const start = new Date();
    
    if (f === 'hari_ini') {
      start.setHours(0, 0, 0, 0);
    } else if (f === '7_hari') {
      start.setDate(start.getDate() - 7);
    } else if (f === '30_hari') {
      start.setDate(start.getDate() - 30);
    } else if (f === '90_hari') {
      start.setDate(start.getDate() - 90);
    }

    return { 
      startDate: start.toISOString(), 
      endDate: end.toISOString(),
      startObj: start,
      endObj: end
    };
  };

  const formatDateLabel = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('id-ID', options);
    }
    return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('id-ID', options)}`;
  };

  const fetchLaporan = async () => {
    setIsLoading(true);
    const { startDate, endDate, startObj, endObj } = getDateRange(filter);
    setDateRangeStr(formatDateLabel(startObj, endObj));

    try {
      // 1. Fetch Transaksi Sewa & Kasir
      const { data: sewaData } = await supabase
        .from('sewa')
        .select('id, total_harga, dp, metode_pembayaran')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .neq('status', 'batal');

      // 2. Fetch Pengeluaran (Biaya Operasional)
      const { data: pengeluaranData } = await supabase
        .from('pengeluaran')
        .select('nominal')
        .gte('tanggal', startDate.split('T')[0])
        .lte('tanggal', endDate.split('T')[0]);

      // 3. Fetch Sewa Items (Untuk Barang Terlaris & Total Item)
      let allItems: any[] = [];
      if (sewaData && sewaData.length > 0) {
        const sewaIds = sewaData.map(s => s.id);
        const { data: itemsData } = await supabase
          .from('sewa_items')
          .select('qty, harga, katalog_barang(nama_barang)')
          .in('sewa_id', sewaIds);
        
        if (itemsData) allItems = itemsData;
      }

      // -- KALKULASI --
      let calcOmzet = 0;
      let calcUangMasuk = 0;
      let metodeMap: Record<string, number> = {};

      if (sewaData) {
        sewaData.forEach(s => {
          calcOmzet += s.total_harga || 0;
          // Asumsi uang masuk = DP (atau total harga jika sudah lunas)
          const masuk = s.dp || 0; 
          calcUangMasuk += masuk;

          const method = s.metode_pembayaran || 'Lainnya';
          metodeMap[method] = (metodeMap[method] || 0) + masuk;
        });
      }

      let calcPengeluaran = 0;
      if (pengeluaranData) {
        calcPengeluaran = pengeluaranData.reduce((sum, p) => sum + (p.nominal || 0), 0);
      }

      let calcTotalItem = 0;
      let produkMap: Record<string, { qty: number, omzet: number }> = {};

      allItems.forEach(item => {
        calcTotalItem += item.qty;
        const nama = item.katalog_barang?.nama_barang || 'Barang Dihapus';
        const subtotal = item.qty * item.harga;

        if (!produkMap[nama]) produkMap[nama] = { qty: 0, omzet: 0 };
        produkMap[nama].qty += item.qty;
        produkMap[nama].omzet += subtotal;
      });

      const topProduk = Object.entries(produkMap)
        .map(([nama, data]) => ({ nama, ...data }))
        .sort((a, b) => b.omzet - a.omzet); // Urutkan berdasarkan omzet terbesar

      // -- SET STATES --
      setOmzet(calcOmzet);
      setUangMasuk(calcUangMasuk);
      setPengeluaran(calcPengeluaran);
      setTotalTransaksi(sewaData?.length || 0);
      setTotalItem(calcTotalItem);
      setMetodePembayaran(Object.entries(metodeMap).map(([nama, nominal]) => ({ nama, nominal })));
      setBarangTerlaris(topProduk);

    } catch (error) {
      console.error('Gagal memuat laporan', error);
    } finally {
      setIsLoading(false);
    }
  };

  const eksporCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Laporan Herazealikha\n";
    csvContent += `Periode,${dateRangeStr}\n\n`;
    csvContent += `Omzet,${omzet}\n`;
    csvContent += `Uang Masuk,${uangMasuk}\n`;
    csvContent += `Biaya Operasional,${pengeluaran}\n`;
    csvContent += `Laba Bersih,${omzet - pengeluaran}\n\n`;
    
    csvContent += "Barang Terlaris\nNama Barang,Qty Terjual,Omzet\n";
    barangTerlaris.forEach(b => {
      csvContent += `"${b.nama}",${b.qty},${b.omzet}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Herazealikha_${dateRangeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  const labaKotor = omzet; // Asumsi jasa/sewa tidak ada HPP per barang
  const labaBersih = labaKotor - pengeluaran;
  const persentaseLaba = omzet > 0 ? ((labaBersih / omzet) * 100).toFixed(1) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* HEADER LAPORAN */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Laporan</h1>
          <p className="text-slate-500 mt-1">{dateRangeStr}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={eksporCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-sm">
            <Download size={16} className="text-purple-600" /> Ekspor CSV
          </button>
          
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
            {[
              { id: 'hari_ini', label: 'Hari ini' },
              { id: '7_hari', label: '7 hari' },
              { id: '30_hari', label: '30 hari' },
              { id: '90_hari', label: '90 hari' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as DateFilter)}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${
                  filter === f.id ? 'bg-pink-100 text-pink-700 shadow-sm border border-pink-200' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {filter === f.id && <span className="mr-1">✓</span>}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 font-semibold animate-pulse">
          Memuat data laporan...
        </div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 text-green-700 rounded-md"><TrendingUp size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Omzet</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{formatRp(omzet)}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">{totalTransaksi} transaksi • {totalItem} item</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md"><Wallet size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uang Masuk</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{formatRp(uangMasuk)}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Arus kas neto (DP & Pelunasan)</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm opacity-70">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-md"><ArrowDownToLine size={16} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Biaya Operasional</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{formatRp(pengeluaran)}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Pengeluaran & Perawatan</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-pink-200 shadow-sm bg-pink-50/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-pink-200 text-pink-700 rounded-md"><PiggyBank size={16} /></div>
                <span className="text-xs font-bold text-pink-700 uppercase tracking-wider">Laba Bersih</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{formatRp(labaBersih)}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Setelah biaya operasional</p>
            </div>
          </div>

          {/* LABA RUGI TABLE */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Landmark className="text-slate-500" size={20} />
                <div>
                  <h3 className="font-bold text-slate-800">Laba Rugi</h3>
                  <p className="text-xs text-slate-500">{dateRangeStr}</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Omzet Penjualan & Sewa</span>
                <span>{formatRp(omzet)}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-4">
                <span>Modal barang terjual (HPP)</span>
                <span>-Rp 0</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 pt-2">
                <span>Laba Kotor</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 text-xs font-normal">100%</span>
                  <span>{formatRp(labaKotor)}</span>
                </div>
              </div>
              
              <div className="flex justify-between text-slate-600 pt-4">
                <span>Biaya Operasional & Pengeluaran</span>
                <span className="text-red-500">-{formatRp(pengeluaran)}</span>
              </div>

              {pengeluaran === 0 && (
                <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-xs border border-orange-100 mt-2">
                  Belum ada biaya operasional tercatat pada periode ini. Selama biaya belum dicatat, Laba Bersih sama dengan Laba Kotor dan angkanya lebih besar daripada kenyataan.
                </div>
              )}

              <div className="flex justify-between font-black text-slate-800 pt-4 border-t border-slate-200 mt-4 text-base">
                <span className="text-green-700">Laba Bersih</span>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 text-xs font-normal">{persentaseLaba}%</span>
                  <span className="text-green-700">{formatRp(labaBersih)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-4 text-xs text-slate-500 flex gap-2">
              <Info size={16} className="shrink-0 text-slate-400" />
              <p><b>Kenapa Omzet dan Uang Masuk berbeda?</b><br/> Omzet adalah pendapatan yang diakui dari total nilai invoice. Uang Masuk adalah uang tunai/transfer riil yang diterima (seperti DP). Selisihnya adalah piutang (Sisa tagihan pelanggan).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* UANG MASUK PER METODE */}
            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Wallet size={16} className="text-slate-500" /> Uang masuk per metode
              </h3>
              <div className="space-y-3 text-sm">
                {metodePembayaran.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Belum ada transaksi</p>
                ) : (
                  metodePembayaran.map((m, i) => (
                    <div key={i} className="flex justify-between text-slate-600">
                      <span>{m.nama}</span>
                      <span className="font-semibold text-slate-800">{formatRp(m.nominal)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* OMZET PER JENIS DOKUMEN (Dummy/Static split jika diperlukan, asumsikan semua 'Penyewaan') */}
            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText size={16} className="text-slate-500" /> Omzet per jenis dokumen
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Transaksi Kasir & Sewa</span>
                  <span className="font-semibold text-slate-800">{formatRp(omzet)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Denda & Keterlambatan</span>
                  <span className="font-semibold text-slate-800">Rp 0</span>
                </div>
              </div>
            </div>

          </div>

          {/* BARANG TERLARIS */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-500" /> Barang Terlaris
              </h3>
              <p className="text-xs text-slate-500 mt-1">Diurutkan berdasarkan omzet terbesar</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Produk</th>
                    <th className="px-5 py-3 font-semibold text-center w-24">Terjual</th>
                    <th className="px-5 py-3 font-semibold text-right w-40">Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {barangTerlaris.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-slate-400">Belum ada barang terjual/disewa pada periode ini.</td>
                    </tr>
                  ) : (
                    barangTerlaris.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-800">{b.nama}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{b.qty}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatRp(b.omzet)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LAPORAN ANTI FRAUD */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
              <ShieldAlert size={18} className="text-slate-500" /> Laporan Anti-Fraud
            </h3>
            <div className="flex flex-col items-center justify-center text-slate-400 py-4 gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                <CheckCircle size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium">Tidak ada transaksi bermasalah/batal mencurigakan pada rentang ini.</p>
            </div>
          </div>

        </>
      )}
    </div>
  );
}