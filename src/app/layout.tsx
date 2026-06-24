import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
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
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}

