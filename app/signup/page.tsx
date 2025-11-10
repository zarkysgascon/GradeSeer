"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8 || password.length > 20) {
      setError("Password must be between 8 and 20 characters long");
      return;
    }

    if (!/\d/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, image: null }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      setSuccess("Account created successfully! Redirecting...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error("Signup error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white relative overflow-hidden">
      {/* LEFT PANEL */}
      <div
        className="hidden md:flex w-1/2 items-center justify-center relative bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-600 overflow-visible z-20 shadow-[20px_0_80px_-10px_rgba(0,0,0,0.6)]"
      >
        <div className="absolute inset-0 shadow-[30px_0_100px_rgba(0,0,0,0.3)] pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-[6px] bg-white/70 blur-[3px] opacity-20 rounded-full"></div>
        <div className="absolute inset-0 rounded-r-[60px] bg-gradient-to-tr from-white/20 via-transparent to-white/10 opacity-40 pointer-events-none"></div>

        <div className="absolute inset-0 opacity-70 pointer-events-none z-0">
          <div className="absolute text-white text-[60px] animate-float-slow top-10 left-16">📘</div>
          <div className="absolute text-white text-[65px] animate-float-fast top-16 right-20">💡</div>
          <div className="absolute text-white text-[70px] animate-float-mid top-1/3 left-12">🧠</div>
          <div className="absolute text-white text-[65px] animate-float-slow top-1/2 right-16">📖</div>
          <div className="absolute text-white text-[60px] animate-float-mid bottom-1/3 left-1/3">🎓</div>
          <div className="absolute text-white text-[75px] animate-float-fast bottom-16 right-24">📐</div>
          <div className="absolute text-white text-[65px] animate-float-slow bottom-10 left-1/5">✏️</div>
        </div>

        <div className="text-white text-center px-8 z-10 drop-shadow-lg">
          <h1 className="text-5xl font-bold mb-3">Join GradeSeer</h1>
          <p className="text-lg opacity-90 max-w-md mx-auto">
            Predict your academic success — powered by AI insights.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL (Signup Form) */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white relative z-10">
        <div className="z-10 bg-white rounded-2xl shadow-xl p-10 w-full max-w-md mx-4">
          <div className="flex flex-col items-center mb-6">
            <Image src="/gslogo.png" alt="GradeSeer Logo" width={80} height={80} className="mb-2" />
            <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm font-semibold">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-md hover:bg-indigo-700 transition disabled:opacity-70"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="text-gray-500 text-sm text-center mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
