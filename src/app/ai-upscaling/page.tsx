import type { Metadata } from "next";
import ToolApp from "../components/ToolApp";

export const metadata: Metadata = {
  title: "AI Image Upscaler – Enlarge Images Without Losing Quality",
  description:
    "Upscale and enlarge your images 2x–4x with AI. No quality loss, fast processing, runs directly in your browser.",
  keywords: [
    "image upscaler",
    "AI upscaling",
    "enlarge image",
    "upscale photo",
    "increase image resolution",
    "free image upscaler",
  ],
  alternates: { canonical: "https://remover.store/ai-upscaling" },
  openGraph: {
    title: "AI Image Upscaler – Enlarge Images Without Losing Quality",
    description:
      "Upscale and enlarge your images 2x–4x with AI. No quality loss, runs in your browser.",
    url: "https://remover.store/ai-upscaling",
  },
};

export default function AIUpscalingPage() {
  return <ToolApp />;
}
