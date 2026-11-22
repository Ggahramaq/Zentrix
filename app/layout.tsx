import type { Metadata } from "next";
import { WebAnalytics } from "../components/web-analytics";
import "./globals.css";
import "./lab.css";

export const metadata: Metadata = {
  title: "Zentrix — Discover the Colors Your Camera Invents",
  description: "Discover how a camera reconstructs color through an interactive Bayer sensor experiment.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<WebAnalytics /></body></html>;
}
