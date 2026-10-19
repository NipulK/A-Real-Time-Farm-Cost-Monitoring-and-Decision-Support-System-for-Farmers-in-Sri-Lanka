import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Farmwise · Farm Cost Monitoring",
  description:
    "Cultivation costs, harvests and decisions, grounded in your records.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
