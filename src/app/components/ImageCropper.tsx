"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Download, Trash2, ArrowLeft, Crop } from "lucide-react";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

const PRESETS = [
  { label: "Frei", ratio: 0 },
  { label: "1:1 Instagram", ratio: 1 },
  { label: "4:5 IG Portrait", ratio: 4 / 5 },
  { label: "9:16 Story/Reel", ratio: 9 / 16 },
  { label: "16:9 YouTube", ratio: 16 / 9 },
  { label: "4:3 Facebook", ratio: 4 / 3 },
  { label: "2:3 Pinterest", ratio: 2 / 3 },
  { label: "1.91:1 LinkedIn", ratio: 1.91 },
];

interface ImageCropperProps {
  onBack: () => void;
}

export default function ImageCropper({ onBack }: ImageCropperProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [preset, setPreset] = useState(0);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [imgDims, setImgDims] = useState({ w: 0, h: 0, natW: 0, natH: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cx: 0, cy: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initCrop = useCallback((natW: number, natH: number, dispW: number, dispH: number, ratioIdx: number) => {
    const ratio = PRESETS[ratioIdx].ratio;
    let cw = dispW * 0.8;
    let ch = dispH * 0.8;
    if (ratio > 0) {
      if (cw / ch > ratio) { cw = ch * ratio; } else { ch = cw / ratio; }
    }
    setCropArea({ x: (dispW - cw) / 2, y: (dispH - ch) / 2, w: cw, h: ch });
    setImgDims({ w: dispW, h: dispH, natW: natW, natH: natH });
  }, []);

  const handleImgLoad = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    initCrop(img.naturalWidth, img.naturalHeight, rect.width, rect.height, preset);
  }, [preset, initCrop]);

  useEffect(() => {
    if (imgDims.w > 0) {
      initCrop(imgDims.natW, imgDims.natH, imgDims.w, imgDims.h, preset);
    }
  }, [preset, imgDims.w, imgDims.h, imgDims.natW, imgDims.natH, initCrop]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, cx: cropArea.x, cy: cropArea.y });
  }, [cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    let nx = dragStart.cx + dx;
    let ny = dragStart.cy + dy;
    nx = Math.max(0, Math.min(imgDims.w - cropArea.w, nx));
    ny = Math.max(0, Math.min(imgDims.h - cropArea.h, ny));
    setCropArea((p) => ({ ...p, x: nx, y: ny }));
  }, [dragging, dragStart, imgDims, cropArea.w, cropArea.h]);

  const handleMouseUp = useCallback(() => { setDragging(false); }, []);

  const processFile = useCallback((file: File) => {
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setOriginalUrl(URL.createObjectURL(file));
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const downloadCropped = useCallback(() => {
    if (!imgRef.current || !imgDims.w) return;
    const scaleX = imgDims.natW / imgDims.w;
    const scaleY = imgDims.natH / imgDims.h;
    const sx = cropArea.x * scaleX;
    const sy = cropArea.y * scaleY;
    const sw = cropArea.w * scaleX;
    const sh = cropArea.h * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileName || "image"}_cropped.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }, "image/png");
  }, [cropArea, imgDims, fileName]);

  const reset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(null); setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [originalUrl]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zu allen Tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <Crop className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Bild zuschneiden</h2>
          <p className="text-sm text-[#8aab98]">Zuschneiden mit Social-Media-Presets – kostenlos</p>
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
          <p className="text-lg font-semibold text-[#f0e8d8] pointer-events-none">Bild hochladen zum Zuschneiden</p>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      )}

      {originalUrl && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={downloadCropped}
              className="flex items-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#4ecdc4]/20">
              <Download className="w-5 h-5" /> Zugeschnitten herunterladen
            </button>
            <button onClick={reset}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors">
              <Trash2 className="w-5 h-5" /> Neues Bild
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => setPreset(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  preset === i ? "bg-[#4ecdc4] text-[#0b1f1a]" : "bg-[#1a3a2e] text-[#8aab98] hover:bg-[#1a4035]"
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Crop area */}
          <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden p-4">
            <div
              ref={containerRef}
              className="relative inline-block select-none"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imgRef}
                src={originalUrl}
                alt="Crop"
                className="max-h-[500px] w-auto rounded-lg"
                onLoad={handleImgLoad}
                draggable={false}
              />
              {/* Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Dark overlay outside crop */}
                <div className="absolute inset-0 bg-black/50" style={{
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${cropArea.x}px ${cropArea.y}px, ${cropArea.x}px ${cropArea.y + cropArea.h}px, ${cropArea.x + cropArea.w}px ${cropArea.y + cropArea.h}px, ${cropArea.x + cropArea.w}px ${cropArea.y}px, ${cropArea.x}px ${cropArea.y}px)`
                }} />
                {/* Crop border */}
                <div
                  className="absolute border-2 border-[#4ecdc4] cursor-move pointer-events-auto"
                  style={{ left: cropArea.x, top: cropArea.y, width: cropArea.w, height: cropArea.h }}
                  onMouseDown={handleMouseDown}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-[#4ecdc4]/30" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {cropArea.w > 0 && (
            <p className="text-xs text-[#8aab98]">
              Ausgabegröße: {Math.round(cropArea.w * imgDims.natW / imgDims.w)} × {Math.round(cropArea.h * imgDims.natH / imgDims.h)} px
            </p>
          )}
        </div>
      )}
    </div>
  );
}
