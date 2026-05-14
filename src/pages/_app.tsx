import type { AppProps } from 'next/app';
import { Share_Tech_Mono } from 'next/font/google';

import '../styles/globals.css';

const shareTechMono = Share_Tech_Mono({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={shareTechMono.className}>
      <Component {...pageProps} />
    </div>
  );
}
