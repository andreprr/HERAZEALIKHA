import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';

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
    // Hapus suppressHydrationWarning jika sudah tidak pakai ThemeProvider
    <html lang="en">
      <body className={`${inter.className} bg-pink-50 text-slate-800`}>
        <Toaster position="top-center" reverseOrder={false} />
        
        {/* Tidak perlu lagi dibungkus <ThemeProvider> */}
        <Sidebar>{children}</Sidebar>
        
      </body>
    </html>
  );
}