'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  UserPlus, Edit, Trash2, Shield, User, Loader2, X, CheckCircle, UserCog
} from 'lucide-react';

export default function PengaturanUserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    password: '',
    nama_lengkap: '',
    role: 'KASIR'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('role', { ascending: false }); // OWNER di atas

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error('Gagal memuat data pengguna');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setFormData({
        id: user.id,
        username: user.username,
        password: user.password,
        nama_lengkap: user.nama_lengkap,
        role: user.role
      });
    } else {
      setFormData({ id: '', username: '', password: '', nama_lengkap: '', role: 'KASIR' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (formData.id) {
        // UPDATE USER
        const { error } = await supabase
          .from('users')
          .update({
            username: formData.username,
            password: formData.password,
            nama_lengkap: formData.nama_lengkap,
            role: formData.role
          })
          .eq('id', formData.id);
        if (error) throw error;
        toast.success('Data pengguna berhasil diperbarui!');
      } else {
        // CREATE NEW USER
        const { error } = await supabase
          .from('users')
          .insert([{
            username: formData.username,
            password: formData.password,
            nama_lengkap: formData.nama_lengkap,
            role: formData.role
          }]);
        if (error) throw error;
        toast.success('Pengguna baru berhasil ditambahkan!');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Gagal menyimpan data: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, role: string) => {
    if (role === 'OWNER') {
      return toast.error('Akun OWNER tidak dapat dihapus!');
    }
    
    if (!window.confirm('Apakah Anda yakin ingin menghapus akun KASIR ini?')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      toast.success('Akun berhasil dihapus!');
      fetchUsers();
    } catch (error) {
      toast.error('Gagal menghapus akun.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] bg-white">
        <Loader2 size={40} className="text-purple-700 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat data pengguna...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pengaturan User</h1>
          <p className="text-slate-500 mt-1">Kelola hak akses untuk Owner dan Kasir</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <UserPlus size={18} /> Tambah Kasir
        </button>
      </div>

      {/* DAFTAR USER */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Nama Pengguna</th>
                <th className="px-6 py-4 font-semibold">Username</th>
                <th className="px-6 py-4 font-semibold">Role / Peran</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{user.nama_lengkap}</td>
                  <td className="px-6 py-4 text-slate-600">{user.username}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                      user.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'OWNER' ? <Shield size={14}/> : <User size={14}/>}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-end gap-3">
                    <button 
                      onClick={() => handleOpenModal(user)}
                      className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <Edit size={18} />
                    </button>
                    {user.role !== 'OWNER' && (
                      <button 
                        onClick={() => handleDelete(user.id, user.role)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus Kasir"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Belum ada data user.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH/EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-purple-100 bg-purple-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserCog size={20} className="text-purple-600"/> 
                {formData.id ? 'Edit Data Pengguna' : 'Tambah Kasir Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" required
                  placeholder="Misal: Rina Kasir"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Username (Untuk Login)</label>
                <input 
                  type="text" required
                  placeholder="Misal: kasir01"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Password</label>
                <input 
                  type="text" required
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Peran / Role</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold"
                >
                  <option value="KASIR">KASIR</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1 italic">*OWNER dapat mengakses seluruh menu (termasuk Laporan & Keuangan). KASIR dibatasi.</p>
              </div>

              <div className="pt-4 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">Batal</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18}/>} Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}