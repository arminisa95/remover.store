import type { Metadata } from "next";
import ToolApp from "../components/ToolApp";

export const metadata: Metadata = {
  title: "Add Watermark to Image – Free Online Watermark Tool",
  description:
    "Add text watermarks to your images for free. Choose position, opacity, and size. Runs in your browser, no upload needed.",
  keywords: [
    "watermark tool",
    "add watermark",
    "watermark image",
    "photo watermark",
    "free watermark tool",
    "text watermark",
  ],
  alternates: { canonical: "https://remover.store/watermark" },
  openGraph: {
    title: "Add Watermark to Image – Free Online Watermark Tool",
    description:
      "Add text watermarks to your images for free. Choose position, opacity, and size.",
    url: "https://remover.store/watermark",
  },
};

export default function WatermarkPage() {
  return <ToolApp />;
}
