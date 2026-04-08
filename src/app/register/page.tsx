"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrierung fehlgeschlagen.");
        setLoading(false);
        return;
      }

      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (loginRes?.error) {
        setError("Konto erstellt, aber Anmeldung fehlgeschlagen. Bitte manuell anmelden.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Ein Fehler ist aufgetreten.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1f1a] via-[#112a23] to-[#0a1c17] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="bR" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#f0e8d8]">Registrieren</h1>
          <p className="text-sm text-[#8aab98] mt-1">
            Erstelle ein Konto um loszulegen
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#133027]/60 backdrop-blur-md border border-[#2a4a3a]/60 rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#c4d4c8] mb-1.5">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0b1f1a]/80 border border-[#2a4a3a] text-[#f0e8d8] placeholder-[#5a7a6a] focus:outline-none focus:border-[#4ecdc4] transition-colors"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#c4d4c8] mb-1.5">
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#0b1f1a]/80 border border-[#2a4a3a] text-[#f0e8d8] placeholder-[#5a7a6a] focus:outline-none focus:border-[#4ecdc4] transition-colors"
              placeholder="name@beispiel.de"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#c4d4c8] mb-1.5">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-[#0b1f1a]/80 border border-[#2a4a3a] text-[#f0e8d8] placeholder-[#5a7a6a] focus:outline-none focus:border-[#4ecdc4] transition-colors"
              placeholder="Mindestens 6 Zeichen"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#4ecdc4] hover:bg-[#45b8b0] disabled:opacity-50 text-[#0b1f1a] font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            Konto erstellen
          </button>

          <p className="text-center text-sm text-[#8aab98]">
            Bereits ein Konto?{" "}
            <Link
              href="/login"
              className="text-[#4ecdc4] hover:underline font-medium"
            >
              Anmelden
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
