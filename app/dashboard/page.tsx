"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Interfaces
interface Subject { id: number; name: string; scores?: Score[]; }
interface Score { id: number; score_name: string; score: number; max_score: number; }
interface HistoryItem { id: number; subject_name: string; final_grade: number; }

// Extend NextAuth user type locally
interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Cast session.user to ExtendedUser safely
  const user = session?.user as ExtendedUser | undefined;
  const userId = user?.id;

  if (status === "loading")
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  if (!session) return null; // while redirecting

  // Placeholder data
  const subjects: Subject[] = [];
  const history: HistoryItem[] = [];
  const notifications: any[] = [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-10 py-4 flex items-center justify-between">
        {/* Left - Logo */}
        <div className="flex-1 flex justify-start">
          <img src="/gslogo.png" alt="GradeSeer Logo" className="h-16 w-16" />
        </div>

        {/* Center - Navigation Buttons */}
        <div className="flex-1 flex justify-center">
          <div className="flex justify-between w-250"> 
            {/* Adjust 'w-96' to control button spacing */}
            <button className="text-gray-700 font-medium hover:text-blue-600 transition">
              Subjects
            </button>
            <button className="text-gray-700 font-medium hover:text-blue-600 transition">
              History
            </button>
            <button className="text-gray-700 font-medium hover:text-blue-600 transition">
              Notifications
            </button>
          </div>
        </div>

        {/* Right - Profile */}
        <div className="flex-1 flex justify-end relative group">
          <button>
            {user?.image ? (
              <Image
                src={user.image}
                alt="Profile"
                width={50}
                height={50}
                className="rounded-full cursor-pointer border border-gray-300"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full" />
            )}
          </button>

          {/* Dropdown */}
          <div className="absolute right-0 mt-3 w-44 bg-white shadow-lg rounded-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
            <div className="px-4 py-2 text-gray-700 border-b border-gray-100 font-semibold">
              {user?.name || "User"}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-6">
          Welcome, {user?.name || "Student"} 👋
        </h1>
        <div className="space-y-4 text-gray-700">
          <div className="text-lg">📚 Subjects Section (placeholder)</div>
          <div className="text-lg">🕒 History Section (placeholder)</div>
          <div className="text-lg">🔔 Notifications Section (placeholder)</div>
        </div>
      </main>
    </div>
  );
}
