"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Download, Trash2, ArrowLeft, Stamp } from "lucide-react";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

interface WatermarkToolProps {
  onBack: () => void;
  inputImageUrl?: string;
  onResult?: (url: string) => void;
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export default function WatermarkTool({ onBack, inputImageUrl, onResult, credits, onUseCredit, onNeedCredits, isLoggedIn, onLoginRequired }: WatermarkToolProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [watermarkText, setWatermarkText] = useState("© remover.store");
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(5);
  const [position, setPosition] = useState<"center" | "bottom-right" | "tiled">("center");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (inputImageUrl && !originalUrl) {
      fetch(inputImageUrl).then(r => r.blob()).then(blob => {
        const file = new File([blob], "image.png", { type: "image/png" });
        currentFileRef.current = file;
        setFileName("image");
        setOriginalUrl(inputImageUrl);
        applyWatermark(file, watermarkText, opacity, fontSize, position);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputImageUrl]);

  const applyWatermark = useCallback(
    async (file: File, text: string, op: number, size: number, pos: string) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((r, e) => { img.onload = r; img.onerror = e; });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);

      const fs = Math.round(img.width * (size / 100));
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${op * 0.5})`;
      ctx.lineWidth = Math.max(1, fs / 20);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (pos === "tiled") {
        ctx.save();
        ctx.rotate(-Math.PI / 6);
        const stepX = fs * 6;
        const stepY = fs * 3;
        for (let y = -img.height; y < img.height * 2; y += stepY) {
          for (let x = -img.width; x < img.width * 2; x += stepX) {
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
          }
        }
        ctx.restore();
      } else if (pos === "bottom-right") {
        const x = img.width - ctx.measureText(text).width / 2 - fs;
        const y = img.height - fs;
        ctx.textAlign = "center";
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      } else {
        ctx.strokeText(text, img.width / 2, img.height / 2);
        ctx.fillText(text, img.width / 2, img.height / 2);
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
    applyWatermark(file, watermarkText, opacity, fontSize, position);
  }, [watermarkText, opacity, fontSize, position, applyWatermark]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const update = useCallback((text?: string, op?: number, size?: number, pos?: string) => {
    if (!currentFileRef.current) return;
    applyWatermark(
      currentFileRef.current,
      text ?? watermarkText,
      op ?? opacity,
      size ?? fontSize,
      pos ?? position
    );
  }, [watermarkText, opacity, fontSize, position, applyWatermark]);

  const downloadImage = useCallback(async () => {
    if (!processedUrl) return;
    if (!isLoggedIn) { onLoginRequired(); return; }
    if (credits < 1) { onNeedCredits(); return; }
    const ok = await onUseCredit();
    if (!ok) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${fileName || "image"}_watermarked.png`;
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [originalUrl, processedUrl]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to all tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <Stamp className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Watermark</h2>
          <p className="text-sm text-[#8aab98]">Add text watermarks to your images – free</p>
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
            <button onClick={onBack}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-4 py-3 rounded-xl transition-colors">
              <Trash2 className="w-5 h-5" /> Back
            </button>
          </div>

          {/* Controls */}
          <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-sm text-[#8aab98] block mb-1">Text</label>
              <input type="text" value={watermarkText}
                onChange={(e) => { setWatermarkText(e.target.value); update(e.target.value); }}
                className="w-full bg-[#1a3a2e] border border-[#2a4a3a] rounded-lg px-3 py-2 text-[#f0e8d8] text-sm focus:border-[#4ecdc4] outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#8aab98]">Opacity</span>
                  <span className="text-[#f0e8d8]">{Math.round(opacity * 100)}%</span>
                </div>
                <input type="range" min="0.05" max="1" step="0.05" value={opacity}
                  onChange={(e) => { const v = parseFloat(e.target.value); setOpacity(v); update(undefined, v); }}
                  className="w-full accent-[#4ecdc4]" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#8aab98]">Size</span>
                  <span className="text-[#f0e8d8]">{fontSize}%</span>
                </div>
                <input type="range" min="1" max="15" step="1" value={fontSize}
                  onChange={(e) => { const v = parseInt(e.target.value); setFontSize(v); update(undefined, undefined, v); }}
                  className="w-full accent-[#4ecdc4]" />
              </div>
            </div>

            <div>
              <span className="text-sm text-[#8aab98] block mb-2">Position</span>
              <div className="flex gap-2">
                {([["center", "Center"], ["bottom-right", "Bottom right"], ["tiled", "Tiled"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => { setPosition(val); update(undefined, undefined, undefined, val); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      position === val ? "bg-[#4ecdc4] text-[#0b1f1a]" : "bg-[#1a3a2e] text-[#8aab98] hover:bg-[#1a4035]"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
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
