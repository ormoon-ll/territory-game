"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type LeaderboardPlayer = {
  id: string;
  username: string;
  player_color: string;
  show_username: boolean;
  totalArea: number;
  territories: number;
};
export default function RankPage() {
  const router =
    useRouter();

  const [
    leaderboard,
    setLeaderboard,
  ] =
    useState<
      LeaderboardPlayer[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.push(
          "/login"
        );

        return;
      }

      const {
        data: profiles,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
  "id, username, player_color, show_username"
)
      if (profileError) {
        console.error(
          profileError
        );

        setLoading(false);
        return;
      }

      const {
        data: territories,
        error: territoryError,
      } =
        await supabase
          .from("territories")
          .select(
            "owner_id, area_m2"
          );

      if (territoryError) {
        console.error(
          territoryError
        );

        setLoading(false);
        return;
      }

      const players =
        profiles.map(
          (profile) => {
            const owned =
              territories.filter(
                (territory) =>
                  territory.owner_id ===
                  profile.id
              );

            const totalArea =
              owned.reduce(
                (
                  total,
                  territory
                ) =>
                  total +
                  Number(
                    territory.area_m2
                  ),
                0
              );

            return {
  id:
    profile.id,

  username:
    profile.username,

  player_color:
    profile.player_color,

  show_username:
    profile.show_username,

  totalArea,

  territories:
    owned.length,
};
          }
        );

      players.sort(
        (a, b) =>
          b.totalArea -
          a.totalArea
      );

      setLeaderboard(
        players
      );

      setLoading(false);
    }

    loadLeaderboard();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading ranking...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <header className="p-5 border-b border-slate-800 flex justify-between items-center">

        <h1 className="text-xl font-bold">
          🏆 Leaderboard
        </h1>

        <button
          onClick={() =>
            router.push(
              "/game"
            )
          }
          className="text-blue-400"
        >
          Map
        </button>

      </header>

      <section className="max-w-xl mx-auto p-5 space-y-3">

        {leaderboard.map(
          (
            player,
            index
          ) => (
            <div
              key={
                player.id
              }
              className="bg-slate-900 rounded-xl p-4 flex items-center gap-4"
            >

              <div className="text-2xl font-bold w-10">
                {index === 0
                  ? "🥇"
                  : index ===
                    1
                  ? "🥈"
                  : index ===
                    2
                  ? "🥉"
                  : `#${index + 1}`}
              </div>

              <div
                className="w-10 h-10 rounded-full border-2 border-white"
                style={{
                  backgroundColor:
                    player.player_color,
                }}
              />

              <div className="flex-1">

                <p className="font-bold">
                {player.show_username
                ? player.username
                : "Anonymous"}
                </p>

                <p className="text-sm text-gray-400">
                  {
                    player.territories
                  }{" "}
                  territories
                </p>

              </div>

              <div className="text-right">
                <p className="font-bold">
                  {Math.round(
                    player.totalArea
                  ).toLocaleString()}
                </p>

                <p className="text-xs text-gray-400">
                  m²
                </p>
              </div>

            </div>
          )
        )}

      </section>
    </main>
  );
}