import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "remover.store – Free AI Image Tools Online",
    template: "%s | remover.store",
  },
  description:
    "Free online AI image tools: remove backgrounds, upscale images, replace backgrounds, compress, crop, add watermarks & more – fast, private, directly in your browser.",
  metadataBase: new URL("https://remover.store"),
  keywords: [
    "background remover",
    "remove background online",
    "AI image tools",
    "image upscaler",
    "compress image",
    "crop image",
    "watermark tool",
    "image enhancer",
    "replace background",
    "photo retoucher",
    "free image editor",
    "online photo editor",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://remover.store",
    siteName: "remover.store",
    title: "remover.store – Free AI Image Tools Online",
    description:
      "Remove backgrounds, upscale images, compress, crop & more – all powered by AI, directly in your browser.",
  },
  twitter: {
    card: "summary_large_image",
    title: "remover.store – Free AI Image Tools Online",
    description:
      "Remove backgrounds, upscale images, compress, crop & more – all powered by AI, directly in your browser.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: "https://remover.store" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "remover.store",
              url: "https://remover.store",
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Any",
              description:
                "Free online AI image tools: remove backgrounds, upscale, compress, crop, watermark & more.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
                description: "Many tools are free. Premium AI tools cost credits starting at €2.99.",
              },
              featureList: [
                "AI Background Removal",
                "AI Image Upscaling",
                "Background Replacement",
                "Photo Retouching",
                "Image Enhancement",
                "Image Cropping",
                "Image Compression",
                "Watermark Tool",
              ],
            }),
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
