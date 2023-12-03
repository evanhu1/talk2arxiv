import type { Metadata } from 'next'
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
      <body>{children}</body>
    </html>
  )
}
