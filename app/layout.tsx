import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bruno | Check Your Unemployment Benefits Eligibility",
  description: "Free, instant unemployment benefits eligibility check. Answer a few questions and Bruno will help you understand if you qualify for unemployment insurance in your state.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        {children}
      </body>
    </html>
  );
}
