"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/* ------------------------- Interfaces ------------------------- */
interface ComponentInput {
  name: string;
  percentage: number;
  priority: number;
}

interface Subject {
  id: string;
  name: string;
  is_major: boolean;
  target_grade?: number | null;
  color: string;
  components: ComponentInput[];
}

interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/* ---------------------- Utility Functions ---------------------- */
const generateColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"subjects" | "history" | "notifications">("subjects");
  const [showModal, setShowModal] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  const user = session?.user as ExtendedUser | undefined;

  /* ---------------------- Modal States ---------------------- */
  const [newSubject, setNewSubject] = useState({
    name: "",
    is_major: false,
    target_grade: 0,
    color: generateColor(),
    components: [] as ComponentInput[],
  });

  const [newComponent, setNewComponent] = useState<ComponentInput>({
    name: "",
    percentage: 0,
    priority: 1,
  });

  /* ---------------------- Auth Redirect ---------------------- */
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  /* ---------------------- Fetch Subjects ---------------------- */
  useEffect(() => {
    if (!user?.email) return;

    const fetchSubjects = async () => {
      try {
        const res = await fetch(`/api/subjects?email=${encodeURIComponent(user.email!)}`);
        if (res.ok) {
          setSubjects(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSubjects();
  }, [user?.email]);

  /* ---------------------- Add/Update Component ---------------------- */
  const handleAddOrUpdateComponent = () => {
    if (!newComponent.name.trim()) return alert("Component name required!");

    const duplicate = newSubject.components.some(
      (c) => c.priority === newComponent.priority && c.name !== newComponent.name
    );
    if (duplicate) return alert("A component with that priority already exists.");

    const updated = [...newSubject.components];
    const idx = updated.findIndex((c) => c.name === newComponent.name);

    if (idx >= 0) updated[idx] = newComponent;
    else updated.push(newComponent);

    setNewSubject({ ...newSubject, components: updated });
    setNewComponent({ name: "", percentage: 0, priority: updated.length + 1 });
  };

  /* ---------------------- Save Subject ---------------------- */
  const handleSaveSubject = async () => {
    if (!user?.email || !newSubject.name.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSubject, user_email: user.email }),
      });

      if (res.ok) {
        const updated = await fetch(`/api/subjects?email=${encodeURIComponent(user.email!)}`).then(
          (r) => r.json()
        );

        setSubjects(updated);
        setShowModal(false);

        // Reset modal
        setNewSubject({
          name: "",
          is_major: false,
          target_grade: 0,
          color: generateColor(),
          components: [],
        });
      } else {
        alert("Failed to save subject.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while saving.");
    }

    setLoading(false);
  };

  /* ---------------------- Loading State ---------------------- */
  if (status === "loading")
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;

  /* ---------------------- UI Return ---------------------- */
  return (
    <div className="min-h-screen bg-gray-100">

      {/* ---------------------- Navbar ---------------------- */}
      <nav className="bg-white shadow-md px-10 py-4 flex items-center justify-between">
        {/* Left Logo */}
        <div className="flex-1 flex justify-start">
          <Image src="/gslogo.png" alt="Logo" width={80} height={80} />
        </div>

        {/* Center Tabs */}
        <div className="flex-1 flex justify-center">
            <div className="flex gap-70">
            {(["subjects", "history", "notifications"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`capitalize font-medium transition ${
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Dropdown */}
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
          <div className="absolute right-0 mt-3 w-44 bg-white shadow-lg rounded-lg border opacity-0 group-hover:opacity-100 transition duration-200 z-50">
            <div className="px-4 py-2 text-gray-700 border-b font-semibold">
              {user?.name ?? "User"}
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

      {/* ---------------------- Main Section ---------------------- */}
      <main className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Welcome, {user?.name ?? "Student"} 👋
        </h1>

        {/* ---------------------- SUBJECTS TAB ---------------------- */}
        {activeTab === "subjects" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-start mb-4">
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
              >
                + Add Subject
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {subjects.length === 0 ? (
                <p className="text-gray-600 text-center col-span-full">
                  No subjects added yet.
                </p>
              ) : (
                subjects.map((subj) => (
                  <div
                    key={subj.id}
                    className="p-4 bg-white rounded-xl shadow-lg border-l-8"
                    style={{ borderColor: subj.color }}
                  >
                    <div className="font-bold text-lg">{subj.name}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {subj.is_major ? "Major" : "Minor"}{" "}
                      {subj.target_grade && `• Target: ${subj.target_grade}`}
                    </div>

                    <ul className="mt-2 text-sm text-gray-800 space-y-1">
                      {subj.components
                        .sort((a, b) => a.priority - b.priority)
                        .map((c, i) => (
                          <li key={i}>
                            {i + 1}. {c.name} – {c.percentage}% (P{c.priority})
                          </li>
                        ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ---------------------- ✅ ADD SUBJECT MODAL ---------------------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-[520px] rounded-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="h-20 bg-gradient-to-r from-purple-700 to-indigo-500 flex items-center justify-center">
              <h2 className="text-xl font-bold text-white tracking-wide">
                Add New Subject
              </h2>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              
              {/* Name */}
              <label className="font-semibold text-gray-700 text-sm">Subject Name</label>
              <input
                type="text"
                className="w-full p-3 border rounded-xl mb-4 focus:ring-2 focus:ring-indigo-400"
                placeholder="Enter subject name"
                value={newSubject.name}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, name: e.target.value })
                }
          
              />

              {/* Type */}
              <label className="font-semibold text-gray-700 text-sm">Course Type</label>
              <select
                className="w-full p-3 border rounded-xl mb-4 focus:ring-2 focus:ring-indigo-400"
                value={newSubject.is_major ? "major" : "minor"}
                onChange={(e) =>
                  setNewSubject({
                    ...newSubject,
                    is_major: e.target.value === "major",
                  })
                }
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>

              {/* Components */}
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                Components (Tasks, Exams, Projects)
              </h3>

              <div className="border rounded-xl p-3 max-h-40 overflow-y-auto bg-gray-50">
                {newSubject.components.length === 0 ? (
                  <p className="text-gray-400 text-center text-sm py-5">
                    No components yet.
                  </p>
                ) : (
                  newSubject.components.map((c, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        className="p-2 border rounded-lg text-sm"
                        value={c.name}
                        onChange={(e) => {
                          const updated = [...newSubject.components];
                          updated[i].name = e.target.value;
                          setNewSubject({ ...newSubject, components: updated });
                        }}
                      />
                      <input
                        type="number"
                        className="p-2 border rounded-lg text-sm"
                        value={c.percentage}
                        onChange={(e) => {
                          const updated = [...newSubject.components];
                          updated[i].percentage = Number(e.target.value);
                          setNewSubject({ ...newSubject, components: updated });
                        }}
                      />
                      <input
                        type="number"
                        className="p-2 border rounded-lg text-sm"
                        value={c.priority}
                        onChange={(e) => {
                          const updated = [...newSubject.components];
                          updated[i].priority = Number(e.target.value);
                          setNewSubject({ ...newSubject, components: updated });
                        }}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Add Component Row */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <input
                  type="text"
                  placeholder="Name"
                  className="p-2 border rounded-xl text-sm"
                  value={newComponent.name}
                  onChange={(e) =>
                    setNewComponent({ ...newComponent, name: e.target.value })
                  }
                />
                <input
                  type="number"
                  className="p-2 border rounded-xl text-sm"
                  placeholder="%"
                  value={newComponent.percentage}
                  onChange={(e) =>
                    setNewComponent({
                      ...newComponent,
                      percentage: Number(e.target.value),
                    })
                  }
                />
                <input
                  type="number"
                  className="p-2 border rounded-xl text-sm"
                  placeholder="P"
                  value={newComponent.priority}
                  onChange={(e) =>
                    setNewComponent({
                      ...newComponent,
                      priority: Number(e.target.value),
                    })
                  }
                />
              </div>

              {/* Add Component Button */}
              <button
                onClick={handleAddOrUpdateComponent}
                className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-semibold"
              >
                + Add Component
              </button>

              {/* Footer Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSaveSubject}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {loading ? "Saving..." : "Save Subject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
