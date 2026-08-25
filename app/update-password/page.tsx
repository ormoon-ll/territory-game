"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [recoveryReady, setRecoveryReady] =
    useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event: string) => {
          if (
            event ===
            "PASSWORD_RECOVERY"
          ) {
            setRecoveryReady(true);
          }
        }
      );

    // Also check whether Supabase already
    // created a recovery session.
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (data.session) {
          setRecoveryReady(true);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(
    event: FormEvent
  ) {
    event.preventDefault();

    setMessage("");

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "Passwords do not match."
      );

      return;
    }

    if (password.length < 8) {
      setMessage(
        "Password must be at least 8 characters."
      );

      return;
    }

    setLoading(true);

    const {
      error,
    } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Password updated successfully."
    );

    setLoading(false);

    await supabase.auth.signOut();

    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-5xl mb-4">
            🔐
          </div>

          <h1 className="text-3xl font-bold text-white">
            Create New Password
          </h1>
        </div>

        {!recoveryReady ? (
          <div className="bg-slate-900 p-7 rounded-2xl text-center text-gray-300">
            Checking password reset link...
          </div>
        ) : (
          <form
            onSubmit={
              handleUpdatePassword
            }
            className="bg-slate-900 p-7 rounded-2xl space-y-5"
          >
            <div>
              <label className="block text-gray-300 mb-2">
                New Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                required
                minLength={8}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Confirm Password
              </label>

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                required
                minLength={8}
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
                ? "Updating..."
                : "Update Password"}
            </button>
          </form>
        )}

      </div>
    </main>
  );
}