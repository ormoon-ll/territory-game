"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(
    event: FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const redirectUrl =
      `${window.location.origin}/update-password`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: redirectUrl,
        }
      );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "If an account exists for this email, a password reset link has been sent."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-5xl mb-4">
            🔑
          </div>

          <h1 className="text-3xl font-bold text-white">
            Reset Password
          </h1>

          <p className="text-gray-400 mt-2">
            Enter your account email.
          </p>
        </div>

        <form
          onSubmit={handleReset}
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

          {message && (
            <p className="text-sm text-yellow-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-xl"
          >
            {loading
              ? "Sending..."
              : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Remember your password?{" "}
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