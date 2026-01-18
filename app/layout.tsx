import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
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
        className={`${plusJakarta.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-plus-jakarta)' }}
      >
        {children}
      </body>
    </html>
  );
}
