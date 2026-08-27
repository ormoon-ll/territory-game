"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          username: username,
        },

        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    console.log("Created user:", data.user);

    setMessage(
      "Account created. Check your email if email confirmation is enabled."
    );

    setLoading(false);

    if (data.session) {
      router.push("/game");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🌍</div>

          <h1 className="text-3xl font-bold text-white">
            Create Account
          </h1>

          <p className="text-gray-400 mt-2">
            Start capturing your city.
          </p>
        </div>

        <form
          onSubmit={handleSignup}
          className="bg-slate-900 p-7 rounded-2xl space-y-5"
        >
          <div>
            <label className="text-gray-300 block mb-2">
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
              minLength={3}
              placeholder="ShadowKing"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-gray-300 block mb-2">
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
            <label className="text-gray-300 block mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          {message && (
            <p className="text-sm text-yellow-300">
              {message}
            </p>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-xl"
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}