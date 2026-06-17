import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2 Bits Creative — CRM",
  description: "Internal CRM & Project Management for 2 Bits Creative",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#0A0A0F] text-[#F0F0F8] antialiased">{children}</body>
    </html>
  );
}
