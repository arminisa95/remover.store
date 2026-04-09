"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Loader2, Scissors, ZoomIn, Palette, Crop, FileDown,
  Stamp, Sparkles, Eraser, Upload, Download, Trash2,
} from "lucide-react";

import Header from "./Header";
import BuyCreditsModal from "./BuyCreditsModal";
import ImageUpscaler from "./ImageUpscaler";
import BackgroundReplacer from "./BackgroundReplacer";
import ImageCropper from "./ImageCropper";
import ImageCompressor from "./ImageCompressor";
import WatermarkTool from "./WatermarkTool";
import ImageEnhancer from "./ImageEnhancer";
import ObjectRemover from "./ObjectRemover";

type EditToolId = "bg-replace" | "upscale" | "crop" | "compress" | "watermark" | "enhance" | "retouch" | null;

const EDIT_TOOLS: { id: EditToolId; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { id: "bg-replace", label: "Replace Background", desc: "Swap background with color, gradient, or image", icon: Palette, color: "from-[#f093fb] to-[#f5576c]" },
  { id: "upscale", label: "AI Upscaling", desc: "Enlarge without losing quality (2×–4×)", icon: ZoomIn, color: "from-[#667eea] to-[#764ba2]" },
  { id: "retouch", label: "Retoucher", desc: "Paint over and remove unwanted objects", icon: Eraser, color: "from-[#fa709a] to-[#fee140]" },
  { id: "enhance", label: "Enhance", desc: "Brightness, contrast, saturation & sharpness", icon: Sparkles, color: "from-[#4facfe] to-[#00f2fe]" },
  { id: "crop", label: "Crop & Resize", desc: "Social media formats & custom crop", icon: Crop, color: "from-[#f97316] to-[#eab308]" },
  { id: "compress", label: "Compress", desc: "Reduce file size with quality slider", icon: FileDown, color: "from-[#06b6d4] to-[#3b82f6]" },
  { id: "watermark", label: "Watermark", desc: "Add text watermarks to your image", icon: Stamp, color: "from-[#ec4899] to-[#8b5cf6]" },
];

async function generatePreview(fullResUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 600;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const cs = 10;
      for (let y = 0; y < h; y += cs) {
        for (let x = 0; x < w; x += cs) {
          ctx.fillStyle = ((x / cs + y / cs) | 0) % 2 === 0 ? "#e0e0e0" : "#ffffff";
          ctx.fillRect(x, y, cs, cs);
        }
      }
      ctx.drawImage(img, 0, 0, w, h);

      const fs = Math.max(18, Math.round(w / 10));
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#000";
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 6);
      for (let dy = -h; dy < h; dy += fs * 2.5) {
        ctx.fillText("PREVIEW", 0, dy);
      }
      ctx.restore();

      resolve(canvas.toDataURL("image/png", 0.6));
    };
    img.src = fullResUrl;
  });
}

export default function ToolApp() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [workingImageUrl, setWorkingImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<EditToolId>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [credits, setCredits] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/credits").then((r) => r.json()).then((d) => setCredits(d.credits ?? 0)).catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && session?.user) {
      fetch("/api/credits").then((r) => r.json()).then((d) => setCredits(d.credits ?? 0)).catch(() => {});
      window.history.replaceState({}, "", "/");
    }
  }, [session]);

  const useCredit = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/credits/use", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not use credit."); return false; }
      setCredits(data.credits);
      return true;
    } catch { setError("Connection error."); return false; }
  }, []);

  const isLoggedIn = !!session?.user;
  const onLoginRequired = useCallback(() => router.push("/login"), [router]);
  const onNeedCredits = useCallback(() => setShowBuyModal(true), []);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 50 * 1024 * 1024) { setError("File too large. Maximum 50 MB."); return; }
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const result = await removeBackground(file, {
        output: { format: "image/png", quality: 1 },
        progress: (_k: string, c: number, t: number) => { if (t > 0) setProgress(Math.round((c / t) * 100)); },
      });
      const url = URL.createObjectURL(result);
      setWorkingImageUrl(url);
      setPreviewUrl(await generatePreview(url));
    } catch { setError("Error removing background. Please try again."); }
    finally { setIsProcessing(false); }
  }, []);

  const downloadHD = useCallback(async () => {
    if (!workingImageUrl) return;
    if (!isLoggedIn) { onLoginRequired(); return; }
    if (credits < 1) { onNeedCredits(); return; }
    const ok = await useCredit();
    if (!ok) return;
    const a = document.createElement("a");
    a.href = workingImageUrl;
    a.download = "image_remover_store.png";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [workingImageUrl, credits, isLoggedIn, useCredit, onLoginRequired, onNeedCredits]);

  const reset = useCallback(() => {
    if (workingImageUrl) URL.revokeObjectURL(workingImageUrl);
    setWorkingImageUrl(null);
    setPreviewUrl(null);
    setActiveTool(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [workingImageUrl]);

  const handleToolResult = useCallback(async (url: string) => {
    if (workingImageUrl && workingImageUrl !== url) URL.revokeObjectURL(workingImageUrl);
    setWorkingImageUrl(url);
    setPreviewUrl(await generatePreview(url));
    setActiveTool(null);
  }, [workingImageUrl]);

  const commonProps = {
    credits,
    onUseCredit: useCredit,
    onBack: () => setActiveTool(null),
    onNeedCredits,
    isLoggedIn,
    onLoginRequired,
    inputImageUrl: workingImageUrl || undefined,
    onResult: handleToolResult,
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0b1f1a] via-[#112a23] to-[#0a1c17] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4ecdc4] animate-spin" />
      </div>
    );
  }

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

      {/* ──── LANDING: Background Remover ──── */}
      {!workingImageUrl && !isProcessing && (
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#4ecdc4] to-[#2d8f88] mb-6">
              <Scissors className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#f5efe0] mb-4">
              Remove Background Instantly
            </h1>
            <p className="text-lg text-[#8aab98] max-w-2xl mx-auto">
              Upload any image and our AI removes the background in seconds.
              Then edit for free – crop, enhance, add watermarks & more.
              Download in full quality for just 1 credit.
            </p>
          </div>

          <div
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-20 flex flex-col items-center justify-center gap-5 transition-all duration-300 ${
              isDragging ? "border-[#4ecdc4] bg-[#4ecdc4]/10" : "border-[#2a4a3a] bg-[#133027]/50 hover:border-[#4ecdc4]/50"
            }`}
          >
            <Upload className="w-12 h-12 text-[#4ecdc4]" />
            <div className="text-center pointer-events-none">
              <p className="text-xl font-semibold text-[#f0e8d8]">Drag & drop an image or click to upload</p>
              <p className="text-sm text-[#8aab98] mt-2">JPG, PNG, WebP – max 50 MB</p>
            </div>
            <input
              ref={fileInputRef} type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {[
              { title: "1. Remove Background", desc: "AI removes the background from any image – completely free." },
              { title: "2. Edit for Free", desc: "Crop, enhance, replace background, add watermarks & more." },
              { title: "3. Download HD", desc: "Download your result in full quality for just 1 credit." },
            ].map((f) => (
              <div key={f.title} className="bg-[#133027]/40 border border-[#2a4a3a]/40 rounded-xl p-6">
                <h3 className="font-semibold text-lg mb-1 text-[#f0e8d8]">{f.title}</h3>
                <p className="text-sm text-[#8aab98]">{f.desc}</p>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ──── PROCESSING ──── */}
      {isProcessing && (
        <main className="max-w-2xl mx-auto px-4 py-20">
          <div className="bg-[#133027]/80 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-8 text-center">
            <Loader2 className="w-10 h-10 text-[#4ecdc4] animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#f0e8d8] mb-2">AI is removing the background…</h2>
            <p className="text-sm text-[#8aab98] mb-4">First time downloads AI models (~40 MB). It will be faster next time.</p>
            <div className="w-full bg-[#1a3a2e] rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-[#4ecdc4] to-[#2d8f88] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-[#8aab98] mt-2 inline-block">{progress}%</span>
          </div>
        </main>
      )}

      {/* ──── EDITOR HOME ──── */}
      {workingImageUrl && !activeTool && (
        <main className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button onClick={downloadHD}
              className="flex items-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#4ecdc4]/20">
              <Download className="w-5 h-5" /> Download HD (1 Credit)
            </button>
            <button onClick={reset}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors">
              <Trash2 className="w-5 h-5" /> New image
            </button>
          </div>

          <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
              <span className="text-sm font-medium text-[#c4d4c8]">Preview (low resolution)</span>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[200px]">
              <img src={previewUrl || ""} alt="Preview" className="max-h-[500px] w-auto rounded-lg" />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-[#f0e8d8] mb-4">Continue editing – free</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EDIT_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className="group bg-[#133027]/50 backdrop-blur-md border border-[#2a4a3a]/50 rounded-xl p-5 text-left hover:border-[#4ecdc4]/40 hover:bg-[#133027]/80 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${tool.color} mb-3 group-hover:shadow-lg transition-shadow`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-semibold mb-1 text-[#f0e8d8] group-hover:text-[#4ecdc4] transition-colors">{tool.label}</h4>
                  <p className="text-xs text-[#8aab98]">{tool.desc}</p>
                </button>
              );
            })}
          </div>
        </main>
      )}

      {/* ──── ACTIVE EDIT TOOL ──── */}
      {workingImageUrl && activeTool === "bg-replace" && <BackgroundReplacer {...commonProps} />}
      {workingImageUrl && activeTool === "upscale" && <ImageUpscaler {...commonProps} />}
      {workingImageUrl && activeTool === "crop" && <ImageCropper {...commonProps} />}
      {workingImageUrl && activeTool === "compress" && <ImageCompressor {...commonProps} />}
      {workingImageUrl && activeTool === "watermark" && <WatermarkTool {...commonProps} />}
      {workingImageUrl && activeTool === "enhance" && <ImageEnhancer {...commonProps} />}
      {workingImageUrl && activeTool === "retouch" && <ObjectRemover {...commonProps} />}

      {showBuyModal && (
        <BuyCreditsModal
          onClose={() => setShowBuyModal(false)}
          onError={(msg) => { setError(msg); setShowBuyModal(false); }}
        />
      )}
    </div>
  );
}
