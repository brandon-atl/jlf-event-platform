import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Just Love Forest — Event Management",
  description:
    "Event Management System for Just Love Forest — where community gathering meets operational clarity.",
  icons: {
    icon: [
      { rel: 'icon', type: 'image/svg+xml', url: '/favicon.svg' },
      { rel: 'icon', type: 'image/x-icon', url: '/favicon.ico' }
    ],
  },
  openGraph: {
    title: "Just Love Forest — Event Management",
    description: "Register for retreats, community weekends, and forest gatherings at Just Love Forest.",
    siteName: "Just Love Forest Events",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Blocking script to prevent FOUC — applies dark class before first paint
  const themeScript = `(function(){try{var t=localStorage.getItem('jlf-theme');if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${dmSans.variable} ${dmSerif.variable} antialiased`}
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
