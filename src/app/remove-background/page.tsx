import type { Metadata } from "next";
import ToolApp from "../components/ToolApp";

export const metadata: Metadata = {
  title: "Remove Background from Image – Free AI Background Remover",
  description:
    "Remove the background from any image instantly using AI. Free online background remover – fast, private, no upload needed.",
  keywords: [
    "remove background",
    "background remover",
    "remove background from image",
    "transparent background",
    "AI background remover",
    "free background remover",
  ],
  alternates: { canonical: "https://remover.store/remove-background" },
  openGraph: {
    title: "Remove Background from Image – Free AI Background Remover",
    description:
      "Remove the background from any image instantly using AI. Fast, private, runs in your browser.",
    url: "https://remover.store/remove-background",
  },
};

export default function RemoveBackgroundPage() {
  return <ToolApp />;
}
