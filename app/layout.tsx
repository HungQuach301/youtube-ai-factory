import type { Metadata } from "next";
import "./globals.css";
import "./kernel.css";
import "./continuity.css";
import "./portfolio.css";

export const metadata: Metadata = {
  title: "AI Factory — Multi-channel YouTube Operations",
  description: "Evidence-led multi-channel discovery, strategy, content planning and controlled production.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
