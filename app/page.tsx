import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-10">
          <div className="text-7xl mb-5">🌍</div>

          <h1 className="text-5xl font-bold text-white mb-4">
            Territory
          </h1>

          <p className="text-gray-400 text-lg">
            Walk. Capture. Defend.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/signup"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            className="block w-full border border-gray-700 hover:border-gray-500 text-white font-semibold py-4 rounded-xl transition"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}