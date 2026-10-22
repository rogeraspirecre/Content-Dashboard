import type { Metadata } from "next";
import "./globals.css";
import Nav from "./nav";

export const metadata: Metadata = {
  title: "Aspire Content Console",
  description: "Content system for Aspire Commercial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
