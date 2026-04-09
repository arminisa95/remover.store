import type { Metadata } from "next";
import ToolApp from "../components/ToolApp";

export const metadata: Metadata = {
  title: "Photo Retoucher – Remove Unwanted Objects from Images",
  description:
    "Paint over and remove unwanted objects from your photos with AI. Easy-to-use retouching tool, runs in your browser.",
  keywords: [
    "photo retoucher",
    "remove object from photo",
    "object remover",
    "photo cleanup",
    "AI retouching",
    "inpainting tool",
  ],
  alternates: { canonical: "https://remover.store/retoucher" },
  openGraph: {
    title: "Photo Retoucher – Remove Unwanted Objects from Images",
    description:
      "Paint over and remove unwanted objects from your photos with AI.",
    url: "https://remover.store/retoucher",
  },
};

export default function RetoucherPage() {
  return <ToolApp initialTool="retouch" />;
}
