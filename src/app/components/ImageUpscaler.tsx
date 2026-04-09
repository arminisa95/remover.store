"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Download, Trash2, Loader2, ArrowLeft, ZoomIn } from "lucide-react";
import PreviewOverlay from "./PreviewOverlay";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";
const SCALE_OPTIONS = [2, 3, 4];

interface ImageUpscalerProps {
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onBack: () => void;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  inputImageUrl?: string;
  onResult?: (url: string) => void;
}

export default function ImageUpscaler({
  credits, onUseCredit, onBack, onNeedCredits, isLoggedIn, onLoginRequired, inputImageUrl, onResult,
}: ImageUpscalerProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(2);
  const [originalSize, setOriginalSize] = useState({ w: 0, h: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputImageUrl && !originalUrl && !isProcessing) {
      fetch(inputImageUrl).then(r => r.blob()).then(blob => {
        const file = new File([blob], "image.png", { type: "image/png" });
        processFile(file);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputImageUrl]);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setProcessedUrl(null);
      setProgress(0);

      if (file.size > 50 * 1024 * 1024) {
        setError("File too large. Maximum 50 MB.");
        return;
      }

      setFileName(file.name.replace(/\.[^.]+$/, ""));
      const previewUrl = URL.createObjectURL(file);
      setOriginalUrl(previewUrl);
      setIsProcessing(true);

      try {
        setProgress(10);

        const img = new Image();
        img.src = previewUrl;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        setOriginalSize({ w: img.width, h: img.height });

        const newW = img.width * scale;
        const newH = img.height * scale;

        setProgress(30);

        // Multi-step upscaling for better quality
        const steps = scale <= 2 ? 1 : scale <= 3 ? 2 : 3;
        let currentCanvas = document.createElement("canvas");
        currentCanvas.width = img.width;
        currentCanvas.height = img.height;
        let ctx = currentCanvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const stepScale = Math.pow(scale, 1 / steps);
        for (let s = 0; s < steps; s++) {
          const stepW = Math.round(img.width * Math.pow(stepScale, s + 1));
          const stepH = Math.round(img.height * Math.pow(stepScale, s + 1));
          const nextCanvas = document.createElement("canvas");
          nextCanvas.width = stepW;
          nextCanvas.height = stepH;
          const nextCtx = nextCanvas.getContext("2d")!;
          nextCtx.imageSmoothingEnabled = true;
          nextCtx.imageSmoothingQuality = "high";
          nextCtx.drawImage(currentCanvas, 0, 0, stepW, stepH);
          currentCanvas = nextCanvas;
          ctx = nextCtx;
          setProgress(30 + Math.round(((s + 1) / steps) * 40));
        }

        // Apply unsharp mask for sharpening
        setProgress(75);
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = newW;
        finalCanvas.height = newH;
        const finalCtx = finalCanvas.getContext("2d")!;
        finalCtx.drawImage(currentCanvas, 0, 0, newW, newH);

        // Sharpen
        const imageData = finalCtx.getImageData(0, 0, newW, newH);
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        const strength = 0.4;

        for (let y = 1; y < newH - 1; y++) {
          for (let x = 1; x < newW - 1; x++) {
            const idx = (y * newW + x) * 4;
            for (let c = 0; c < 3; c++) {
              const center = copy[idx + c] * 5;
              const neighbors =
                copy[((y - 1) * newW + x) * 4 + c] +
                copy[((y + 1) * newW + x) * 4 + c] +
                copy[(y * newW + x - 1) * 4 + c] +
                copy[(y * newW + x + 1) * 4 + c];
              const sharpened = center - neighbors;
              data[idx + c] = Math.max(0, Math.min(255,
                copy[idx + c] + Math.round(sharpened * strength)
              ));
            }
          }
        }
        finalCtx.putImageData(imageData, 0, 0);

        setProgress(90);

        const blob = await new Promise<Blob>((resolve, reject) => {
          finalCanvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
            "image/png"
          );
        });

        setProcessedUrl(URL.createObjectURL(blob));
        setProgress(100);
      } catch (err) {
        console.error("Upscale failed:", err);
        setError("Error upscaling. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [scale]
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

  const downloadImage = useCallback(async () => {
    if (!processedUrl) return;
    if (!isLoggedIn) { onLoginRequired(); return; }
    if (credits < 1) { onNeedCredits(); return; }
    const ok = await onUseCredit();
    if (!ok) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${fileName || "image"}_${scale}x.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [processedUrl, fileName, scale, credits, isLoggedIn, onUseCredit, onNeedCredits, onLoginRequired]);

  const applyAndGoBack = useCallback(() => {
    if (!processedUrl || !onResult) return;
    onResult(processedUrl);
  }, [processedUrl, onResult]);

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
        <ArrowLeft className="w-4 h-4" /> Back to all tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <ZoomIn className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">AI Upscaling</h2>
          <p className="text-sm text-[#8aab98]">Enlarge images without quality loss</p>
        </div>
      </div>

      {/* Scale selector */}
      {!originalUrl && !isProcessing && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-[#8aab98]">Scale:</span>
          {SCALE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                scale === s
                  ? "bg-[#4ecdc4] text-[#0b1f1a]"
                  : "bg-[#133027]/80 text-[#8aab98] hover:bg-[#1a4035] border border-[#2a4a3a]"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      )}

      {/* Upload */}
      {!originalUrl && !isProcessing && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-16 flex flex-col items-center justify-center gap-5 transition-all duration-300 ${
            isDragging
              ? "border-[#4ecdc4] bg-[#4ecdc4]/10 scale-[1.02]"
              : "border-[#2a4a3a] bg-[#133027]/50 hover:border-[#4ecdc4]/50 hover:bg-[#4ecdc4]/5"
          }`}
        >
          <div className="bg-[#4ecdc4]/15 p-4 rounded-2xl pointer-events-none">
            <Upload className="w-10 h-10 text-[#4ecdc4]" />
          </div>
          <div className="text-center pointer-events-none">
            <p className="text-lg font-semibold text-[#f0e8d8]">Upload image to enlarge</p>
            <p className="text-sm text-[#8aab98] mt-1">JPG, PNG, WebP – max 50 MB</p>
          </div>
          <input
            ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      )}

      {/* Processing / Results */}
      {(originalUrl || isProcessing) && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {processedUrl && (
              <button onClick={downloadImage}
                className="flex items-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#4ecdc4]/20">
                <Download className="w-5 h-5" /> Download HD (1 Credit)
              </button>
            )}
            {onResult && processedUrl && (
              <button onClick={applyAndGoBack}
                className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors">
                Apply & Go Back
              </button>
            )}
            <button onClick={onBack}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-4 py-3 rounded-xl transition-colors">
              <Trash2 className="w-5 h-5" /> Back
            </button>
          </div>

          {isProcessing && (
            <div className="bg-[#133027]/80 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-[#4ecdc4] animate-spin" />
                <span className="font-medium text-[#f0e8d8]">Upscaling image {scale}x…</span>
                <span className="text-sm text-[#8aab98] ml-auto">{progress}%</span>
              </div>
              <div className="w-full bg-[#1a3a2e] rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-[#4ecdc4] to-[#2d8f88] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300">{error}</div>
          )}

          <div className={`grid gap-6 ${processedUrl ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"}`}>
            <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
                <span className="text-sm font-medium text-[#c4d4c8]">
                  Original {originalSize.w > 0 && `(${originalSize.w} × ${originalSize.h})`}
                </span>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[200px]">
                <PreviewOverlay>
                  <img src={originalUrl || ""} alt="Original" className="max-h-[500px] w-auto rounded-lg object-contain" />
                </PreviewOverlay>
              </div>
            </div>

            {processedUrl && (
              <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
                  <span className="text-sm font-medium text-[#c4d4c8]">
                    Upscaled ({originalSize.w * scale} × {originalSize.h * scale})
                  </span>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[200px]">
                  <PreviewOverlay>
                    <img src={processedUrl} alt="Upscaled" className="max-h-[500px] w-auto rounded-lg object-contain" />
                  </PreviewOverlay>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
