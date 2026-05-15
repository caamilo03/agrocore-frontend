import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ShellLayout from "@/components/ShellLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgroCore - Smart Farming",
  description: "Ecosistema de Smart Farming de Grado Industrial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full bg-[#F9FBF9] text-gray-800">
        <Providers>
          <ShellLayout>{children}</ShellLayout>
        </Providers>
      </body>
    </html>
  );
}
