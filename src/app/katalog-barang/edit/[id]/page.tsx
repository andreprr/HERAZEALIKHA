'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  Save, X, Upload, Tag, Box, DollarSign, Type, Loader2, List, Plus, Check 
} from 'lucide-react';

export default function EditBarangPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [namaBarang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState('');
  const [harga, setHarga] = useState('');
  const [stok, setStok] = useState('');
  const [kelengkapan, setKelengkapan] = useState(''); 
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State Khusus Kategori Dinamis
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [isAddingKategori, setIsAddingKategori] = useState(false);
  const [kategoriBaru, setKategoriBaru] = useState('');

  // 1. Ambil Daftar Kategori dari Database
  useEffect(() => {
    const fetchKategori = async () => {
      const { data } = await supabase.from('kategori').select('*').order('nama', { ascending: true });
      if (data) setKategoriList(data);
    };
    fetchKategori();
  }, []);

  // 2. Ambil Data Barang Lama yang mau di-edit
  useEffect(() => {
    const fetchBarang = async () => {
      try {
        const { data, error } = await supabase
          .from('katalog_barang')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          setNamaBarang(data.nama_barang);
          setKategori(data.kategori);
          setHarga(data.harga.toString());
          setStok(data.stok.toString());
          setKelengkapan(data.kelengkapan || ''); 
          if (data.gambar_url) {
            setPreviewImage(data.gambar_url);
            setExistingImageUrl(data.gambar_url);
          }
        }
      } catch (error: any) {
        toast.error('Gagal memuat data barang.');
        router.push('/katalog-barang');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchBarang();
  }, [id, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  // 3. Fungsi Tambah Kategori Baru
  const handleSimpanKategori = async () => {
    if (!kategoriBaru.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('kategori')
        .insert([{ nama: kategoriBaru.trim() }])
        .select();

      if (error) throw error;

      if (data) {
        setKategoriList([...kategoriList, data[0]]);
        setKategori(data[0].nama);
        setIsAddingKategori(false);
        setKategoriBaru('');
        toast.success('Kategori baru ditambahkan!');
      }
    } catch (error: any) {
      toast.error('Gagal menambah kategori, mungkin nama sudah ada.');
    }
  };

  // 4. Fungsi Update Data ke Database
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    if (!kategori) return toast.error('Silakan pilih kategori!');
    setIsSubmitting(true);

    try {
      let finalImageUrl = existingImageUrl;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('katalog-foto')
          .upload(fileName, imageFile);

        if (uploadError) throw new Error('Gagal upload gambar baru.');

        const { data: publicUrlData } = supabase.storage
          .from('katalog-foto')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('katalog_barang')
        .update({
          nama_barang: namaBarang,
          kategori: kategori,
          harga: Number(harga),
          stok: Number(stok),
          kelengkapan: kelengkapan, 
          gambar_url: finalImageUrl,
        })
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('Perubahan berhasil disimpan!');
      router.push('/katalog-barang');
      router.refresh(); 

    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white">
        <Loader2 size={40} className="text-purple-700 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat data barang...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 pt-2 max-w-5xl bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Edit Barang</h2>
          <p className="text-sm text-slate-500 mt-1">Perbarui detail atau foto barang inventaris Anda.</p>
        </div>
        <Link 
          href="/katalog-barang"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-purple-200 rounded-xl hover:bg-purple-50 transition-colors shadow-sm"
        >
          <X size={16} /> Batal
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-purple-200">
        <form onSubmit={handleUpdate} className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
          
          {/* FOTO */}
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
                  <span className="text-sm font-semibold text-slate-700">Ganti Foto</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* DETAIL BARANG */}
          <div className="w-full md:w-2/3 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Barang</label>
              <div className="relative">
                <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={namaBarang} onChange={(e) => setNamaBarang(e.target.value)} className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Kategori Dinamis */}
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

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Stok Tersedia</label>
                <div className="relative">
                  <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="number" value={stok} onChange={(e) => setStok(e.target.value)} min="0" className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Harga Sewa (Rp)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="number" value={harga} onChange={(e) => setHarga(e.target.value)} min="0" className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 text-slate-800 outline-none" required />
              </div>
            </div>

            {/* Kelengkapan */}
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
            
            {/* Tombol Simpan */}
            <div className="pt-6 mt-6 pb-2 border-t border-purple-100 flex justify-end">
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-sm w-full sm:w-auto justify-center disabled:opacity-50">
                <Save size={18} />
                {isSubmitting ? 'Menyimpan...' : 'Perbarui Barang'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}