import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

// Import sesuai keinginan Anda
import MainLayout from '@/components/Sidebar'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HERAZEALIKHA - Inventaris & Sewa',
  description: 'Sistem manajemen inventaris dan penyewaan butik',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" >
      {/* Tambahkan bg-white dan text-slate-800 secara eksplisit di sini */}
      <body className={`${inter.className} bg-white text-slate-800`} >
    
          <Toaster position="top-center" reverseOrder={false} />
          {/* MainLayout ini sekarang memanggil file Sidebar.tsx Anda */}
          <MainLayout>{children}</MainLayout>
        
      </body>
    </html>
  );
}