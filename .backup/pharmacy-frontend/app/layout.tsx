import type { Metadata } from "next";
// Ignore missing type declarations for CSS modules in this file
// @ts-ignore: Implicit any for CSS import
import "./globals.css";

export const metadata: Metadata = {
  title: "Hawan Drug Store",
  description:
    "Inventory and sales dashboard for Hawan Drug Store.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-off-white text-slate-800">
        {children}
      </body>
    </html>
  );
}