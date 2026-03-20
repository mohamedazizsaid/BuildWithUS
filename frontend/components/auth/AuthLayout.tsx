'use client';

import { motion } from 'framer-motion';
import AuthImage from './AuthImage';

interface AuthLayoutProps {
  children: React.ReactNode;
  imagePosition: 'left' | 'right';
}

export default function AuthLayout({ children, imagePosition }: AuthLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* Image Panel */}
      <motion.div
        layout
        className="hidden lg:block lg:w-1/2 h-full"
        style={{ order: imagePosition === 'left' ? 0 : 1 }}
        initial={false}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      >
        <AuthImage />
      </motion.div>

      {/* Form Panel */}
      <motion.div
        layout
        className="w-full lg:w-1/2 h-full overflow-y-auto"
        style={{ order: imagePosition === 'left' ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
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
