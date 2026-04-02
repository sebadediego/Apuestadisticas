import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Apuestadisticas — Analisis Deportivo en Vivo',
  description: 'Resultados en vivo, cuotas, predicciones y analisis deportivo profesional.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <div className="layout-wrapper">
          {children}
        </div>
      </body>
    </html>
  );
}
