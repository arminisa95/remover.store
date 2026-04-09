import type { Metadata } from "next";
import ToolApp from "../components/ToolApp";

export const metadata: Metadata = {
  title: "Enhance Image – Adjust Brightness, Contrast & Sharpness Free",
  description:
    "Enhance your images for free. Adjust brightness, contrast, saturation, and sharpness – all in your browser, no upload needed.",
  keywords: [
    "enhance image",
    "image enhancer",
    "adjust brightness",
    "adjust contrast",
    "sharpen image",
    "free photo editor",
  ],
  alternates: { canonical: "https://remover.store/enhance-image" },
  openGraph: {
    title: "Enhance Image – Adjust Brightness, Contrast & Sharpness Free",
    description:
      "Enhance your images for free. Adjust brightness, contrast, saturation, and sharpness in your browser.",
    url: "https://remover.store/enhance-image",
  },
};

export default function EnhanceImagePage() {
  return <ToolApp />;
}
