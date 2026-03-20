'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthImage from '@/components/auth/AuthImage';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-white">
      {/* Image Panel - slides between left and right */}
      <motion.div
        className="hidden lg:block absolute top-0 h-full w-1/2"
        animate={{ left: isLogin ? '0%' : '50%' }}
        transition={{ type: 'spring', stiffness: 170, damping: 26 }}
        style={{ zIndex: 10 }}
      >
        <AuthImage />
      </motion.div>

      {/* Form Panel - always centered in the non-image half */}
      <motion.div
        className="absolute top-0 h-full w-full lg:w-1/2 overflow-y-auto"
        animate={{ left: isLogin ? '50%' : '0%' }}
        transition={{ type: 'spring', stiffness: 170, damping: 26 }}
      >
        <div className="flex min-h-full items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
