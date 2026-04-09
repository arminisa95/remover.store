"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Coins, LogOut } from "lucide-react";

interface HeaderProps {
  credits: number;
  onBuyCredits: () => void;
}

export default function Header({ credits, onBuyCredits }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <header className="border-b border-[#2a4a3a]/60 backdrop-blur-md bg-[#0e241d]/80 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
        <img src="/logo.png" alt="bR Logo" className="w-10 h-10 object-contain" />
        <div className="mr-auto">
          <h1 className="text-xl font-bold tracking-tight text-[#f5efe0]">
            remover.store
          </h1>
          <p className="text-xs text-[#8aab98]">
            AI Image Tools – fast & in-browser
          </p>
        </div>

        {session?.user ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onBuyCredits}
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
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="bg-[#4ecdc4] hover:bg-[#45b8b0] text-[#0b1f1a] font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
