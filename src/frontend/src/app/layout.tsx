import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Providers } from "@/components/providers";
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
  description: "Event Management ERP for Just Love Forest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmSerif.variable} antialiased`}
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
