import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

// Fonts come from npm packages and are bundled at build time, so the build
// never has to reach Google Fonts.
const playfair = localFont({
  src: "../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair",
  weight: "400 900",
});

export const metadata: Metadata = {
  title: "PeopleHub - LinkedIn People Search",
  description: "Search and discover LinkedIn professionals with AI-powered search",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${GeistMono.variable} antialiased`}
      >
        <Navigation />
        {children}
      </body>
    </html>
  );
}
