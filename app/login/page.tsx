"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    console.log("Logged in user:", data.user);

    router.push("/game");

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">
            🌍
          </div>

          <h1 className="text-3xl font-bold text-white">
            Welcome Back
          </h1>

          <p className="text-gray-400 mt-2">
            Your territory is waiting.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-slate-900 p-7 rounded-2xl space-y-5"
        >
          <div>
            <label className="block text-gray-300 mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              placeholder="player@example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          {errorMessage && (
            <p className="text-red-400 text-sm">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-xl"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-blue-400 hover:underline"
          >
            Create Account
          </Link>
        </p>
      </div>
    </main>
  );
}