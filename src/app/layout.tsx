import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VMA Platform — Virtual Meeting Assistant",
  description: "Branded Virtual Meeting Assistant Platform by OmniSuiteAI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceGrotesk.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}

