"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, Trash2, ArrowLeft, Eraser, Loader2, Undo2 } from "lucide-react";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

interface ObjectRemoverProps {
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onBack: () => void;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export default function ObjectRemover({
  credits, onUseCredit, onBack, onNeedCredits, isLoggedIn, onLoginRequired,
}: ObjectRemoverProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [isPainting, setIsPainting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const setupCanvases = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    // Scale down for display (max 800px wide)
    const maxW = 800;
    const scale = img.width > maxW ? maxW / img.width : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    canvas.width = w;
    canvas.height = h;
    maskCanvas.width = w;
    maskCanvas.height = h;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);

    const maskCtx = maskCanvas.getContext("2d")!;
    maskCtx.clearRect(0, 0, w, h);

  }, []);

  const processFile = useCallback((file: File) => {
    setError(null);
    setProcessedUrl(null);
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setupCanvases(img);
    };
    img.src = url;
  }, [setupCanvases]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const paint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const maskCanvas = maskCanvasRef.current;
    const canvas = canvasRef.current;
    if (!maskCanvas || !canvas || !isPainting) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Draw on mask
    const maskCtx = maskCanvas.getContext("2d")!;
    maskCtx.fillStyle = "rgba(255, 0, 0, 0.4)";
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();

    // Show mask overlay on main canvas
    const ctx = canvas.getContext("2d")!;
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(maskCanvas, 0, 0);
  }, [isPainting, brushSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPainting(true);
    paint(e);
  }, [paint]);

  const handleMouseUp = useCallback(() => { setIsPainting(false); }, []);

  const undo = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    const canvas = canvasRef.current;
    if (!maskCanvas || !canvas || !imgRef.current) return;

    const maskCtx = maskCanvas.getContext("2d")!;
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
  }, []);

  const inpaint = useCallback(async () => {
    if (!isLoggedIn) { onLoginRequired(); return; }
    if (credits < 1) { onNeedCredits(); return; }

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !imgRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      const ok = await onUseCredit();
      if (!ok) { setIsProcessing(false); return; }

      const ctx = canvas.getContext("2d")!;
      const maskCtx = maskCanvas.getContext("2d")!;
      const w = canvas.width;
      const h = canvas.height;

      // Get original image data
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.drawImage(imgRef.current, 0, 0, w, h);
      const imgData = tempCtx.getImageData(0, 0, w, h);
      const pixels = imgData.data;

      // Get mask data
      const maskData = maskCtx.getImageData(0, 0, w, h);
      const mask = maskData.data;

      // Simple content-aware fill: replace masked pixels with average of nearest unmasked neighbors
      const isMasked = (x: number, y: number) => mask[(y * w + x) * 4 + 3] > 50;
      const radius = Math.max(brushSize, 20);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!isMasked(x, y)) continue;

          let r = 0, g = 0, b = 0, count = 0;
          for (let dy = -radius; dy <= radius; dy += 2) {
            for (let dx = -radius; dx <= radius; dx += 2) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
              if (isMasked(nx, ny)) continue;
              const idx = (ny * w + nx) * 4;
              r += pixels[idx];
              g += pixels[idx + 1];
              b += pixels[idx + 2];
              count++;
            }
          }

          const idx = (y * w + x) * 4;
          if (count > 0) {
            pixels[idx] = Math.round(r / count);
            pixels[idx + 1] = Math.round(g / count);
            pixels[idx + 2] = Math.round(b / count);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Blur the filled areas for smoother result
      const resultData = ctx.getImageData(0, 0, w, h);
      const rPixels = resultData.data;
      const copy = new Uint8ClampedArray(rPixels);

      for (let pass = 0; pass < 3; pass++) {
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            if (!isMasked(x, y)) continue;
            const idx = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
              rPixels[idx + c] = Math.round(
                (copy[((y - 1) * w + x) * 4 + c] +
                 copy[((y + 1) * w + x) * 4 + c] +
                 copy[(y * w + x - 1) * 4 + c] +
                 copy[(y * w + x + 1) * 4 + c] +
                 copy[idx + c] * 2) / 6
              );
            }
            copy[idx] = rPixels[idx];
            copy[idx + 1] = rPixels[idx + 1];
            copy[idx + 2] = rPixels[idx + 2];
          }
        }
      }
      ctx.putImageData(resultData, 0, 0);

      // Clear mask
      maskCtx.clearRect(0, 0, w, h);

      // Update imgRef for next operation
      const newImg = new Image();
      newImg.src = canvas.toDataURL("image/png");
      await new Promise((r) => { newImg.onload = r; });
      imgRef.current = newImg;

      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/png");
      });
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(URL.createObjectURL(blob));
    } catch {
      setError("Error removing objects. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [credits, isLoggedIn, brushSize, onUseCredit, onNeedCredits, onLoginRequired, processedUrl]);

  const downloadImage = useCallback(() => {
    if (!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${fileName || "image"}_clean.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [processedUrl, fileName]);

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setOriginalUrl(null); setProcessedUrl(null); setFileName("");
    setError(null); imgRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [originalUrl, processedUrl]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to all tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <Eraser className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Retoucher</h2>
          <p className="text-sm text-[#8aab98]">Paint over and remove unwanted objects – 1 Credit</p>
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
          <p className="text-lg font-semibold text-[#f0e8d8] pointer-events-none">Upload image</p>
          <p className="text-sm text-[#8aab98] pointer-events-none">Paint over the objects you want to remove</p>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      )}

      {originalUrl && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={inpaint} disabled={isProcessing}
              className="flex items-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#4ecdc4]/20 disabled:opacity-50">
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eraser className="w-5 h-5" />}
              {isProcessing ? "Processing…" : "Remove marked objects"}
            </button>
            {processedUrl && (
              <button onClick={downloadImage}
                className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors">
                <Download className="w-5 h-5" /> Download
              </button>
            )}
            <button onClick={undo}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-4 py-3 rounded-xl transition-colors">
              <Undo2 className="w-4 h-4" /> Clear mask
            </button>
            <button onClick={reset}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-4 py-3 rounded-xl transition-colors">
              <Trash2 className="w-4 h-4" /> New image
            </button>
          </div>

          {/* Brush size */}
          <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#8aab98]">Brush size</span>
              <input type="range" min="5" max="100" value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="flex-1 accent-[#4ecdc4]" />
              <span className="text-sm text-[#f0e8d8] w-10 text-right">{brushSize}px</span>
            </div>
          </div>

          {error && <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300">{error}</div>}

          {/* Canvas */}
          <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden p-4">
            <p className="text-xs text-[#8aab98] mb-3">Paint over the objects you want to remove (highlighted in red)</p>
            <div className="flex justify-center relative">
              <canvas
                ref={canvasRef}
                className="max-w-full rounded-lg cursor-crosshair"
                style={{ maxHeight: 500 }}
                onMouseDown={handleMouseDown}
                onMouseMove={paint}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <canvas ref={maskCanvasRef} className="hidden" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
