'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Save, X, Upload, Tag, Box, DollarSign, Type, List, Plus, Check, Hash, Ruler 
} from 'lucide-react';

export default function TambahBarangPage() {
  const router = useRouter();
  
  const [namaBarang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState('');
  
  // Field Baru
  const [sku, setSku] = useState('');
  const [varian, setVarian] = useState('');
  
  const [harga, setHarga] = useState('');
  const [stok, setStok] = useState('');
  const [kelengkapan, setKelengkapan] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Khusus Kategori Dinamis
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [isAddingKategori, setIsAddingKategori] = useState(false);
  const [kategoriBaru, setKategoriBaru] = useState('');

  // Ambil daftar kategori dari database saat halaman dimuat
  useEffect(() => {
    const fetchKategori = async () => {
      const { data } = await supabase.from('kategori').select('*').order('nama', { ascending: true });
      if (data) setKategoriList(data);
    };
    fetchKategori();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  // Fungsi menyimpan kategori baru ke database
  const handleSimpanKategori = async () => {
    if (!kategoriBaru.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('kategori')
        .insert([{ nama: kategoriBaru.trim() }])
        .select();

      if (error) throw error;

      if (data) {
        setKategoriList([...kategoriList, data[0]]); // Update list di UI
        setKategori(data[0].nama); // Otomatis pilih kategori baru
        setIsAddingKategori(false);
        setKategoriBaru('');
        toast.success('Kategori baru ditambahkan!');
      }
    } catch (error: any) {
      toast.error('Gagal menambah kategori, mungkin nama sudah ada.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    if (!kategori) return toast.error('Silakan pilih kategori terlebih dahulu!');
    
    setIsSubmitting(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('katalog-foto')
          .upload(fileName, imageFile);

        if (uploadError) throw new Error('Gagal upload gambar: ' + uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from('katalog-foto')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('katalog_barang')
        .insert([
          {
            nama_barang: namaBarang,
            kategori: kategori,
            sku: sku || null, // Field baru
            varian: varian || null, // Field baru
            harga: Number(harga),
            stok: Number(stok),
            kelengkapan: kelengkapan, 
            gambar_url: imageUrl,
          }
        ]);

      if (dbError) throw dbError;

      toast.success('Barang berhasil ditambahkan!');
      router.push('/katalog-barang');
      router.refresh(); 

    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 max-w-5xl bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tambah Barang Baru</h2>
          <p className="text-sm text-slate-500 mt-1">Masukkan detail barang ke dalam katalog inventaris.</p>
        </div>
        <Link 
          href="/katalog-barang"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-purple-200 rounded-xl hover:bg-purple-50 transition-colors shadow-sm"
        >
          <X size={16} /> Batal
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-purple-200">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
          
          <div className="w-full md:w-1/3 flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-700">Foto Barang</label>
            <div className="relative w-full aspect-[4/5] bg-purple-50/50 border-2 border-dashed border-purple-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:bg-purple-50 transition-colors group cursor-pointer">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-purple-100">
                    <Upload size={20} className="text-purple-700" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Upload Foto</span>
                  <span className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {previewImage && (
              <button 
                type="button" 
                onClick={() => { setPreviewImage(null); setImageFile(null); }}
                className="text-xs text-red-500 hover:text-red-600 font-semibold mt-1"
              >
                Hapus Foto
              </button>
            )}
          </div>

          <div className="w-full md:w-2/3 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Barang</label>
              <div className="relative">
                <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} placeholder="Contoh: Gaun Pengantin Putih" className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Bagian Kategori Dinamis */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kategori</label>
                
                {isAddingKategori ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={kategoriBaru} 
                      onChange={(e) => setKategoriBaru(e.target.value)} 
                      placeholder="Nama kategori..." 
                      className="w-full px-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none"
                      autoFocus
                    />
                    <button type="button" onClick={handleSimpanKategori} className="p-3 bg-purple-700 text-white rounded-xl hover:bg-purple-800 transition-colors shadow-sm">
                      <Check size={18} />
                    </button>
                    <button type="button" onClick={() => setIsAddingKategori(false)} className="p-3 bg-purple-50 text-slate-600 rounded-xl hover:bg-purple-100 transition-colors border border-purple-200">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none appearance-none cursor-pointer" required>
                        <option value="" disabled>Pilih Kategori</option>
                        {kategoriList.map((cat) => (
                          <option key={cat.id} value={cat.nama}>{cat.nama}</option>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={() => setIsAddingKategori(true)} title="Tambah Kategori Baru" className="p-3 bg-purple-50 text-slate-600 rounded-xl hover:bg-purple-100 transition-colors border border-purple-200">
                      <Plus size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kode / SKU (Opsional)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Contoh: GN-001" className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Varian / Ukuran */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Varian / Ukuran (Opsional)</label>
                <div className="relative">
                  <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={varian} onChange={(e) => setVarian(e.target.value)} placeholder="Contoh: L, All Size, Mocca" className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none" />
                </div>
              </div>

              {/* Stok */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Stok Tersedia</label>
                <div className="relative">
                  <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="number" value={stok} onChange={(e) => setStok(e.target.value)} placeholder="0" min="0" className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Harga Sewa (Rp)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="number" value={harga} onChange={(e) => setHarga(e.target.value)} placeholder="Contoh: 250000" min="0" className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Kelengkapan Barang (Opsional)</label>
              <div className="relative">
                <List className="absolute left-4 top-3 text-slate-400" size={18} />
                <textarea 
                  value={kelengkapan} 
                  onChange={(e) => setKelengkapan(e.target.value)} 
                  placeholder="Contoh: Dasi, Manset, Cover Jas..." 
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none min-h-[80px]" 
                />
              </div>
            </div>
            
            <div className="pt-6 mt-6 pb-2 border-t border-purple-100 flex justify-end">
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm w-full sm:w-auto justify-center disabled:opacity-50 disabled:hover:scale-100">
                <Save size={18} />
                {isSubmitting ? 'Mengunggah...' : 'Simpan Barang'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}