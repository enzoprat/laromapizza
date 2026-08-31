import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s | La Roma Pizza" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
