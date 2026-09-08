'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Loader2, Lock, User, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Username dan password wajib diisi!');

    setIsLoading(true);
    try {
      // Cek ke tabel users di Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !user) {
        toast.error('Username atau Password salah!');
        setIsLoading(false);
        return;
      }

      // Jika berhasil, simpan sesi ke localStorage
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userName', user.nama_lengkap);
      localStorage.setItem('userId', user.id);

      toast.success(`Selamat datang, ${user.nama_lengkap}!`);
      
      // Redirect ke dashboard
      router.push('/dashboard');
      
    } catch (error: any) {
      toast.error('Terjadi kesalahan saat login.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      
      {/* Background Ornamen */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border border-purple-50 relative z-10 mx-4">
        <div className="flex flex-col items-center mb-8">
          <img src="/gambar.png" alt="Logo Herazealikha" className="h-24 w-auto object-contain mb-4" />
          <h1 className="text-2xl font-black text-slate-800">Sistem Kasir & Inventaris</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Silakan masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-700/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
            {isLoading ? 'Memproses...' : 'Masuk Sistem'}
          </button>
        </form>
        
        <p className="text-center text-xs text-slate-400 font-semibold mt-8">
          &copy; {new Date().getFullYear()} HERAZEALIKHA
        </p>
      </div>
    </div>
  );
}