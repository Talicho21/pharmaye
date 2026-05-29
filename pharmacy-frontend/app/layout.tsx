import type { Metadata } from "next";
// Ignore missing type declarations for CSS modules in this file
// @ts-ignore: Implicit any for CSS import
import "./globals.css";

export const metadata: Metadata = {
  title: "Express Pharmaceutical Wholesale",
  description:
    "Inventory and sales dashboard for Express Pharmaceutical Wholesale.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}