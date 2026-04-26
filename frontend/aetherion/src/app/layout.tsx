import "./globals.css";
import React from "react";
import Header from "@/components/Header";

export const metadata = {
  title: "Tourist AI - Smart Travel Assistant",
  description: "AI-powered travel planning and navigation platform.",
};

import Footer from "@/components/Footer";
import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <LanguageProvider>
          <Header />
          <main style={{ flex: 1, position: "relative", zIndex: 1 }}>
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
