import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Management System",
  description: "Spring Boot · JWT · Railway",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
