"use client";

import { useState } from "react";
import { X, CreditCard, Loader2 } from "lucide-react";

const CREDIT_PACKAGES = [
  { credits: 10, price: "2,99 €", label: "10 Credits", perCredit: "0,30 €/Credit" },
  { credits: 30, price: "6,99 €", label: "30 Credits", perCredit: "0,23 €/Credit", badge: "Beliebt" },
  { credits: 75, price: "14,99 €", label: "75 Credits", perCredit: "0,20 €/Credit", badge: "Spare 33%" },
  { credits: 200, price: "29,99 €", label: "200 Credits", perCredit: "0,15 €/Credit", badge: "Spare 50%" },
];

interface BuyCreditsModalProps {
  onClose: () => void;
  onError: (msg: string) => void;
}

export default function BuyCreditsModal({ onClose, onError }: BuyCreditsModalProps) {
  const [buyLoading, setBuyLoading] = useState<number | null>(null);

  const buyCredits = async (packageIndex: number) => {
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
        onError(data.error || "Zahlung konnte nicht gestartet werden.");
      }
    } catch {
      onError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setBuyLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#112a23] border border-[#2a4a3a] rounded-2xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8aab98] hover:text-[#f0e8d8] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#4ecdc4]/15 p-2 rounded-xl">
            <CreditCard className="w-6 h-6 text-[#4ecdc4]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#f0e8d8]">Credits kaufen</h2>
            <p className="text-xs text-[#8aab98]">1 Credit = 1 KI-Verarbeitung</p>
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
              <div className="text-lg font-bold text-[#f0e8d8]">{pkg.label}</div>
              <div className="text-sm text-[#4ecdc4] font-medium">{pkg.price}</div>
              <div className="text-xs text-[#8aab98] mt-1">{pkg.perCredit}</div>
              {buyLoading === i && (
                <Loader2 className="w-4 h-4 text-[#4ecdc4] animate-spin absolute bottom-3 right-3" />
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#6b8f7e] mt-4 text-center">
          Zahlung via Kreditkarte, Debitkarte, Google Pay, Apple Pay oder PayPal
        </p>
      </div>
    </div>
  );
}
