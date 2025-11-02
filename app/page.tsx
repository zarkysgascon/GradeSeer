// app/page.tsx
import Link from "next/link";
import React from "react";

const features = [
  {
    title: "Track Your Grades",
    description:
      "Keep all your subjects and scores organized in one place, and monitor your academic performance easily.",
  },
  {
    title: "Project Your Progress",
    description:
      "Use GradeSeer to predict your final grades and see how your current scores impact your projected and raw grade.",
  },
  {
    title: "Set Goals & Improve",
    description:
      "Identify weak areas and set personal targets to improve your grades with actionable insights.",
  },
];

const LandingPage: React.FC = () => {
  return (
    <main className="bg-gradient-to-b from-indigo-700 via-indigo-600 to-indigo-400 w-full min-h-screen overflow-hidden relative flex flex-col">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white shadow-md z-50 h-24 flex items-center px-6">
        <div className="flex items-center justify-start">
          <img src="/gslogo.png" alt="GradeSeer Logo" className="h-30 w-30" />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col justify-center items-center flex-1 text-center px-4 relative mt-24">

        {/* Title and subtitle */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
            Welcome to GradeSeer
          </h1>
          <p className="text-base sm:text-lg text-indigo-200 mt-4 max-w-lg">
            The smart way to track, project, and improve your grades. Stay on top of your progress and aim for your goals effortlessly.
          </p>
        </div>

        {/* CTA Buttons centered */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 z-20 mt-8">
          <Link
            href="/login"
            className="bg-white text-indigo-700 font-semibold px-10 py-5 rounded-full shadow-md hover:bg-indigo-100 transition"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="border-2 border-white text-white font-semibold px-10 py-5 rounded-full hover:bg-white hover:text-indigo-700 transition"
          >
            Sign Up
          </Link>
        </div>

      </section>

      {/* Features / Info Boxes */}
      <section
        id="features"
        className="relative z-10 px-4 py-8 max-w-6xl mx-auto flex flex-col items-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-indigo-100 mb-8 text-center">
          What is GradeSeer?
        </h2>
        <div className="grid gap-6 sm:grid-cols-3 w-full">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-indigo-50 p-6 rounded-xl shadow-md hover:shadow-xl transition"
            >
              <h3 className="text-xl font-semibold text-indigo-800 mb-4">
                {feature.title}
              </h3>
              <p className="text-indigo-700 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cloud effect below boxes */}
      <div className="w-full overflow-hidden leading-none mt-4">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-32"
        >
          <path
            d="M0,0 C150,100 350,0 600,50 C850,100 1050,0 1200,50 L1200,120 L0,120 Z"
            fill="white"
          ></path>
        </svg>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-indigo-100 bg-indigo-900 relative z-10">
        © {new Date().getFullYear()} GradeSeer | See It. Track It. Ace It.
      </footer>
    </main>
  );
};

export default LandingPage;
