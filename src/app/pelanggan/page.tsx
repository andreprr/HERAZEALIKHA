'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Users, MessageCircle, Phone, 
  CalendarDays, ShoppingBag, Loader2, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PelangganPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [pelangganList, setPelangganList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPelanggan();
  }, []);

  const fetchPelanggan = async () => {
    setIsLoading(true);
    try {
      // Tarik data dari tabel sewa
      const { data, error } = await supabase
        .from('sewa')
        .select('nama_penyewa, no_wa, total_harga, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Logika Pengelompokan (Grouping) Pelanggan berdasarkan No WA atau Nama
      if (data) {
        const groupedCustomers: Record<string, any> = {};

        data.forEach((item) => {
          // Gunakan No WA sebagai ID unik. Jika tidak ada, gunakan nama
          const uniqueKey = item.no_wa ? item.no_wa.trim() : item.nama_penyewa.trim().toLowerCase();

          if (!groupedCustomers[uniqueKey]) {
            groupedCustomers[uniqueKey] = {
              nama: item.nama_penyewa,
              wa: item.no_wa || '-',
              totalTransaksi: 0,
              totalPengeluaran: 0,
              terakhirSewa: item.created_at
            };
          }

          // Akumulasi data
          groupedCustomers[uniqueKey].totalTransaksi += 1;
          groupedCustomers[uniqueKey].totalPengeluaran += (item.total_harga || 0);

          // Update tanggal terakhir sewa jika data yang dicek lebih baru
          if (new Date(item.created_at) > new Date(groupedCustomers[uniqueKey].terakhirSewa)) {
            groupedCustomers[uniqueKey].terakhirSewa = item.created_at;
            // Gunakan nama terbaru jika mereka mengganti nama
            groupedCustomers[uniqueKey].nama = item.nama_penyewa;
          }
        });

        // Ubah objek menjadi array dan urutkan berdasarkan yang paling sering transaksi
        const sortedCustomers = Object.values(groupedCustomers).sort((a, b) => b.totalTransaksi - a.totalTransaksi);
        setPelangganList(sortedCustomers);
      }
    } catch (error: any) {
      toast.error('Gagal memuat data pelanggan');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter pencarian
  const filteredPelanggan = pelangganList.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.wa.includes(searchQuery)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  };

  const handleWhatsApp = (noWa: string) => {
    if (noWa === '-') return toast.error('Nomor WhatsApp tidak tersedia');
    
    // Format nomor WA: ganti '08' dengan '628' di awal
    let formattedNumber = noWa.replace(/\D/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '62' + formattedNumber.substring(1);
    }
    
    window.open(`https://wa.me/${formattedNumber}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 w-full max-w-full overflow-x-hidden bg-white">
      
      {/* HEADER & PENCARIAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full bg-white p-5 rounded-2xl shadow-sm border border-purple-200">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 truncate">Data Pelanggan</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">Data otomatis tersimpan dari riwayat Kasir & Sewa.</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Cari nama atau no WA..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 text-sm rounded-xl bg-purple-50/50 border border-purple-200 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all text-slate-800"
          />
        </div>
      </div>

      {/* STATISTIK SINGKAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-200 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl"><Users size={20}/></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pelanggan Unik</p>
            <p className="text-2xl font-black text-slate-800">{pelangganList.length} Orang</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-200 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-xl"><ShoppingBag size={20}/></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pelanggan Paling Aktif</p>
            <p className="text-lg font-bold text-slate-800 truncate">
              {pelangganList.length > 0 ? pelangganList[0].nama : '-'} 
              <span className="text-xs font-semibold text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded-md">
                {pelangganList.length > 0 ? `${pelangganList[0].totalTransaksi}x Sewa` : ''}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* TABEL PELANGGAN */}
      <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-purple-50 text-slate-700 font-semibold border-b border-purple-100">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Nama Pelanggan</th>
                <th className="px-6 py-4 whitespace-nowrap">No. WhatsApp</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Total Transaksi</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Total Dibelanjakan</th>
                <th className="px-6 py-4 whitespace-nowrap">Terakhir Sewa</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-purple-700 mx-auto mb-2" size={32} />
                    <p className="text-slate-500">Menganalisis data pelanggan...</p>
                  </td>
                </tr>
              ) : filteredPelanggan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Belum ada data pelanggan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPelanggan.map((p, index) => (
                  <tr key={index} className="hover:bg-purple-50/40 transition-colors">
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{p.nama}</div>
                      {index === 0 && <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase mt-1 inline-block">Top Customer</span>}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Phone size={14} className="text-slate-400" />
                        {p.wa}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-lg text-xs">
                        {p.totalTransaksi}x
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-black text-slate-800">
                        Rp {p.totalPengeluaran.toLocaleString('id-ID')}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <CalendarDays size={14} />
                        {formatDate(p.terakhirSewa)}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button 
                        onClick={() => handleWhatsApp(p.wa)}
                        disabled={p.wa === '-'}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Hubungi via WhatsApp"
                      >
                        <MessageCircle size={14} /> Hubungi
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}