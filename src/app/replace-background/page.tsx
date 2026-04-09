import type { Metadata } from "next";
import ToolApp from "../components/ToolApp";

export const metadata: Metadata = {
  title: "Replace Background – Change Image Background with AI",
  description:
    "Replace the background of any image with a solid color, gradient, or custom image. AI-powered, fast, private.",
  keywords: [
    "replace background",
    "change background",
    "background changer",
    "photo background editor",
    "AI background replacement",
  ],
  alternates: { canonical: "https://remover.store/replace-background" },
  openGraph: {
    title: "Replace Background – Change Image Background with AI",
    description:
      "Replace the background of any image with color, gradient, or custom image. AI-powered.",
    url: "https://remover.store/replace-background",
  },
};

export default function ReplaceBackgroundPage() {
  return <ToolApp />;
}
