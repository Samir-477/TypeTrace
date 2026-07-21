import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TypeTrace — Inside a Typing Signature",
  description: "An interactive journey through a TCN–Transformer keystroke biometric model.",
};

const fonts = {
  "--font-manrope": '"Segoe UI", Arial, sans-serif',
  "--font-mono": '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
} as CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={fonts}>{children}</body>
    </html>
  );
}
