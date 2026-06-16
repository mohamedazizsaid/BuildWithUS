import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { ConvexClientProvider } from "@/context/convex";
import { Toaster } from "react-hot-toast";
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
        <Toaster position="top-right"/>
      </body>
    </html>
  );
}
