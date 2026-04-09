import type { Metadata } from "next";
import ToolApp from "../components/ToolApp";

export const metadata: Metadata = {
  title: "Crop Image Online – Free with Social Media Presets",
  description:
    "Crop and resize images for free with presets for Instagram, YouTube, Facebook, Pinterest, LinkedIn & more.",
  keywords: [
    "crop image",
    "resize image",
    "image cropper",
    "crop for Instagram",
    "crop for YouTube",
    "free image cropper",
  ],
  alternates: { canonical: "https://remover.store/crop-image" },
  openGraph: {
    title: "Crop Image Online – Free with Social Media Presets",
    description:
      "Crop and resize images for free with presets for Instagram, YouTube, Facebook & more.",
    url: "https://remover.store/crop-image",
  },
};

export default function CropImagePage() {
  return <ToolApp initialTool="crop" />;
}
