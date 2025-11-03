"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="flex h-screen bg-gradient-to-b from-indigo-700 via-indigo-600 to-indigo-400">
      {/* LEFT PANEL */}
      <div className="hidden md:flex w-1/2 items-center justify-center bg-gradient-to-b from-indigo-700 via-indigo-600 to-purple-600 rounded-r-[80px] shadow-2xl">
        <div className="text-white text-center px-8">
          <Image
            src="/gslogo.png"
            alt="GradeSeer Logo"
            width={140}
            height={140}
            className="mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold mb-2">Welcome to GradeSeer</h1>
          <p className="text-lg opacity-80">
            AI-powered academic insights — know your grades before they arrive.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex w-full md:w-1/2 items-center justify-center relative bg-white">
        {/* Decorative waves */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180">
          <svg
            className="relative block w-full h-16 text-indigo-400"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            viewBox="0 0 1200 120"
          >
            <path
              d="M0,0V46.29c47.52,22.13,98.74,29.49,146.9,8.37C230.81,22.27,284.46-11.64,339.39,1.4c43.64,10.28,78.94,47.45,120.58,65.9,36.2,16,73.89,19.35,111.56,8.81,36.2-10.17,70.12-35.38,107.52-41.83,53.24-9.26,104.89,21.86,158.13,37.43,42.29,12.45,86.79,9.38,128.87-5.75,59.3-20.8,113.09-62,172.45-85.35V0Z"
              opacity=".25"
              fill="currentColor"
            ></path>
            <path
              d="M0,0V15.81C47.42,31.46,98.74,47.09,146.9,35,230.81,12,284.46-12.05,339.39,1.67c43.64,10.69,78.94,47.56,120.58,66.63,36.2,16.66,73.89,19.79,111.56,9.38,36.2-9.85,70.12-34.21,107.52-39.79,53.24-8.55,104.89,20.19,158.13,35.27,42.29,11.74,86.79,8.85,128.87-6.68,59.3-21.6,113.09-64.13,172.45-88.46V0Z"
              opacity=".5"
              fill="currentColor"
            ></path>
            <path
              d="M0,0V5.63C47.42,21.6,98.74,39,146.9,29.05,230.81,10.22,284.46-12.1,339.39,1.88c43.64,10.85,78.94,47.9,120.58,67.17,36.2,17,73.89,20.13,111.56,9.53,36.2-9.82,70.12-34.11,107.52-39.69,53.24-8.51,104.89,20.13,158.13,35.2,42.29,11.71,86.79,8.82,128.87-6.67,59.3-21.57,113.09-64.03,172.45-88.37V0Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>

        {/* LOGIN FORM */}
        <div className="z-10 bg-white rounded-2xl shadow-xl p-10 w-full max-w-md mx-4">
          <Image
            src="/gslogo.png"
            alt="GradeSeer Logo"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Sign in to GradeSeer
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Access your dashboard and insights
          </p>

          <form onSubmit={handleCredentialsLogin} className="space-y-4">
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

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-md hover:bg-indigo-700 transition"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="flex items-center justify-center my-6">
            <div className="border-t border-gray-300 flex-grow"></div>
            <span className="text-gray-400 px-3 text-sm">or</span>
            <div className="border-t border-gray-300 flex-grow"></div>
          </div>

          {/* ✅ Gradient OAuth Buttons with Built-in SVG Logos */}
          <div className="space-y-3">
            {/* Google Button */}
            <button
              onClick={() => handleOAuthLogin("google")}
              className="flex items-center justify-center w-full bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] text-white font-semibold py-3 rounded-md shadow-md hover:opacity-90 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-5 h-5 mr-2 bg-white rounded-full p-[2px]"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.64 1.22 9.1 3.6l6.8-6.8C35.52 2.5 30.15 0 24 0 14.64 0 6.54 5.64 2.64 13.68l7.9 6.14C12.46 13.26 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#34A853"
                  d="M46.48 24.55c0-1.57-.14-3.08-.4-4.55H24v9.09h12.7c-.55 2.96-2.2 5.47-4.7 7.18l7.2 5.6C43.62 37.35 46.48 31.43 46.48 24.55z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.54 28.32a14.5 14.5 0 0 1-.76-4.32c0-1.5.27-2.95.76-4.32l-7.9-6.14A23.9 23.9 0 0 0 0 24c0 3.84.9 7.48 2.64 10.46l7.9-6.14z"
                />
                <path
                  fill="#4285F4"
                  d="M24 48c6.48 0 11.92-2.13 15.9-5.82l-7.2-5.6c-2.02 1.35-4.6 2.15-8.7 2.15-6.26 0-11.54-3.76-13.46-9.04l-7.9 6.14C6.54 42.36 14.64 48 24 48z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Facebook Button */}
            <button
              onClick={() => handleOAuthLogin("facebook")}
              className="flex items-center justify-center w-full bg-gradient-to-r from-[#1877F2] to-[#4E69A2] text-white font-semibold py-3 rounded-md shadow-md hover:opacity-90 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-5 h-5 mr-2"
              >
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.464.099 2.797.143v3.244l-1.92.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0z" />
              </svg>
              Continue with Facebook
            </button>
          </div>

          <p className="text-gray-500 text-sm mt-6 text-center">
            Don’t have an account?{" "}
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
