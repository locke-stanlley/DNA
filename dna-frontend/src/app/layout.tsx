import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata = {
  title: "DNA Network Dashboard",
  description: "Manage DNA blockchain nodes, wallets, transactions and contracts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dna-bg">
        <Sidebar />
        <div className="ml-[240px] min-h-screen p-4 md:p-6">
          <div className="dna-shell">{children}</div>
        </div>
      </body>
    </html>
  );
}
