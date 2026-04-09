"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, Trash2, Loader2, ArrowLeft, UserSquare } from "lucide-react";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

const PASSPORT_SIZES = [
  { label: "35×45 mm (EU/DE/AT)", w: 413, h: 531 },
  { label: "2×2 inch (US)", w: 600, h: 600 },
  { label: "35×45 mm (UK)", w: 413, h: 531 },
  { label: "33×48 mm (Visum)", w: 390, h: 567 },
];

const BG_OPTIONS = [
  { label: "Weiß", color: "#ffffff" },
  { label: "Hellgrau", color: "#e5e5e5" },
  { label: "Hellblau", color: "#d4e8f0" },
];

interface PassportPhotoProps {
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onBack: () => void;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export default function PassportPhoto({
  credits, onUseCredit, onBack, onNeedCredits, isLoggedIn, onLoginRequired,
}: PassportPhotoProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [bgIdx, setBgIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!isLoggedIn) { onLoginRequired(); return; }
      if (credits < 1) { onNeedCredits(); return; }

      setError(null); setProcessedUrl(null); setProgress(0);
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
            if (t > 0) setProgress(Math.round((c / t) * 80));
          },
        });

        setProgress(85);

        const fgImg = new Image();
        fgImg.src = URL.createObjectURL(result);
        await new Promise((r, e) => { fgImg.onload = r; fgImg.onerror = e; });

        const size = PASSPORT_SIZES[sizeIdx];
        const bg = BG_OPTIONS[bgIdx];
        const canvas = document.createElement("canvas");
        canvas.width = size.w;
        canvas.height = size.h;
        const ctx = canvas.getContext("2d")!;

        // Fill background
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, size.w, size.h);

        // Center-crop the subject to fill passport frame
        // Assume head is in upper-center portion
        const srcAspect = fgImg.width / fgImg.height;
        const dstAspect = size.w / size.h;

        let sx = 0, sy = 0, sw = fgImg.width, sh = fgImg.height;
        if (srcAspect > dstAspect) {
          sw = fgImg.height * dstAspect;
          sx = (fgImg.width - sw) / 2;
        } else {
          sh = fgImg.width / dstAspect;
          sy = 0; // Keep top (head) aligned
        }

        ctx.drawImage(fgImg, sx, sy, sw, sh, 0, 0, size.w, size.h);
        URL.revokeObjectURL(fgImg.src);

        setProgress(95);

        const blob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/png");
        });

        if (processedUrl) URL.revokeObjectURL(processedUrl);
        setProcessedUrl(URL.createObjectURL(blob));
        setProgress(100);
      } catch {
        setError("Fehler beim Verarbeiten. Bitte erneut versuchen.");
      } finally {
        setIsProcessing(false);
      }
    },
    [credits, sizeIdx, bgIdx, isLoggedIn, onUseCredit, onNeedCredits, onLoginRequired, processedUrl]
  );

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
    a.download = `${fileName || "passfoto"}_passport.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [processedUrl, fileName]);

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setOriginalUrl(null); setProcessedUrl(null);
    setFileName(""); setProgress(0); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [originalUrl, processedUrl]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zu allen Tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <UserSquare className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Passfoto Generator</h2>
          <p className="text-sm text-[#8aab98]">Biometrisches Passfoto mit weißem Hintergrund – 1 Credit</p>
        </div>
      </div>

      {/* Settings */}
      {!originalUrl && !isProcessing && (
        <div className="space-y-4 mb-6">
          <div>
            <span className="text-sm text-[#8aab98] block mb-2">Format:</span>
            <div className="flex flex-wrap gap-2">
              {PASSPORT_SIZES.map((s, i) => (
                <button key={s.label} onClick={() => setSizeIdx(i)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    sizeIdx === i ? "bg-[#4ecdc4] text-[#0b1f1a]" : "bg-[#1a3a2e] text-[#8aab98] hover:bg-[#1a4035]"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-[#8aab98] block mb-2">Hintergrund:</span>
            <div className="flex gap-2">
              {BG_OPTIONS.map((b, i) => (
                <button key={b.label} onClick={() => setBgIdx(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    bgIdx === i ? "bg-[#4ecdc4] text-[#0b1f1a]" : "bg-[#1a3a2e] text-[#8aab98] hover:bg-[#1a4035]"
                  }`}>
                  <div className="w-4 h-4 rounded border border-[#2a4a3a]" style={{ backgroundColor: b.color }} />
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload */}
      {!originalUrl && !isProcessing && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-16 flex flex-col items-center justify-center gap-5 transition-all ${
            isDragging ? "border-[#4ecdc4] bg-[#4ecdc4]/10" : "border-[#2a4a3a] bg-[#133027]/50 hover:border-[#4ecdc4]/50"
          }`}
        >
          <div className="bg-[#4ecdc4]/15 p-4 rounded-2xl pointer-events-none">
            <Upload className="w-10 h-10 text-[#4ecdc4]" />
          </div>
          <p className="text-lg font-semibold text-[#f0e8d8] pointer-events-none">Portrait-Foto hochladen</p>
          <p className="text-sm text-[#8aab98] pointer-events-none">Frontalaufnahme mit gleichmäßiger Beleuchtung</p>
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
                <Download className="w-5 h-5" /> Passfoto herunterladen
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
                <span className="font-medium text-[#f0e8d8]">Passfoto wird erstellt…</span>
                <span className="text-sm text-[#8aab98] ml-auto">{progress}%</span>
              </div>
              <div className="w-full bg-[#1a3a2e] rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-[#4ecdc4] to-[#2d8f88] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300">{error}</div>}

          <div className={`grid gap-6 ${processedUrl ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"}`}>
            <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
                <span className="text-sm font-medium text-[#c4d4c8]">Original</span>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[200px]">
                <img src={originalUrl || ""} alt="Original" className="max-h-[400px] w-auto rounded-lg object-contain" />
              </div>
            </div>

            {processedUrl && (
              <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
                  <span className="text-sm font-medium text-[#c4d4c8]">
                    Passfoto ({PASSPORT_SIZES[sizeIdx].label})
                  </span>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[200px]">
                  <img src={processedUrl} alt="Passfoto" className="max-h-[400px] w-auto rounded-lg object-contain shadow-lg" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
