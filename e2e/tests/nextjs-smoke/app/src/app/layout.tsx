import type { Metadata } from "next";
import "@tailor-platform/app-shell/styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js smoke",
  description: "Minimal Next.js App Router smoke test for AppShell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
