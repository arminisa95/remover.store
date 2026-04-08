"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Download,
  Trash2,
  Loader2,
  ImageIcon,
  LogOut,
  Coins,
  X,
  CreditCard,
} from "lucide-react";

const ACCEPTED_FORMATS =
  "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff,image/avif";

const CREDIT_PACKAGES = [
  { credits: 1, price: "0,25 €", label: "1 Credit" },
  { credits: 5, price: "1,00 €", label: "5 Credits", badge: "Spare 20%" },
  { credits: 20, price: "3,50 €", label: "20 Credits", badge: "Spare 30%" },
  { credits: 50, price: "7,50 €", label: "50 Credits", badge: "Spare 40%" },
];

export default function BackgroundRemover() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [credits, setCredits] = useState<number>(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyLoading, setBuyLoading] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((d) => setCredits(d.credits ?? 0))
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && session?.user) {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((d) => setCredits(d.credits ?? 0))
        .catch(() => {});
      window.history.replaceState({}, "", "/");
    }
  }, [session]);

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
      if (!session?.user) {
        router.push("/login");
        return;
      }

      if (credits < 1) {
        setPendingFile(file);
        setShowBuyModal(true);
        return;
      }

      setError(null);
      setProcessedUrl(null);
      setProgress(0);

      if (file.size > 50 * 1024 * 1024) {
        setError("Die Datei ist zu groß. Maximal 50 MB.");
        return;
      }

      const name = file.name.replace(/\.[^.]+$/, "");
      setFileName(name);

      const previewUrl = URL.createObjectURL(file);
      setOriginalUrl(previewUrl);
      setIsProcessing(true);

      try {
        const useRes = await fetch("/api/credits/use", { method: "POST" });
        const useData = await useRes.json();
        if (!useRes.ok) {
          setError(useData.error || "Credit konnte nicht abgezogen werden.");
          setIsProcessing(false);
          return;
        }
        setCredits(useData.credits);

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
          "Fehler beim Entfernen des Hintergrunds. Bitte versuche es erneut."
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [session, credits, router, refineAlpha]
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

  const buyCredits = useCallback(
    async (packageIndex: number) => {
      setBuyLoading(packageIndex);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageIndex }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error || "Zahlung konnte nicht gestartet werden.");
        }
      } catch {
        setError("Verbindungsfehler. Bitte versuche es erneut.");
      } finally {
        setBuyLoading(null);
      }
    },
    []
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0b1f1a] via-[#112a23] to-[#0a1c17] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4ecdc4] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1f1a] via-[#112a23] to-[#0a1c17] text-[#f0e8d8]">
      {/* Header */}
      <header className="border-b border-[#2a4a3a]/60 backdrop-blur-md bg-[#0e241d]/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="bR Logo"
            className="w-10 h-10 object-contain"
          />
          <div className="mr-auto">
            <h1 className="text-xl font-bold tracking-tight text-[#f5efe0]">
              backgroundRemover
            </h1>
            <p className="text-xs text-[#8aab98]">
              Hintergrund entfernen – 0,25 € pro Bild
            </p>
          </div>

          {session?.user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBuyModal(true)}
                className="flex items-center gap-1.5 bg-[#4ecdc4]/15 hover:bg-[#4ecdc4]/25 text-[#4ecdc4] px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Coins className="w-4 h-4" />
                {credits} Credit{credits !== 1 ? "s" : ""}
              </button>
              <div className="text-sm text-[#8aab98] hidden sm:block">
                {session.user.email}
              </div>
              <button
                onClick={() => signOut()}
                className="text-[#8aab98] hover:text-[#f0e8d8] transition-colors p-2"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Anmelden
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
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
                Bild hierher ziehen oder klicken
              </p>
              <p className="text-sm text-[#8aab98] mt-1">
                JPG, PNG, WebP, BMP, GIF, TIFF, AVIF – max. 50 MB
              </p>
              {!session?.user && (
                <p className="text-xs text-[#4ecdc4] mt-3">
                  Bitte melde dich an um loszulegen
                </p>
              )}
              {session?.user && credits < 1 && (
                <p className="text-xs text-[#4ecdc4] mt-3">
                  Du brauchst mindestens 1 Credit (0,25 €)
                </p>
              )}
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
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {processedUrl && (
                <button
                  onClick={downloadImage}
                  className="flex items-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-[#4ecdc4]/20"
                >
                  <Download className="w-5 h-5" />
                  PNG herunterladen
                </button>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-2 bg-[#f0e8d8]/10 hover:bg-[#f0e8d8]/20 text-[#f0e8d8] font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Neues Bild
              </button>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="bg-[#133027]/80 backdrop-blur-md border border-[#2a4a3a]/60 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 text-[#4ecdc4] animate-spin" />
                  <span className="font-medium text-[#f0e8d8]">
                    KI entfernt den Hintergrund…
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
                  Beim ersten Mal werden die KI-Modelle heruntergeladen (~40
                  MB). Danach geht es schneller.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300">
                {error}
              </div>
            )}

            {/* Images */}
            <div
              className={`grid gap-6 ${processedUrl ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"}`}
            >
              {/* Original */}
              <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a4a3a]/60 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#8aab98]" />
                  <span className="text-sm font-medium text-[#c4d4c8]">
                    Original
                  </span>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[200px]">
                  <img
                    src={originalUrl || ""}
                    alt="Original"
                    className="max-h-[500px] w-auto rounded-lg object-contain"
                  />
                </div>
              </div>

              {/* Processed */}
              {processedUrl && (
                <div className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2a4a3a]/60 flex items-center gap-2">
                    <img
                      src="/logo.png"
                      alt=""
                      className="w-4 h-4 object-contain"
                    />
                    <span className="text-sm font-medium text-[#c4d4c8]">
                      Ohne Hintergrund
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-center min-h-[200px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMWEzYTJlIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMxYTNhMmUiLz48cmVjdCB4PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMTMzMDI3Ii8+PHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzEzMzAyNyIvPjwvc3ZnPg==')]">
                    <img
                      src={processedUrl}
                      alt="Ohne Hintergrund"
                      className="max-h-[500px] w-auto rounded-lg object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        {!originalUrl && !isProcessing && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              {
                title: "100% im Browser",
                desc: "Deine Bilder verlassen nie deinen Computer. Alles läuft lokal.",
              },
              {
                title: "KI-gestützt",
                desc: "Modernste neuronale Netze für präzise Ergebnisse.",
              },
              {
                title: "Nur 0,25 € pro Bild",
                desc: "Günstige Credits – zahle nur was du brauchst. Kein Abo.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-[#133027]/50 backdrop-blur-md border border-[#2a4a3a]/50 rounded-xl p-6 hover:border-[#4ecdc4]/30 transition-colors"
              >
                <h3 className="font-semibold text-lg mb-1 text-[#f0e8d8]">
                  {f.title}
                </h3>
                <p className="text-sm text-[#8aab98]">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Buy Credits Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#112a23] border border-[#2a4a3a] rounded-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => {
                setShowBuyModal(false);
                setPendingFile(null);
              }}
              className="absolute top-4 right-4 text-[#8aab98] hover:text-[#f0e8d8] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#4ecdc4]/15 p-2 rounded-xl">
                <CreditCard className="w-6 h-6 text-[#4ecdc4]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#f0e8d8]">
                  Credits kaufen
                </h2>
                <p className="text-xs text-[#8aab98]">
                  1 Credit = 1 Hintergrund entfernen
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CREDIT_PACKAGES.map((pkg, i) => (
                <button
                  key={i}
                  onClick={() => buyCredits(i)}
                  disabled={buyLoading !== null}
                  className="relative bg-[#133027]/80 hover:bg-[#1a4035] border border-[#2a4a3a] hover:border-[#4ecdc4]/50 rounded-xl p-4 text-left transition-all disabled:opacity-50"
                >
                  {pkg.badge && (
                    <span className="absolute -top-2 -right-2 bg-[#4ecdc4] text-[#0b1f1a] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {pkg.badge}
                    </span>
                  )}
                  <div className="text-lg font-bold text-[#f0e8d8]">
                    {pkg.label}
                  </div>
                  <div className="text-sm text-[#4ecdc4] font-medium">
                    {pkg.price}
                  </div>
                  {buyLoading === i && (
                    <Loader2 className="w-4 h-4 text-[#4ecdc4] animate-spin absolute bottom-3 right-3" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-[#6b8f7e] mt-4 text-center">
              Zahlung via Kreditkarte, Debitkarte, Google Pay, Apple Pay oder
              PayPal
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
