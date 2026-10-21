import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Расчётка', template: '%s · Расчётка' },
  description: 'Коммунальные платежи арендаторов без Excel',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full text-[14px]">{children}</body>
    </html>
  );
}
