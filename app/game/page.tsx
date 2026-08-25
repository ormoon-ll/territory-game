"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import GameMap from "@/components/GameMap";

export default function GamePage() {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white">
          Loading player...
        </p>
      </main>
    );
  }

  const username =
    user?.user_metadata?.username ||
    "Player";

  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col">

      {/* TOP BAR */}

      <header className="h-16 flex items-center justify-between px-5 bg-slate-950 border-b border-slate-800 z-20">

        <div>
          <h1 className="font-bold text-lg">
            🌍 Territory
          </h1>

          <p className="text-xs text-gray-400">
            {username}
          </p>
        </div>

        <button
          onClick={logout}
          className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg"
        >
          Logout
        </button>

      </header>

      {/* MAP */}

      <section className="flex-1 relative">
        <GameMap />
      </section>

      {/* BOTTOM NAVIGATION */}

      <nav className="h-16 bg-slate-950 border-t border-slate-800 flex items-center justify-around z-20">

        <button className="text-blue-400">
          <div className="text-xl">🗺️</div>
          <span className="text-xs">
            Map
          </span>
        </button>

        <button
  onClick={() =>
    router.push("/rank")
  }
  className="text-gray-400"
>
  <div className="text-xl">
    🏆
  </div>

  <span className="text-xs">
    Rank
  </span>
</button>

      <button
  onClick={() =>
    router.push("/profile")
  }
  className="text-gray-400"
>
  <div className="text-xl">
    👤
  </div>

  <span className="text-xs">
    Profile
  </span>
</button>

      </nav>

    </main>
  );
}