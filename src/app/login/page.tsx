"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("E-Mail oder Passwort falsch.");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1f1a] via-[#112a23] to-[#0a1c17] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="bR" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#f0e8d8]">Anmelden</h1>
          <p className="text-sm text-[#8aab98] mt-1">
            Melde dich an um Hintergründe zu entfernen
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
              className="w-full px-4 py-3 rounded-xl bg-[#0b1f1a]/80 border border-[#2a4a3a] text-[#f0e8d8] placeholder-[#5a7a6a] focus:outline-none focus:border-[#4ecdc4] transition-colors"
              placeholder="••••••••"
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
              <LogIn className="w-5 h-5" />
            )}
            Anmelden
          </button>

          <p className="text-center text-sm text-[#8aab98]">
            Noch kein Konto?{" "}
            <Link
              href="/register"
              className="text-[#4ecdc4] hover:underline font-medium"
            >
              Jetzt registrieren
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
