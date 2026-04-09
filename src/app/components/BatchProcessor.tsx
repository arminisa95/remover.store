"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, ArrowLeft, Layers, Loader2, X } from "lucide-react";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

interface BatchItem {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl: string | null;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

interface BatchProcessorProps {
  credits: number;
  onUseCredit: () => Promise<boolean>;
  onBack: () => void;
  onNeedCredits: () => void;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
}

export default function BatchProcessor({
  credits, onUseCredit, onBack, onNeedCredits, isLoggedIn, onLoginRequired,
}: BatchProcessorProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList) => {
    const newItems: BatchItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        originalUrl: URL.createObjectURL(f),
        processedUrl: null,
        status: "pending" as const,
      }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.originalUrl);
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const processAll = useCallback(async () => {
    if (!isLoggedIn) { onLoginRequired(); return; }

    const pending = items.filter((i) => i.status === "pending");
    if (pending.length === 0) return;
    if (credits < pending.length) { onNeedCredits(); return; }

    setIsProcessing(true);
    const { removeBackground } = await import("@imgly/background-removal");

    for (const item of pending) {
      const ok = await onUseCredit();
      if (!ok) break;

      setItems((prev) => prev.map((i) =>
        i.id === item.id ? { ...i, status: "processing" } : i
      ));

      try {
        const result = await removeBackground(item.file, {
          model: "isnet",
          output: { format: "image/png", quality: 1 },
        });
        const url = URL.createObjectURL(result);
        setItems((prev) => prev.map((i) =>
          i.id === item.id ? { ...i, status: "done", processedUrl: url } : i
        ));
      } catch {
        setItems((prev) => prev.map((i) =>
          i.id === item.id ? { ...i, status: "error", error: "Fehler" } : i
        ));
      }
    }
    setIsProcessing(false);
  }, [items, credits, isLoggedIn, onUseCredit, onNeedCredits, onLoginRequired]);

  const downloadAll = useCallback(() => {
    items.filter((i) => i.processedUrl).forEach((item, idx) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = item.processedUrl!;
        a.download = `${item.file.name.replace(/\.[^.]+$/, "")}_no-bg.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }, idx * 300);
    });
  }, [items]);

  const doneCount = items.filter((i) => i.status === "done").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-[#8aab98] hover:text-[#f0e8d8] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zu allen Tools
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#4ecdc4]/15 p-3 rounded-xl">
          <Layers className="w-6 h-6 text-[#4ecdc4]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#f0e8d8]">Batch-Verarbeitung</h2>
          <p className="text-sm text-[#8aab98]">Mehrere Bilder auf einmal – 1 Credit pro Bild</p>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-3 transition-all mb-6 ${
          isDragging ? "border-[#4ecdc4] bg-[#4ecdc4]/10" : "border-[#2a4a3a] bg-[#133027]/50 hover:border-[#4ecdc4]/50"
        }`}
      >
        <Upload className="w-8 h-8 text-[#4ecdc4]" />
        <p className="text-sm text-[#f0e8d8] pointer-events-none">
          Bilder hierher ziehen oder klicken (mehrere möglich)
        </p>
        <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>

      {/* Actions */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {pendingCount > 0 && (
            <button onClick={processAll} disabled={isProcessing}
              className="flex items-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#4ecdc4]/20 disabled:opacity-50">
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
              {isProcessing ? "Verarbeite…" : `${pendingCount} Bild${pendingCount !== 1 ? "er" : ""} verarbeiten (${pendingCount} Credit${pendingCount !== 1 ? "s" : ""})`}
            </button>
          )}
          {doneCount > 0 && (
            <button onClick={downloadAll}
              className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors">
              <Download className="w-5 h-5" /> Alle herunterladen ({doneCount})
            </button>
          )}
          <span className="text-sm text-[#8aab98]">{items.length} Bild{items.length !== 1 ? "er" : ""}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-[#133027]/60 border border-[#2a4a3a]/60 rounded-xl overflow-hidden relative group">
            <button onClick={() => removeItem(item.id)}
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-red-600 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="aspect-square flex items-center justify-center p-2 relative">
              <img src={item.processedUrl || item.originalUrl} alt=""
                className="max-w-full max-h-full object-contain rounded-lg" />
              {item.status === "processing" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-8 h-8 text-[#4ecdc4] animate-spin" />
                </div>
              )}
            </div>
            <div className="px-3 py-2 border-t border-[#2a4a3a]/40 flex items-center justify-between">
              <span className="text-xs text-[#8aab98] truncate max-w-[80%]">{item.file.name}</span>
              <span className={`text-xs font-medium ${
                item.status === "done" ? "text-green-400" :
                item.status === "error" ? "text-red-400" :
                item.status === "processing" ? "text-[#4ecdc4]" : "text-[#8aab98]"
              }`}>
                {item.status === "done" ? "✓" : item.status === "error" ? "✗" : item.status === "processing" ? "…" : "○"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
