"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  };

  const handleOAuthLogin = async (provider: "google" | "facebook") => {
    setLoading(true);
    await signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen bg-white relative overflow-hidden">
      {/* LEFT PANEL - Hidden on mobile */}
      <div
        className="hidden md:flex w-1/2 items-center justify-center relative bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-600 overflow-visible z-20 shadow-[20px_0_80px_-10px_rgba(0,0,0,0.6)]"
      >
        {/* Outer glow shadow (gives elevation illusion) */}
        <div className="absolute inset-0 shadow-[30px_0_100px_rgba(0,0,0,0.3)] pointer-events-none"></div>

        {/* Soft right-side highlight (adds glassy rim) */}
        <div className="absolute inset-y-0 right-0 w-[6px] bg-white/70 blur-[3px] opacity-20 rounded-full"></div>

        {/* Glassy surface overlay */}
        <div className="absolute inset-0 rounded-r-[60px] bg-gradient-to-tr from-white/20 via-transparent to-white/10 opacity-40 pointer-events-none"></div> 

        {/* Floating Icons */}
        <div className="absolute inset-0 opacity-70 pointer-events-none z-0">
          <div className="absolute text-white text-[40px] sm:text-[50px] md:text-[60px] animate-float-slow top-10 left-8 md:left-16">📘</div>
          <div className="absolute text-white text-[45px] sm:text-[55px] md:text-[65px] animate-float-fast top-16 right-10 md:right-20">💡</div>
          <div className="absolute text-white text-[50px] sm:text-[60px] md:text-[70px] animate-float-mid top-1/3 left-6 md:left-12">🧠</div>
          <div className="absolute text-white text-[45px] sm:text-[55px] md:text-[65px] animate-float-slow top-1/2 right-8 md:right-16">📖</div>
          <div className="absolute text-white text-[40px] sm:text-[50px] md:text-[60px] animate-float-mid bottom-1/3 left-1/4 md:left-1/3">🎓</div>
          <div className="absolute text-white text-[55px] sm:text-[65px] md:text-[75px] animate-float-fast bottom-16 right-14 md:right-24">📐</div>
          <div className="absolute text-white text-[45px] sm:text-[55px] md:text-[65px] animate-float-slow bottom-10 left-1/6 md:left-1/5">✏️</div>
        </div>

        {/* Logo and text */}
        <div className="text-white text-center px-6 md:px-8 z-10 drop-shadow-lg">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">Welcome to GradeSeer</h1>
          <p className="text-base md:text-lg opacity-90 max-w-xs md:max-w-md mx-auto">
            AI-powered academic insights — know your grades before they arrive.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - Full width on mobile */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white relative z-10 py-8 md:py-0">
        <div className="z-10 bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-6 sm:p-8 md:p-10 w-full max-w-md mx-4">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/gslogo.png"
              alt="GradeSeer Logo"
              width={60}
              height={60}
              className="mb-2 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">GradeSeer</h1>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 text-center sm:text-left">
            Sign in to continue
          </h2>

          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mt-4" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-gray-300 p-3 w-full rounded-md pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-5 h-5"
                  >
                    {showPassword ? (
                      <>
                        <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M10.58 10.58a2 2 0 002.84 2.84"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M16.88 16.88A10.05 10.05 0 0112 18.5c-4.5 0-8.27-2.94-9.9-6.5a10.52 10.52 0 012.86-3.73"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.88 5.12A9.91 9.91 0 0112 5.5c4.5 0 8.27 2.94 9.9 6.5a10.52 10.52 0 01-2.66 3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    ) : (
                      <>
                        <path
                          d="M1.5 12c1.63-3.56 5.4-6.5 9.9-6.5s8.27 2.94 9.9 6.5c-1.63 3.56-5.4 6.5-9.9 6.5S3.13 15.56 1.5 12z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="11.4" cy="12" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-2 text-center sm:text-left">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-md hover:bg-indigo-700 transition disabled:opacity-70 text-sm sm:text-base"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="flex items-center justify-center my-6">
            <div className="border-t border-gray-300 flex-grow"></div>
            <span className="text-gray-400 px-3 text-xs sm:text-sm">or</span>
            <div className="border-t border-gray-300 flex-grow"></div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin("google")}
              disabled={loading}
              className="flex items-center justify-center w-full bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] text-white font-semibold py-3 rounded-md shadow-md hover:opacity-90 transition disabled:opacity-70 text-sm sm:text-base"
            >
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuthLogin("facebook")}
              disabled={loading}
              className="flex items-center justify-center w-full bg-gradient-to-r from-[#1877F2] to-[#4E69A2] text-white font-semibold py-3 rounded-md shadow-md hover:opacity-90 transition disabled:opacity-70 text-sm sm:text-base"
            >
              Continue with Facebook
            </button>
          </div>

          <p className="text-gray-500 text-xs sm:text-sm mt-6 text-center">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}