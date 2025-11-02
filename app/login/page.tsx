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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-indigo-700 via-indigo-600 to-indigo-400 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <Image
          src="/gslogo.png"
          alt="GradeSeer Logo"
          width={100}
          height={100}
          className="mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign in to GradeSeer</h1>
        <p className="text-gray-500 text-sm mb-6">
          Choose how you’d like to log in
        </p>

        {/* Email + Password Login */}
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

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-md hover:bg-indigo-700 transition"
          >
            {loading ? "Signing In..." : "Sign In with GradeSeer"}
          </button>
        </form>

        <div className="flex items-center justify-center my-6">
          <div className="border-t border-gray-300 flex-grow"></div>
          <span className="text-gray-400 px-3 text-sm">or</span>
          <div className="border-t border-gray-300 flex-grow"></div>
        </div>

        {/* Google & Facebook Login */}
        <div className="space-y-3">
          {/* Google Button */}
          <button
            onClick={() => handleOAuthLogin("google")}
            className="flex items-center justify-center w-full text-white font-semibold py-3 rounded-md shadow-md transition bg-gradient-to-r from-[#EA4335] via-[#FBBC05] to-[#34A853] hover:opacity-90"
          >
            <div className="flex items-center">
              <Image
                src="/google-icon.svg"
                alt="Google"
                width={20}
                height={20}
                className="mr-2 bg-white rounded-full p-1"
              />
              Continue with Google
            </div>
          </button>

          {/* Facebook Button */}
          <button
            onClick={() => handleOAuthLogin("facebook")}
            className="flex items-center justify-center w-full bg-[#1877F2] text-white font-semibold py-3 rounded-md shadow-md hover:bg-[#166FE5] transition"
          >
            <div className="flex items-center">
              <Image
                src="/facebook-icon.svg"
                alt="Facebook"
                width={20}
                height={20}
                className="mr-2"
              />
              Continue with Facebook
            </div>
          </button>
        </div>

        <p className="text-gray-500 text-sm mt-6">
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
  );
}
