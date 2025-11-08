"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/* ------------------------- Interfaces ------------------------- */
interface ComponentInput {
  name: string;
  percentage: number;
  priority: number;
  grade?: number | null;
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

/* ------------------------- Calculations ------------------------- */
function computeCurrentGrade(components: ComponentInput[]) {
  if (!components || components.length === 0) return 0;
  return Number(
    components
      .reduce((sum, c) => {
        const g = c.grade ?? 0;
        const w = c.percentage / 100;
        return sum + g * w;
      }, 0)
      .toFixed(2)
  );
}

function computeProgress(current: number, target: number | null | undefined) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((current / target) * 100)));
}

/* ---------------------- Utility Functions ---------------------- */
const generateColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
};

/* ---------------------- Dashboard Component ---------------------- */
export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"subjects" | "history" | "notifications">("subjects");
  const [showModal, setShowModal] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const user = session?.user as ExtendedUser | undefined;

  /* ---------------------- Fetch Updated Profile Image ---------------------- */
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.email) return;
      try {
        const res = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const userData = await res.json();
          if (userData.image) setProfileImage(userData.image);
        }
      } catch (err) {
        console.error("Error fetching updated user profile:", err);
      }
    };
    fetchUserProfile();
  }, [user?.email]);

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
    if (status !== "authenticated" || !user?.email) return;

    const fetchSubjects = async () => {
      try {
        const res = await fetch(`/api/subjects?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Subject[] = data.map((s: any) => ({
            ...s,
            id: s.id || s._id,
            components: s.components || [],
          }));
          setSubjects(mapped);
        } else {
          console.error("Failed to fetch subjects:", res.statusText);
        }
      } catch (err) {
        console.error("Error fetching subjects:", err);
      }
    };

    fetchSubjects();
  }, [status, user?.email]);

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

    setNewComponent({
      name: "",
      percentage: 0,
      priority: updated.length + 1,
    });
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
        const updated = await fetch(`/api/subjects?email=${encodeURIComponent(user.email!)}`).then((r) =>
          r.json()
        );
        const mapped: Subject[] = updated.map((s: any) => ({
          ...s,
          id: s.id || s._id,
          components: s.components || [],
        }));
        setSubjects(mapped);
        setShowModal(false);
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
      alert("Error saving subject.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading")
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;

  /* ---------------------- UI Return ---------------------- */
  return (
    <div className="min-h-screen bg-gray-100">
      {/* NAVBAR */}
      <nav className="bg-white shadow-md px-10 py-4 flex items-center justify-between">
        <div className="flex-1 flex justify-start">
          <Image src="/gslogo.png" alt="Logo" width={80} height={80} />
        </div>

        <div className="flex-1 flex justify-center">
          <div className="flex gap-80">
            {["subjects", "history", "notifications"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
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

        <div className="flex-1 flex justify-end">
          <button onClick={() => router.push("/profile")}>
            <Image
              src={profileImage || user?.image || "/default.png"}
              alt="Profile"
              width={50}
              height={50}
              className="rounded-full cursor-pointer border border-gray-300"
            />
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Welcome, {user?.name ?? "Student"} 👋
        </h1>

        {/* SUBJECTS TAB */}
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

            {/* SUBJECT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {subjects.map((subj) => {
                const current = computeCurrentGrade(subj.components);
                const target = subj.target_grade ?? 100;
                const progress = computeProgress(current, target);
                const belowTarget = current < target;

                return (
                  <div
                    key={subj.id}
                    onClick={() => router.push(`/dashboard/subject/${subj.id}`)}
                    className={`p-4 bg-white rounded-2xl shadow-lg cursor-pointer hover:shadow-xl border-l-8 transition
                      ${belowTarget ? "border-red-600" : "border-blue-500"}`}
                  >
                    <div className="font-bold text-lg">{subj.name}</div>
                    <p className="text-sm text-gray-600 mt-1 mb-2">
                      Current: <b>{current}%</b> • Target: <b>{target}%</b>
                    </p>

                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="w-full h-4 rounded-full overflow-hidden bg-gray-300">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: belowTarget ? "#DC2626" : subj.color,
                        }}
                      />
                    </div>

                    {belowTarget && <p className="mt-2 text-sm font-semibold text-red-600">Below target!</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ADD SUBJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/30 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-[500px] p-6">
            <div className="h-6 rounded-t-xl" style={{ backgroundColor: newSubject.color }} />
            <h2 className="text-xl font-bold mb-4 text-center">Add New Subject</h2>

            {/* Subject Name */}
            <input
              type="text"
              placeholder="Subject name"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              className="w-full p-2 border rounded mb-3"
            />

            {/* Type */}
            <select
              value={newSubject.is_major ? "major" : "minor"}
              onChange={(e) =>
                setNewSubject({ ...newSubject, is_major: e.target.value === "major" })
              }
              className="w-full p-2 border rounded mb-3"
            >
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>

            {/* Target Grade */}
            <input
              type="number"
              placeholder="Target Grade"
              value={newSubject.target_grade ?? ""}
              onChange={(e) =>
                setNewSubject({ ...newSubject, target_grade: Number(e.target.value) })
              }
              className="w-full p-2 border rounded mb-3"
            />

            {/* Components */}
            <h3 className="font-bold mb-1">Components</h3>
            <div className="border rounded p-2 max-h-40 overflow-y-auto mb-4">
              {newSubject.components.length === 0 && (
                <p className="text-gray-400 text-center text-sm">No components yet</p>
              )}

              {newSubject.components.map((c, i) => (
                <div key={i} className="flex gap-2 mb-2 text-sm">
                  <input
                    className="flex-1 p-1 border rounded"
                    value={c.name}
                    onChange={(e) => {
                      const updated = [...newSubject.components];
                      updated[i].name = e.target.value;
                      setNewSubject({ ...newSubject, components: updated });
                    }}
                  />
                  <input
                    type="number"
                    className="w-20 p-1 border rounded"
                    value={c.percentage}
                    onChange={(e) => {
                      const updated = [...newSubject.components];
                      updated[i].percentage = Number(e.target.value);
                      setNewSubject({ ...newSubject, components: updated });
                    }}
                  />
                  <input
                    type="number"
                    className="w-20 p-1 border rounded"
                    value={c.priority}
                    onChange={(e) => {
                      const updated = [...newSubject.components];
                      updated[i].priority = Number(e.target.value);
                      setNewSubject({ ...newSubject, components: updated });
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Add Component */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Component Name"
                className="flex-1 p-2 border rounded"
                value={newComponent.name}
                onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="%"
                className="w-20 p-2 border rounded"
                value={newComponent.percentage}
                onChange={(e) =>
                  setNewComponent({ ...newComponent, percentage: Number(e.target.value) })
                }
              />
              <input
                type="number"
                placeholder="P"
                className="w-20 p-2 border rounded"
                value={newComponent.priority}
                onChange={(e) =>
                  setNewComponent({ ...newComponent, priority: Number(e.target.value) })
                }
              />
            </div>

            <button
              onClick={handleAddOrUpdateComponent}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded mb-4"
            >
              + Add Component
            </button>

            {/* Footer */}
            <div className="flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubject}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {loading ? "Saving..." : "Save Subject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
