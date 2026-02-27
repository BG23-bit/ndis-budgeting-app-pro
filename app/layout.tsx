import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "NDIS Budget Calculator | Kevria",
  description: "The professional NDIS budget calculator built by providers, for providers. Upload your plan PDF, auto-calculate rosters, track spending, and export branded reports — all in one tool.",
  keywords: "NDIS budget calculator, NDIS roster of care, support coordination, SIL budget, NDIS plan management, Australia",
  openGraph: {
    title: "NDIS Budget Calculator | Kevria",
    description: "Professional NDIS budget calculator. Upload plan PDFs, roster of care costing, public holiday calculations, and branded export reports.",
    url: "https://ndis-budgeting-app-pro.vercel.app",
    siteName: "Kevria NDIS Budget Calculator",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NDIS Budget Calculator | Kevria",
    description: "Professional NDIS budget calculator built by providers, for providers.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

