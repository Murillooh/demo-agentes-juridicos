import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Serif só pros títulos - dá o tom "escritório de advocacia" sem virar
// template genérico de SaaS (que quase sempre é 100% sans-serif).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600"],
});

export const metadata = {
  title: "Plataforma Jurídica",
  description: "Plataforma multi-tenant de IA para escritórios de advocacia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
