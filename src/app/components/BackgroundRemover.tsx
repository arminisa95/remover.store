"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  Trash2,
  Loader2,
  ImageIcon,
  ArrowLeft,
  Scissors,
} from "lucide-react";

const ACCEPTED_FORMATS =
  "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

interface BackgroundRemoverProps {
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onBack: () => void;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export default function BackgroundRemover({
  credits, onUseCredit, onBack, onNeedCredits, isLoggedIn, onLoginRequired,
}: BackgroundRemoverProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refineAlpha = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 3; i < data.length; i += 4) {
        const a = data[i];
        if (a < 20) {
          data[i] = 0;
          data[i - 1] = 0;
          data[i - 2] = 0;
          data[i - 3] = 0;
        } else if (a < 240) {
          const t = Math.min(255, Math.round(((a - 20) / 220) * 255));
          const factor = t / a;
          data[i] = t;
          data[i - 3] = Math.round(data[i - 3] * factor);
          data[i - 2] = Math.round(data[i - 2] * factor);
          data[i - 1] = Math.round(data[i - 1] * factor);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    },
    []
  );

  const processFile = useCallback(
    async (file: File) => {
      if (!isLoggedIn) { onLoginRequired(); return; }
      if (credits < 1) { onNeedCredits(); return; }

      setError(null);
      setProcessedUrl(null);
      setProgress(0);

      if (file.size > 50 * 1024 * 1024) {
        setError("File too large. Maximum 50 MB.");
        return;
      }

      const name = file.name.replace(/\.[^.]+$/, "");
      setFileName(name);

      const previewUrl = URL.createObjectURL(file);
      setOriginalUrl(previewUrl);
      setIsProcessing(true);

      try {
        const ok = await onUseCredit();
        if (!ok) { setIsProcessing(false); return; }

        const { removeBackground } = await import(
          "@imgly/background-removal"
        );

        const result = await removeBackground(file, {
          model: "isnet",
          output: { format: "image/png", quality: 1 },
          progress: (key: string, current: number, total: number) => {
            if (total > 0) {
              setProgress(Math.round((current / total) * 100));
            }
          },
        });

        const bitmap = await createImageBitmap(result);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();

        refineAlpha(ctx, canvas.width, canvas.height);

        const finalBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) =>
              blob
                ? resolve(blob)
                : reject(new Error("Canvas export failed")),
            "image/png"
          );
        });

        const resultUrl = URL.createObjectURL(finalBlob);
        setProcessedUrl(resultUrl);
      } catch (err) {
        console.error("Background removal failed:", err);
        setError(
          "Error removing background. Please try again."
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [credits, isLoggedIn, onUseCredit, onNeedCredits, onLoginRequired, refineAlpha]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const downloadImage = useCallback(() => {
    if (!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${fileName || "image"}_no-bg.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [processedUrl, fileName]);

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setOriginalUrl(null);
    setProcessedUrl(null);
    setFileName("");
    setProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [originalUrl, processedUrl]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to all tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <Scissors className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Remove Background</h2>
          <p className="text-sm text-[#8aab98]">AI removes the background from any image – 1 Credit</p>
        </div>
      </div>

      {/* Upload Area */}
      {!originalUrl && !isProcessing && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed p-16
            flex flex-col items-center justify-center gap-5 transition-all duration-300
            ${
              isDragging
                ? "border-[#4ecdc4] bg-[#4ecdc4]/10 scale-[1.02]"
                : "border-[#2a4a3a] bg-[#133027]/50 hover:border-[#4ecdc4]/50 hover:bg-[#4ecdc4]/5"
            }
          `}
        >
          <div className="bg-[#4ecdc4]/15 p-4 rounded-2xl pointer-events-none">
            <Upload className="w-10 h-10 text-[#4ecdc4]" />
          </div>
          <div className="text-center pointer-events-none">
            <p className="text-lg font-semibold text-[#f0e8d8]">
              Drag & drop an image or click to upload
            </p>
            <p className="text-sm text-[#8aab98] mt-1">
              JPG, PNG, WebP, BMP, GIF, TIFF, AVIF – max 50 MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      )}

      {/* Image Preview & Controls */}
      {(originalUrl || isProcessing) && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {processedUrl && (
              <button
                onClick={downloadImage}
                className="flex items-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#4ecdc4]/20"
              >
                <Download className="w-5 h-5" />
                Download PNG
              </button>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              New image
            </button>
          </div>

          {isProcessing && (
            <div className="bg-[#133027]/80 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-[#4ecdc4] animate-spin" />
                <span className="font-medium text-[#f0e8d8]">
                  AI is removing the background…
                </span>
                <span className="text-sm text-[#8aab98] ml-auto">
                  {progress}%
                </span>
              </div>
              <div className="w-full bg-[#1a3a2e] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#4ecdc4] to-[#2d8f88] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-[#6b8f7e] mt-2">
                First time downloads AI models (~40 MB). It will be faster next time.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300">
              {error}
            </div>
          )}

          <div
            className={`grid gap-6 ${processedUrl ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"}`}
          >
            <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a4a3a]/60 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#8aab98]" />
                <span className="text-sm font-medium text-[#c4d4c8]">Original</span>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[200px]">
                <img src={originalUrl || ""} alt="Original" className="max-h-[500px] w-auto rounded-lg object-contain" />
              </div>
            </div>

            {processedUrl && (
              <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a4a3a]/60 flex items-center gap-2">
                  <img src="/logo.png" alt="" className="w-4 h-4 object-contain" />
                  <span className="text-sm font-medium text-[#c4d4c8]">No background</span>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[200px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMWEzYTJlIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMxYTNhMmUiLz48cmVjdCB4PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMTMzMDI3Ii8+PHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzEzMzAyNyIvPjwvc3ZnPg==')]">
                  <img src={processedUrl} alt="No background" className="max-h-[500px] w-auto rounded-lg object-contain" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
