"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import React from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    image: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");

    const fetchUser = async () => {
      if (session?.user?.email) {
        try {
          const res = await fetch(`/api/users?email=${session.user.email}`);
          if (res.ok) {
            const data = await res.json();
            setUserInfo({
              name: data.name ?? session.user.name ?? "",
              email: data.email ?? session.user.email ?? "",
              image: data.image ?? session.user.image ?? "",
            });
            setPreviewImage(data.image ?? session.user.image ?? "");
          } else {
            setUserInfo({
              name: session.user.name ?? "",
              email: session.user.email ?? "",
              image: session.user.image ?? "",
            });
            setPreviewImage(session.user.image ?? "");
          }
        } catch (err) {
          console.error("Error fetching user:", err);
        }
      }
    };

    fetchUser();
  }, [session, status, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setUserInfo((prev) => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userInfo),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      alert("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Error updating profile");
    }
  };

  if (status === "loading")
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Updated Navbar */}
      <nav className="bg-white/90 backdrop-blur-md shadow-md px-10 py-4 flex items-center justify-between relative z-10">
        
        {/* Left - Logo */}
        <div className="flex-1 flex justify-start">
          <Image src="/gslogo.png" alt="Logo" width={80} height={80} className="drop-shadow-sm" />
        </div>

        {/* Center - Dashboard tab */}
        <div className="flex-1 flex justify-center">
          <div className="flex gap-16">
            <button
              onClick={() => router.push("/dashboard")}
              className="capitalize font-medium transition-all text-blue-600 border-b-2 border-blue-600 pb-1"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Right - profile picture */}
        <div className="flex-1 flex justify-end">
          <button onClick={() => router.push("/profile")}>
            {userInfo.image ? (
              <Image
                src={userInfo.image}
                alt="Profile"
                width={50}
                height={50}
                className="rounded-full cursor-pointer border border-gray-300"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full cursor-pointer" />
            )}
          </button>
        </div>
      </nav>

      {/* Profile Section */}
      <main className="flex justify-center py-10">
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden w-full max-w-3xl">
          <div className="bg-indigo-500 p-6 flex justify-between items-center text-white">
            <div className="flex items-center space-x-4">
              {/* Profile Image */}
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Profile"
                    width={56}
                    height={56}
                    className="rounded-full border-2 border-white"
                  />
                ) : (
                  <div className="bg-white text-indigo-600 font-bold text-xl w-14 h-14 rounded-full flex items-center justify-center border border-indigo-300">
                    {userInfo.name
                      ? userInfo.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                      : "U"}
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition">
                    <span className="text-white text-sm">Change</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Name */}
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={userInfo.name}
                    onChange={(e) =>
                      setUserInfo((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="text-indigo-800 px-2 py-1 rounded-md text-lg font-semibold"
                  />
                ) : (
                  <h2 className="text-lg font-semibold">{userInfo.name}</h2>
                )}
              </div>
            </div>

            {/* Edit / Save Buttons */}
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="bg-white text-indigo-600 px-3 py-1 rounded-md font-semibold hover:bg-indigo-100"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="hover:opacity-80"
                  title="Edit Profile"
                >
                  ✏️
                </button>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="px-8 py-6">
            <h3 className="font-bold text-gray-800 mb-3">Information</h3>
            <div className="border rounded-md shadow-sm p-4 bg-white">
              <p className="mb-2">
                <span className="font-medium text-gray-600">Name:</span>{" "}
                {userInfo.name}
              </p>
              <p className="mb-4">
                <span className="font-medium text-gray-600">Email:</span>{" "}
                {userInfo.email}
              </p>
            </div>

            {/* Logout button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-600"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80 text-center">
            <h2 className="text-lg font-semibold mb-4">Confirm Logout</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to log out?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-md font-medium hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-4 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
