import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trivestack Product Team Hub",
  description: "The internal reporting workspace for Trivestack's product and delivery teams.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
