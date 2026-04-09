"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Download, Trash2, ArrowLeft, Sparkles, RotateCcw } from "lucide-react";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

interface ImageEnhancerProps {
  onBack: () => void;
  inputImageUrl?: string;
  onResult?: (url: string) => void;
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export default function ImageEnhancer({ onBack, inputImageUrl, onResult, credits, onUseCredit, onNeedCredits, isLoggedIn, onLoginRequired }: ImageEnhancerProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (inputImageUrl && !originalUrl) {
      fetch(inputImageUrl).then(r => r.blob()).then(blob => {
        const file = new File([blob], "image.png", { type: "image/png" });
        currentFileRef.current = file;
        setFileName("image");
        setOriginalUrl(inputImageUrl);
        applyFilters(file, brightness, contrast, saturation, sharpness);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputImageUrl]);

  const applyFilters = useCallback(
    async (file: File, br: number, co: number, sa: number, sh: number) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((r, e) => { img.onload = r; img.onerror = e; });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;

      ctx.filter = `brightness(${br}%) contrast(${co}%) saturate(${sa}%)`;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      URL.revokeObjectURL(img.src);

      // Sharpen if needed
      if (sh > 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        const strength = sh / 100;
        const w = canvas.width;

        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
              const center = copy[idx + c] * 5;
              const neighbors =
                copy[((y - 1) * w + x) * 4 + c] +
                copy[((y + 1) * w + x) * 4 + c] +
                copy[(y * w + x - 1) * 4 + c] +
                copy[(y * w + x + 1) * 4 + c];
              data[idx + c] = Math.max(0, Math.min(255,
                copy[idx + c] + Math.round((center - neighbors) * strength)
              ));
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/png");
      });

      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(URL.createObjectURL(blob));
    },
    [processedUrl]
  );

  const processFile = useCallback((file: File) => {
    currentFileRef.current = file;
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setOriginalUrl(URL.createObjectURL(file));
    applyFilters(file, brightness, contrast, saturation, sharpness);
  }, [brightness, contrast, saturation, sharpness, applyFilters]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const update = useCallback((br?: number, co?: number, sa?: number, sh?: number) => {
    if (!currentFileRef.current) return;
    applyFilters(currentFileRef.current, br ?? brightness, co ?? contrast, sa ?? saturation, sh ?? sharpness);
  }, [brightness, contrast, saturation, sharpness, applyFilters]);

  const autoEnhance = useCallback(() => {
    setBrightness(110);
    setContrast(115);
    setSaturation(120);
    setSharpness(30);
    if (currentFileRef.current) applyFilters(currentFileRef.current, 110, 115, 120, 30);
  }, [applyFilters]);

  const resetFilters = useCallback(() => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSharpness(0);
    if (currentFileRef.current) applyFilters(currentFileRef.current, 100, 100, 100, 0);
  }, [applyFilters]);

  const downloadImage = useCallback(async () => {
    if (!processedUrl) return;
    if (!isLoggedIn) { onLoginRequired(); return; }
    if (credits < 1) { onNeedCredits(); return; }
    const ok = await onUseCredit();
    if (!ok) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${fileName || "image"}_enhanced.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [processedUrl, fileName, credits, isLoggedIn, onUseCredit, onNeedCredits, onLoginRequired]);

  const applyAndGoBack = useCallback(() => {
    if (!processedUrl || !onResult) return;
    onResult(processedUrl);
  }, [processedUrl, onResult]);

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setOriginalUrl(null); setProcessedUrl(null); setFileName("");
    currentFileRef.current = null;
    setBrightness(100); setContrast(100); setSaturation(100); setSharpness(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [originalUrl, processedUrl]);

  const SLIDERS = [
    { label: "Brightness", value: brightness, set: setBrightness, min: 50, max: 200, key: "br" },
    { label: "Contrast", value: contrast, set: setContrast, min: 50, max: 200, key: "co" },
    { label: "Saturation", value: saturation, set: setSaturation, min: 0, max: 200, key: "sa" },
    { label: "Sharpness", value: sharpness, set: setSharpness, min: 0, max: 100, key: "sh" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to all tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <Sparkles className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Enhance Image</h2>
          <p className="text-sm text-[#8aab98]">Adjust brightness, contrast, saturation & sharpness – free</p>
        </div>
      </div>

      {!originalUrl && (
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
          <p className="text-lg font-semibold text-[#f0e8d8] pointer-events-none">Upload image to enhance</p>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      )}

      {originalUrl && (
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
            <button onClick={autoEnhance}
              className="flex items-center gap-2 bg-[#4ecdc4]/20 hover:bg-[#4ecdc4]/30 text-[#4ecdc4] font-semibold px-6 py-3 rounded-xl transition-colors">
              <Sparkles className="w-5 h-5" /> Auto-Enhance
            </button>
            <button onClick={resetFilters}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-4 py-3 rounded-xl transition-colors">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button onClick={onBack}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-4 py-3 rounded-xl transition-colors">
              <Trash2 className="w-4 h-4" /> Back
            </button>
          </div>

          {/* Sliders */}
          <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SLIDERS.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#8aab98]">{s.label}</span>
                  <span className="text-[#f0e8d8] font-medium">{s.value}{s.key !== "sh" ? "%" : ""}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step="1" value={s.value}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    s.set(v);
                    const vals = { br: brightness, co: contrast, sa: saturation, sh: sharpness, [s.key]: v };
                    update(vals.br, vals.co, vals.sa, vals.sh);
                  }}
                  className="w-full accent-[#4ecdc4]" />
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
                <span className="text-sm font-medium text-[#c4d4c8]">Original</span>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[200px]">
                <img src={originalUrl} alt="Original" className="max-h-[400px] w-auto rounded-lg object-contain" />
              </div>
            </div>
            {processedUrl && (
              <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
                  <span className="text-sm font-medium text-[#c4d4c8]">Enhanced</span>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[200px]">
                  <img src={processedUrl} alt="Enhanced" className="max-h-[400px] w-auto rounded-lg object-contain" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
