"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Download, Trash2, ArrowLeft, FileDown } from "lucide-react";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp";

interface ImageCompressorProps {
  onBack: () => void;
  inputImageUrl?: string;
  onResult?: (url: string) => void;
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function ImageCompressor({ onBack, inputImageUrl, onResult, credits, onUseCredit, onNeedCredits, isLoggedIn, onLoginRequired }: ImageCompressorProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [quality, setQuality] = useState(0.7);
  const [format, setFormat] = useState<"image/jpeg" | "image/webp">("image/jpeg");
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compress = useCallback(
    async (file: File, q: number, fmt: string) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((r, e) => { img.onload = r; img.onerror = e; });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);

      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), fmt, q);
      });

      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(URL.createObjectURL(blob));
      setCompressedSize(blob.size);
    },
    [processedUrl]
  );

  const processFile = useCallback(
    async (file: File) => {
      setOriginalSize(file.size);
      setFileName(file.name.replace(/\.[^.]+$/, ""));
      setOriginalUrl(URL.createObjectURL(file));
      await compress(file, quality, format);
    },
    [quality, format, compress]
  );

  const [currentFile, setCurrentFile] = useState<File | null>(null);

  useEffect(() => {
    if (inputImageUrl && !originalUrl) {
      fetch(inputImageUrl).then(r => r.blob()).then(blob => {
        const file = new File([blob], "image.png", { type: "image/png" });
        setCurrentFile(file);
        processFile(file);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputImageUrl]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCurrentFile(file); processFile(file); }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setCurrentFile(file); processFile(file); }
  }, [processFile]);

  const updateQuality = useCallback((q: number) => {
    setQuality(q);
    if (currentFile) compress(currentFile, q, format);
  }, [currentFile, format, compress]);

  const updateFormat = useCallback((fmt: "image/jpeg" | "image/webp") => {
    setFormat(fmt);
    if (currentFile) compress(currentFile, quality, fmt);
  }, [currentFile, quality, compress]);

  const downloadImage = useCallback(async () => {
    if (!processedUrl) return;
    if (!isLoggedIn) { onLoginRequired(); return; }
    if (credits < 1) { onNeedCredits(); return; }
    const ok = await onUseCredit();
    if (!ok) return;
    const ext = format === "image/webp" ? "webp" : "jpg";
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${fileName || "image"}_compressed.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [processedUrl, fileName, format, credits, isLoggedIn, onUseCredit, onNeedCredits, onLoginRequired]);

  const applyResult = useCallback(() => {
    if (!processedUrl || !onResult) return;
    onResult(processedUrl);
  }, [processedUrl, onResult]);

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setOriginalUrl(null); setProcessedUrl(null); setCurrentFile(null);
    setFileName(""); setOriginalSize(0); setCompressedSize(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [originalUrl, processedUrl]);

  const savings = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to all tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <FileDown className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Compress Image</h2>
          <p className="text-sm text-[#8aab98]">Reduce file size with quality slider – free</p>
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
          <p className="text-lg font-semibold text-[#f0e8d8] pointer-events-none">Upload image to compress</p>
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
              <button onClick={applyResult}
                className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors">
                Apply & Go Back
              </button>
            )}
            <button onClick={onBack}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-4 py-3 rounded-xl transition-colors">
              <Trash2 className="w-5 h-5" /> Back
            </button>
          </div>

          {/* Controls */}
          <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-5 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#8aab98]">Quality</span>
                <span className="text-[#f0e8d8] font-medium">{Math.round(quality * 100)}%</span>
              </div>
              <input type="range" min="0.1" max="1" step="0.05" value={quality}
                onChange={(e) => updateQuality(parseFloat(e.target.value))}
                className="w-full accent-[#4ecdc4]" />
            </div>

            <div className="flex gap-3">
              {(["image/jpeg", "image/webp"] as const).map((f) => (
                <button key={f} onClick={() => updateFormat(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    format === f ? "bg-[#4ecdc4] text-[#0b1f1a]" : "bg-[#1a3a2e] text-[#8aab98] hover:bg-[#1a4035]"
                  }`}>
                  {f === "image/jpeg" ? "JPEG" : "WebP"}
                </button>
              ))}
            </div>

            {originalSize > 0 && (
              <div className="grid grid-cols-3 gap-4 text-center pt-2">
                <div>
                  <div className="text-xs text-[#8aab98]">Original</div>
                  <div className="text-lg font-bold text-[#f0e8d8]">{formatSize(originalSize)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#8aab98]">Compressed</div>
                  <div className="text-lg font-bold text-[#4ecdc4]">{formatSize(compressedSize)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#8aab98]">Savings</div>
                  <div className={`text-lg font-bold ${savings > 0 ? "text-green-400" : "text-red-400"}`}>
                    {savings > 0 ? `-${savings}%` : `+${Math.abs(savings)}%`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a4a3a]/60">
              <span className="text-sm font-medium text-[#c4d4c8]">Preview</span>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[200px]">
              <img src={processedUrl || originalUrl} alt="Preview" className="max-h-[500px] w-auto rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
