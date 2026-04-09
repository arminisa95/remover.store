import type { Metadata } from "next";
import ToolApp from "../components/ToolApp";

export const metadata: Metadata = {
  title: "Compress Image Online – Reduce File Size for Free",
  description:
    "Compress JPEG and WebP images online for free. Reduce file size with an adjustable quality slider, all in your browser.",
  keywords: [
    "compress image",
    "image compressor",
    "reduce image size",
    "compress JPEG",
    "compress WebP",
    "free image compressor",
  ],
  alternates: { canonical: "https://remover.store/compress-image" },
  openGraph: {
    title: "Compress Image Online – Reduce File Size for Free",
    description:
      "Compress JPEG and WebP images for free. Adjustable quality slider, runs in your browser.",
    url: "https://remover.store/compress-image",
  },
};

export default function CompressImagePage() {
  return <ToolApp />;
}
