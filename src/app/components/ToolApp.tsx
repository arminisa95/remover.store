"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Scissors, ZoomIn, Palette, Crop, FileDown,
  Stamp, Sparkles, Eraser,
} from "lucide-react";

import Header from "./Header";
import BuyCreditsModal from "./BuyCreditsModal";
import BackgroundRemover from "./BackgroundRemover";
import ImageUpscaler from "./ImageUpscaler";
import BackgroundReplacer from "./BackgroundReplacer";
import ImageCropper from "./ImageCropper";
import ImageCompressor from "./ImageCompressor";
import WatermarkTool from "./WatermarkTool";
import ImageEnhancer from "./ImageEnhancer";
import ObjectRemover from "./ObjectRemover";

type ToolId =
  | "bg-remove"
  | "upscale"
  | "bg-replace"
  | "crop"
  | "compress"
  | "watermark"
  | "enhance"
  | "retouch"
  | null;

const TOOLS: {
  id: ToolId;
  label: string;
  desc: string;
  icon: React.ElementType;
  cost: string;
  color: string;
}[] = [
  { id: "bg-remove", label: "Remove Background", desc: "AI removes the background from any image", icon: Scissors, cost: "1 Credit", color: "from-[#4ecdc4] to-[#2d8f88]" },
  { id: "upscale", label: "AI Upscaling", desc: "Enlarge images without losing quality (2x–4x)", icon: ZoomIn, cost: "1 Credit", color: "from-[#667eea] to-[#764ba2]" },
  { id: "bg-replace", label: "Replace Background", desc: "Replace background with color, gradient, or image", icon: Palette, cost: "1 Credit", color: "from-[#f093fb] to-[#f5576c]" },
  { id: "retouch", label: "Retoucher", desc: "Paint over and remove unwanted objects", icon: Eraser, cost: "1 Credit", color: "from-[#fa709a] to-[#fee140]" },
  { id: "enhance", label: "Enhance Image", desc: "Brightness, contrast, saturation & sharpness", icon: Sparkles, cost: "Free", color: "from-[#4facfe] to-[#00f2fe]" },
  { id: "crop", label: "Crop & Resize", desc: "Social media formats: Instagram, YouTube, etc.", icon: Crop, cost: "Free", color: "from-[#f97316] to-[#eab308]" },
  { id: "compress", label: "Compress Image", desc: "Reduce file size with quality slider", icon: FileDown, cost: "Free", color: "from-[#06b6d4] to-[#3b82f6]" },
  { id: "watermark", label: "Watermark", desc: "Add text watermarks to your images", icon: Stamp, cost: "Free", color: "from-[#ec4899] to-[#8b5cf6]" },
];

export default function ToolApp() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<ToolId>(null);
  const [credits, setCredits] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((d) => setCredits(d.credits ?? 0))
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && session?.user) {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((d) => setCredits(d.credits ?? 0))
        .catch(() => {});
      window.history.replaceState({}, "", "/");
    }
  }, [session]);

  const useCredit = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/credits/use", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not use credit.");
        return false;
      }
      setCredits(data.credits);
      return true;
    } catch {
      setError("Connection error.");
      return false;
    }
  }, []);

  const isLoggedIn = !!session?.user;
  const onLoginRequired = useCallback(() => router.push("/login"), [router]);
  const onNeedCredits = useCallback(() => setShowBuyModal(true), []);
  const onBack = useCallback(() => setActiveTool(null), []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0b1f1a] via-[#112a23] to-[#0a1c17] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4ecdc4] animate-spin" />
      </div>
    );
  }

  const commonProps = {
    credits,
    onUseCredit: useCredit,
    onBack,
    onNeedCredits,
    isLoggedIn,
    onLoginRequired,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1f1a] via-[#112a23] to-[#0a1c17] text-[#f0e8d8]">
      <Header credits={credits} onBuyCredits={() => setShowBuyModal(true)} />

      {error && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300 flex justify-between items-center">
            {error}
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100 text-sm ml-4">✕</button>
          </div>
        </div>
      )}

      {/* Tool selector */}
      {activeTool === null && (
        <main className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#f5efe0] mb-2">
              AI Image Tools for Every Need
            </h2>
            <p className="text-[#8aab98]">
              Pick a tool – everything runs directly in your browser, fast & secure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className="group bg-[#133027]/50 backdrop-blur-md border border-[#2a4a3a]/50 rounded-xl p-6 text-left hover:border-[#4ecdc4]/40 hover:bg-[#133027]/80 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${tool.color} mb-4 group-hover:shadow-lg transition-shadow`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1 text-[#f0e8d8] group-hover:text-[#4ecdc4] transition-colors">
                    {tool.label}
                  </h3>
                  <p className="text-sm text-[#8aab98] mb-3">{tool.desc}</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    tool.cost === "Free"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-[#4ecdc4]/15 text-[#4ecdc4]"
                  }`}>
                    {tool.cost}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {[
              { title: "100% In-Browser", desc: "Your images never leave your computer. Everything runs locally." },
              { title: "AI-Powered", desc: "State-of-the-art neural networks for precise results." },
              { title: "Pay-per-use", desc: "Affordable credits – only pay for what you need." },
            ].map((f) => (
              <div key={f.title} className="bg-[#133027]/40 border border-[#2a4a3a]/40 rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-1 text-[#f0e8d8]">{f.title}</h3>
                <p className="text-sm text-[#8aab98]">{f.desc}</p>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* Active tool */}
      {activeTool === "bg-remove" && <BackgroundRemover {...commonProps} />}
      {activeTool === "upscale" && <ImageUpscaler {...commonProps} />}
      {activeTool === "bg-replace" && <BackgroundReplacer {...commonProps} />}
      {activeTool === "crop" && <ImageCropper onBack={onBack} />}
      {activeTool === "compress" && <ImageCompressor onBack={onBack} />}
      {activeTool === "watermark" && <WatermarkTool onBack={onBack} />}
      {activeTool === "enhance" && <ImageEnhancer onBack={onBack} />}
      {activeTool === "retouch" && <ObjectRemover {...commonProps} />}

      {/* Buy Credits Modal */}
      {showBuyModal && (
        <BuyCreditsModal
          onClose={() => setShowBuyModal(false)}
          onError={(msg) => { setError(msg); setShowBuyModal(false); }}
        />
      )}
    </div>
  );
}
