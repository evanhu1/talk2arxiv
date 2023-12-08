import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react';
import './globals.css'

export const metadata: Metadata = {
  title: 'Talk2Arxiv',
  description: 'Chat with any Arxiv paper!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="">
      <head>
        {/* <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests" /> */}
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
