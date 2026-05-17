import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import SplashWrapper from "@/components/SplashWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glorious Amplification — Online Learning Platform",
  description:
    "Online classroom platform with video meetings, attendance tracking, recordings, and batch management by Glorious Amplification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>
          <AuthProvider>
            <SplashWrapper>{children}</SplashWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
