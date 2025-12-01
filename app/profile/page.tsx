"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import React from "react";
import Backdrop from "../components/Backdrop";

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
  const [isNavOpen, setIsNavOpen] = useState(false);

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
    <div className="min-h-screen relative">
      <Backdrop />
      
      {/* RESPONSIVE NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-md">
        {/* Mobile Navbar (visible on small screens) */}
        <div className="md:hidden px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image 
              src="/gslogo.png" 
              alt="Logo" 
              width={32} 
              height={32} 
              className="h-8 w-8 drop-shadow-sm" 
            />
            <span className="font-bold text-lg text-gray-800">GradeSeer</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Profile Image on Mobile */}
            <div className="block md:hidden">
              {userInfo.image ? (
                <Image
                  src={userInfo.image}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="rounded-full border-2 border-gray-300"
                />
              ) : (
                <div className="w-9 h-9 bg-gray-300 rounded-full cursor-pointer" />
              )}
            </div>
            
            {/* Hamburger Menu */}
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isNavOpen}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
                <div className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${isNavOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                <div className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${isNavOpen ? 'opacity-0' : ''}`}></div>
                <div className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${isNavOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
              </div>
            </button>
          </div>
        </div>

        {/* Desktop Navbar (hidden on mobile) */}
        <div className="hidden md:flex px-6 lg:px-10 py-4 items-center justify-between">
          {/* Left - Logo */}
          <div className="flex-1 flex justify-start">
            <div className="flex items-center gap-3">
              <Image src="/gslogo.png" alt="Logo" width={80} height={80} className="drop-shadow-sm" />
              <span className="font-bold text-xl text-gray-800 hidden lg:block">GradeSeer</span>
            </div>
          </div>

          {/* Center - Profile tab */}
          <div className="flex-1 flex justify-center">
            <div className="flex gap-6 lg:gap-12">
              <button
                onClick={() => router.push("/dashboard")}
                className="capitalize font-medium transition-all text-sm lg:text-base text-gray-700 hover:text-blue-600"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/profile")}
                className="capitalize font-medium transition-all relative text-sm lg:text-base text-blue-600"
              >
                Profile
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              </button>
            </div>
          </div>

          {/* Right - profile picture */}
          <div className="flex-1 flex justify-end">
            <button onClick={() => router.push("/profile")} className="group">
              {userInfo.image ? (
                <Image
                  src={userInfo.image}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="rounded-full cursor-pointer border-2 border-gray-300 group-hover:border-blue-500 transition-all duration-300 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-full cursor-pointer border-2 border-gray-300 group-hover:border-blue-500 transition-all" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isNavOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsNavOpen(false)}>
          <div 
            className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-xl animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Image 
                    src="/gslogo.png" 
                    alt="Logo" 
                    width={40} 
                    height={40} 
                    className="drop-shadow-sm" 
                  />
                  <div>
                    <h2 className="font-bold text-lg text-gray-800">GradeSeer</h2>
                    <p className="text-xs text-gray-500">Profile</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNavOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* User Profile in Mobile Menu */}
              <div 
                className="p-4 bg-gray-50 rounded-xl border border-gray-100 active:scale-95 transition-transform cursor-pointer" 
                onClick={() => { router.push("/profile"); setIsNavOpen(false); }}
              >
                <div className="flex items-center gap-4">
                  {userInfo.image ? (
                    <Image
                      src={userInfo.image}
                      alt="Profile"
                      width={56}
                      height={56}
                      className="rounded-full border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white">
                      <span className="text-lg font-bold text-gray-700">
                        {userInfo.name
                          ? userInfo.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                          : "U"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{userInfo.name || "User"}</p>
                    <p className="text-sm text-gray-500 truncate">{userInfo.email || "user@example.com"}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile Navigation Items */}
            <div className="p-4">
              <div className="space-y-2">
                <button
                  onClick={() => { router.push("/dashboard"); setIsNavOpen(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-700 hover:bg-gray-50 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-base">Dashboard</span>
                </button>
                
                <button
                  onClick={() => { setIsNavOpen(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-blue-50 text-blue-600 font-semibold border border-blue-100 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-base">Profile</span>
                  <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                </button>
              </div>
              
              {/* Logout Option */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => { setShowLogoutModal(true); setIsNavOpen(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back to Dashboard button - Responsive positioning */}
      <div className="absolute left-4 md:left-10 top-20 md:top-28 z-40">
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 md:px-5 md:py-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 border border-gray-200 flex items-center gap-2 transition-all duration-200 hover:shadow-xl text-sm md:text-base"
          aria-label="Back to Dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>

      {/* Profile Section - Responsive */}
      <main className="flex justify-center py-6 md:py-10 px-4 sm:px-6">
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden w-full max-w-3xl">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-4 md:p-6 flex flex-col sm:flex-row justify-between items-center text-white">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0 w-full sm:w-auto">
              {/* Profile Image - Responsive */}
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

              {/* Name - Responsive */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={userInfo.name}
                    onChange={(e) =>
                      setUserInfo((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="text-indigo-800 px-2 py-1 rounded-md text-lg font-semibold w-full max-w-xs"
                    placeholder="Enter your name"
                  />
                ) : (
                  <h2 className="text-lg font-semibold truncate">{userInfo.name || "User"}</h2>
                )}
              </div>
            </div>

            {/* Edit / Save Buttons - Responsive */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="bg-white text-indigo-600 px-3 py-1.5 rounded-md font-semibold hover:bg-indigo-100 transition-colors text-sm md:text-base"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md font-semibold hover:bg-gray-300 transition-colors text-sm md:text-base"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="hover:opacity-80 p-2 rounded-full hover:bg-white/10 transition-colors"
                  title="Edit Profile"
                  aria-label="Edit Profile"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Info Section - Responsive */}
          <div className="px-4 sm:px-6 md:px-8 py-6">
            <h3 className="font-bold text-gray-800 mb-3 text-lg">Information</h3>
            <div className="border rounded-md shadow-sm p-4 md:p-6 bg-white">
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-600 mb-1">Name:</p>
                  <div className="p-2 bg-gray-50 rounded border">
                    <span className="text-gray-800">{userInfo.name || "Not set"}</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-600 mb-1">Email:</p>
                  <div className="p-2 bg-gray-50 rounded border">
                    <span className="text-gray-800">{userInfo.email || "Not set"}</span>
                  </div>
                </div>
              </div>

              {/* Logout button - Responsive */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full sm:w-auto bg-red-500 text-white px-4 py-2.5 rounded-md font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Logout Modal - Responsive */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Confirm Logout</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to log out?
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2.5 bg-gray-200 rounded-md font-medium hover:bg-gray-300 transition-colors flex-1"
              >
                Cancel
              </button>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-4 py-2.5 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 transition-colors flex-1"
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