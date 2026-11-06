import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VEGAH - Job Processing App',
  description: 'Assessment project: Next.js, NestJS, BullMQ, Redis, PostgreSQL',
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

