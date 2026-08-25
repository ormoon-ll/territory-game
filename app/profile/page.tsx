"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type ProfileData = {
  username: string;
  player_color: string;
  show_username: boolean;
};
export default function ProfilePage() {
  async function toggleUsernameVisibility() {
  if (!profile) {
    return;
  }

  const newValue =
    !profile.show_username;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } =
    await supabase
      .from("profiles")
      .update({
        show_username: newValue,
      })
      .eq("id", user.id);

  if (error) {
    console.error(
      "Unable to update privacy setting:",
      error
    );

    return;
  }

  setProfile({
    ...profile,
    show_username: newValue,
  });
}
  const router = useRouter();

  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  const [email, setEmail] =
    useState("");

  const [territoryCount, setTerritoryCount] =
    useState(0);

  const [totalArea, setTotalArea] =
    useState(0);

  const [rank, setRank] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
       .select(
       "username, player_color, show_username"
       )
        .eq("id", user.id)  
        .single();

      if (profileError) {
        console.error(
          profileError
        );
      } else {
        setProfile(profileData);
      }

      const {
        data: territories,
        error: territoryError,
      } = await supabase
        .from("territories")
        .select("area_m2")
        .eq("owner_id", user.id);

      if (territoryError) {
        console.error(
          territoryError
        );
      } else {
        setTerritoryCount(
          territories.length
        );

        const area =
          territories.reduce(
            (total: number, territory: { area_m2: any; }) =>
              total +
              Number(
                territory.area_m2
              ),
            0
          );

        setTotalArea(area);
      }

      const {
        data: allTerritories,
      } = await supabase
        .from("territories")
        .select(
          "owner_id, area_m2"
        );

      if (allTerritories) {
        const totals =
          new Map<
            string,
            number
          >();

        allTerritories.forEach(
          (territory: { owner_id: string; area_m2: any; }) => {
            totals.set(
              territory.owner_id,
              (totals.get(
                territory.owner_id
              ) || 0) +
                Number(
                  territory.area_m2
                )
            );
          }
        );

        const ranking = [
          ...totals.entries(),
        ].sort(
          (a, b) =>
            b[1] - a[1]
        );

        const position =
          ranking.findIndex(
            ([ownerId]) =>
              ownerId ===
              user.id
          );

        if (position !== -1) {
          setRank(
            position + 1
          );
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading profile...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between p-5 border-b border-slate-800">
        <h1 className="text-xl font-bold">
          👤 Profile
        </h1>

        <button
          onClick={logout}
          className="bg-red-600 px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </header>

      <section className="max-w-xl mx-auto p-6">

        <div className="bg-slate-900 rounded-2xl p-6 text-center">

          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white"
            style={{
              backgroundColor:
                profile?.player_color ||
                "#2563EB",
            }}
          />

          <h2 className="text-3xl font-bold">
            {profile?.username ||
              "Player"}
          </h2>

          <p className="text-gray-400 mt-1">
            {email}
          </p>

          {rank && (
            <p className="mt-3 text-yellow-400 font-bold">
              🏆 Rank #{rank}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">

          <div className="bg-slate-900 rounded-xl p-5 text-center">
            <p className="text-gray-400">
              Territories
            </p>

            <p className="text-3xl font-bold mt-2">
              {territoryCount}
            </p>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 text-center">
            <p className="text-gray-400">
              Total Area
            </p>

            <p className="text-3xl font-bold mt-2">
              {Math.round(
                totalArea
              )}
            </p>

            <p className="text-sm text-gray-400">
              m²
            </p>
          </div>

        </div>

        <button
          onClick={() =>
            router.push("/game")
          }
          className="w-full mt-6 bg-blue-600 py-3 rounded-xl font-semibold"
        >
        <div className="mt-6 bg-slate-900 rounded-2xl p-5">

  <h3 className="text-lg font-bold mb-4">
    ⚙️ Privacy Settings
  </h3>

  <div className="flex items-center justify-between">

    <div>
      <p className="font-semibold">
        Show username publicly
      </p>

      <p className="text-sm text-gray-400 mt-1">
        Allow other players to see your username.
      </p>
    </div>

    <button
      onClick={
        toggleUsernameVisibility
      }
      className={`relative w-14 h-8 rounded-full transition ${
        profile?.show_username
          ? "bg-blue-600"
          : "bg-slate-700"
      }`}
    >
      <div
        className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${
          profile?.show_username
            ? "left-7"
            : "left-1"
        }`}
      />
    </button>

  </div>

  <div className="mt-4 text-sm text-gray-400">

    {profile?.show_username ? (
      <p>
        👁 Other players can see:
        {" "}
        <span className="text-white font-semibold">
          {profile.username}
        </span>
      </p>
    ) : (
      <p>
        🔒 Other players will see:
        {" "}
        <span className="text-white font-semibold">
          Anonymous
        </span>
      </p>
    )}

  </div>

</div>
          Back to Map
        </button>

      </section>
    </main>
  );
}