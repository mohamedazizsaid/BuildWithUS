import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { ConvexClientProvider } from "@/context/convex";
import { Toaster } from "react-hot-toast";
import UpgradeModal from "@/components/UpgradeModal";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Winaity - Template Builder",
  description: "Build beautiful email templates, invoices, and contracts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Nunito:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Figtree:wght@400;500;600;700&family=Sora:wght@400;500;600;700&family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=DM+Serif+Display&family=Cormorant+Garamond:wght@400;600;700&family=Libre+Baskerville:wght@400;700&family=JetBrains+Mono:wght@400;500;700&family=Fira+Code:wght@400;500;700&family=Space+Mono:wght@400;700&family=IBM+Plex+Mono:wght@400;500;700&family=Pacifico&family=Lobster&family=Righteous&family=Bebas+Neue&family=Abril+Fatface&family=Yeseva+One&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ConvexClientProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ConvexClientProvider>
        <UpgradeModal />
        <Toaster
          position="top-center"
          gutter={10}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '13px 16px',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '1.4',
              maxWidth: '460px',
              boxShadow: '0 12px 34px -12px rgba(15, 23, 42, 0.28)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#ffffff' },
            },
            error: {
              duration: 6000,
              iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
              style: {
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#7f1d1d',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
