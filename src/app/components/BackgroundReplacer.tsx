"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, Trash2, Loader2, ArrowLeft, Palette } from "lucide-react";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

const PRESET_COLORS = [
  "#ffffff", "#000000", "#f43f5e", "#3b82f6", "#22c55e", "#eab308",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

const PRESET_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

interface BackgroundReplacerProps {
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onBack: () => void;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export default function BackgroundReplacer({
  credits, onUseCredit, onBack, onNeedCredits, isLoggedIn, onLoginRequired,
}: BackgroundReplacerProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [noBgUrl, setNoBgUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bgType, setBgType] = useState<"color" | "gradient" | "image">("color");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgGradient, setBgGradient] = useState(PRESET_GRADIENTS[0]);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const applyBackground = useCallback(
    async (transparentUrl: string) => {
      const fgImg = new Image();
      fgImg.src = transparentUrl;
      await new Promise((r, e) => { fgImg.onload = r; fgImg.onerror = e; });

      const canvas = document.createElement("canvas");
      canvas.width = fgImg.width;
      canvas.height = fgImg.height;
      const ctx = canvas.getContext("2d")!;

      if (bgType === "color") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgType === "gradient") {
        const match = bgGradient.match(/linear-gradient\((\d+)deg,\s*(#\w+)\s+\d+%,\s*(#\w+)\s+\d+%\)/);
        if (match) {
          const angle = parseInt(match[1]) * Math.PI / 180;
          const x1 = canvas.width / 2 - Math.cos(angle) * canvas.width;
          const y1 = canvas.height / 2 - Math.sin(angle) * canvas.height;
          const x2 = canvas.width / 2 + Math.cos(angle) * canvas.width;
          const y2 = canvas.height / 2 + Math.sin(angle) * canvas.height;
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, match[2]);
          grad.addColorStop(1, match[3]);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = "#667eea";
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgType === "image" && bgImageUrl) {
        const bgImg = new Image();
        bgImg.src = bgImageUrl;
        await new Promise((r, e) => { bgImg.onload = r; bgImg.onerror = e; });
        const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const w = bgImg.width * scale;
        const h = bgImg.height * scale;
        ctx.drawImage(bgImg, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      }

      ctx.drawImage(fgImg, 0, 0);

      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/png");
      });
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(URL.createObjectURL(blob));
    },
    [bgType, bgColor, bgGradient, bgImageUrl, processedUrl]
  );

  const processFile = useCallback(
    async (file: File) => {
      if (!isLoggedIn) { onLoginRequired(); return; }
      if (credits < 1) { onNeedCredits(); return; }

      setError(null);
      setProcessedUrl(null);
      setNoBgUrl(null);
      setProgress(0);

      if (file.size > 50 * 1024 * 1024) { setError("Max. 50 MB."); return; }

      setFileName(file.name.replace(/\.[^.]+$/, ""));
      setOriginalUrl(URL.createObjectURL(file));
      setIsProcessing(true);

      try {
        const ok = await onUseCredit();
        if (!ok) { setIsProcessing(false); return; }

        const { removeBackground } = await import("@imgly/background-removal");
        const result = await removeBackground(file, {
          model: "isnet",
          output: { format: "image/png", quality: 1 },
          progress: (_k: string, c: number, t: number) => {
            if (t > 0) setProgress(Math.round((c / t) * 100));
          },
        });

        const transparentUrl = URL.createObjectURL(result);
        setNoBgUrl(transparentUrl);
        await applyBackground(transparentUrl);
      } catch {
        setError("Fehler beim Verarbeiten. Bitte erneut versuchen.");
      } finally {
        setIsProcessing(false);
      }
    },
    [credits, isLoggedIn, onUseCredit, onNeedCredits, onLoginRequired, applyBackground]
  );

  // Re-apply when background settings change
  const updateBg = useCallback(async () => {
    if (noBgUrl) await applyBackground(noBgUrl);
  }, [noBgUrl, applyBackground]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const downloadImage = useCallback(() => {
    if (!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${fileName || "image"}_new-bg.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [processedUrl, fileName]);

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    if (noBgUrl) URL.revokeObjectURL(noBgUrl);
    setOriginalUrl(null); setProcessedUrl(null); setNoBgUrl(null);
    setFileName(""); setProgress(0); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [originalUrl, processedUrl, noBgUrl]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zu allen Tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <Palette className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Hintergrund ersetzen</h2>
          <p className="text-sm text-[#8aab98]">Hintergrund entfernen & durch Farbe, Gradient oder Bild ersetzen – 1 Credit</p>
        </div>
      </div>

      {/* Upload */}
      {!originalUrl && !isProcessing && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-16 flex flex-col items-center justify-center gap-5 transition-all duration-300 ${
            isDragging ? "border-[#4ecdc4] bg-[#4ecdc4]/10" : "border-[#2a4a3a] bg-[#133027]/50 hover:border-[#4ecdc4]/50"
          }`}
        >
          <div className="bg-[#4ecdc4]/15 p-4 rounded-2xl pointer-events-none">
            <Upload className="w-10 h-10 text-[#4ecdc4]" />
          </div>
          <p className="text-lg font-semibold text-[#f0e8d8] pointer-events-none">Bild hochladen</p>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      )}

      {/* Results */}
      {(originalUrl || isProcessing) && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {processedUrl && (
              <button onClick={downloadImage}
                className="flex items-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#4ecdc4]/20">
                <Download className="w-5 h-5" /> PNG herunterladen
              </button>
            )}
            <button onClick={reset}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors">
              <Trash2 className="w-5 h-5" /> Neues Bild
            </button>
          </div>

          {isProcessing && (
            <div className="bg-[#133027]/80 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-[#4ecdc4] animate-spin" />
                <span className="font-medium text-[#f0e8d8]">Hintergrund wird entfernt…</span>
                <span className="text-sm text-[#8aab98] ml-auto">{progress}%</span>
              </div>
              <div className="w-full bg-[#1a3a2e] rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-[#4ecdc4] to-[#2d8f88] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300">{error}</div>}

          {/* Background picker */}
          {noBgUrl && !isProcessing && (
            <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-4">
              <div className="flex gap-3 mb-4">
                {(["color", "gradient", "image"] as const).map((t) => (
                  <button key={t} onClick={() => { setBgType(t); setTimeout(updateBg, 50); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      bgType === t ? "bg-[#4ecdc4] text-[#0b1f1a]" : "bg-[#1a3a2e] text-[#8aab98] hover:bg-[#1a4035]"
                    }`}>
                    {t === "color" ? "Farbe" : t === "gradient" ? "Gradient" : "Bild"}
                  </button>
                ))}
              </div>

              {bgType === "color" && (
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} onClick={() => { setBgColor(c); setTimeout(updateBg, 50); }}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${bgColor === c ? "border-[#4ecdc4] scale-110" : "border-[#2a4a3a]"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={bgColor}
                    onChange={(e) => { setBgColor(e.target.value); setTimeout(updateBg, 50); }}
                    className="w-10 h-10 rounded-lg cursor-pointer" />
                </div>
              )}

              {bgType === "gradient" && (
                <div className="flex flex-wrap gap-2">
                  {PRESET_GRADIENTS.map((g) => (
                    <button key={g} onClick={() => { setBgGradient(g); setTimeout(updateBg, 50); }}
                      className={`w-16 h-10 rounded-lg border-2 transition-all ${bgGradient === g ? "border-[#4ecdc4] scale-110" : "border-[#2a4a3a]"}`}
                      style={{ background: g }} />
                  ))}
                </div>
              )}

              {bgType === "image" && (
                <div>
                  <button onClick={() => bgFileInputRef.current?.click()}
                    className="bg-[#1a3a2e] hover:bg-[#1a4035] text-[#8aab98] px-4 py-2 rounded-lg text-sm border border-[#2a4a3a] transition-colors">
                    Hintergrundbild wählen
                  </button>
                  <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setBgImageUrl(URL.createObjectURL(f)); setTimeout(updateBg, 100); }
                    }} />
                </div>
              )}
            </div>
          )}

          {/* Images */}
          <div className={`grid gap-6 ${processedUrl ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"}`}>
            <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
                <span className="text-sm font-medium text-[#c4d4c8]">Original</span>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[200px]">
                <img src={originalUrl || ""} alt="Original" className="max-h-[500px] w-auto rounded-lg object-contain" />
              </div>
            </div>

            {processedUrl && (
              <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
                  <span className="text-sm font-medium text-[#c4d4c8]">Neuer Hintergrund</span>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[200px]">
                  <img src={processedUrl} alt="Result" className="max-h-[500px] w-auto rounded-lg object-contain" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
