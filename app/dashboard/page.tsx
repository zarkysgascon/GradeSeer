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

// Convert percentage grade to 1.0-3.0 scale
function percentageToGradeScale(percentage: number): number {
  if (percentage >= 97) return 3.00;
  if (percentage >= 93) return 2.75;
  if (percentage >= 89) return 2.50;
  if (percentage >= 85) return 2.25;
  if (percentage >= 81) return 2.00;
  if (percentage >= 77) return 1.75;
  if (percentage >= 73) return 1.50;
  if (percentage >= 69) return 1.25;
  if (percentage >= 65) return 1.00;
  return 0.00;
}

// Convert 1.0-3.0 scale to percentage for display
function gradeScaleToPercentage(grade: number): number {
  const scaleMap: { [key: number]: number } = {
    3.00: 97,
    2.75: 93,
    2.50: 89,
    2.25: 85,
    2.00: 81,
    1.75: 77,
    1.50: 73,
    1.25: 69,
    1.00: 65,
  };
  return scaleMap[grade] || 0;
}

/* ---------------------- Utility Functions ---------------------- */
const generateColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
};

/* ---------------------- Number Input Component ---------------------- */
const NumberInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className = "",
  ...props 
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => {
  const [displayValue, setDisplayValue] = useState(value === 0 ? "" : value.toString());

  useEffect(() => {
    setDisplayValue(value === 0 ? "" : value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    if (newValue === "") {
      onChange(0);
    } else {
      const numValue = parseInt(newValue, 10);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (value === 0) {
      setDisplayValue("");
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (displayValue === "") {
      setDisplayValue("");
    }
  };

  return (
    <input
      type="number"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder || "0"}
      className={`${className} ${value === 0 ? "text-gray-400" : "text-gray-900"}`}
      {...props}
    />
  );
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
    if (!user?.email) return;
    const fetchUserProfile = async () => {
      try {
        const res = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.image) setProfileImage(data.image);
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
        body: JSON.stringify({ 
          name: newSubject.name,
          is_major: newSubject.is_major,
          target_grade: newSubject.target_grade, // This can be 0 or null
          color: newSubject.color,
          components: newSubject.components,
          user_email: user.email,
          // NO id field here!
        }),
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
                const currentPercentage = computeCurrentGrade(subj.components);
                const currentGrade = percentageToGradeScale(currentPercentage);
                const targetGrade = subj.target_grade ? parseFloat(subj.target_grade.toString()) : 0;
                const targetPercentage = gradeScaleToPercentage(targetGrade);
                const progress = computeProgress(currentPercentage, targetPercentage);
                const belowTarget = currentGrade < targetGrade;

                return (
                  <div
                    key={subj.id}
                    onClick={() => router.push(`/dashboard/subject/${subj.id}`)}
                    className={`p-4 bg-white rounded-2xl shadow-lg cursor-pointer hover:shadow-xl border-l-8 transition
                      ${belowTarget ? "border-red-600" : "border-blue-500"}`}
                  >
                    <div className="font-bold text-lg">{subj.name}</div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 mt-1 mb-2">
                        Current: <b>{currentGrade.toFixed(2)}</b> • Target: <b>{targetGrade.toFixed(2)}</b>
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this subject?')) {
                            fetch(`/api/subjects/${subj.id}`, {
                              method: 'DELETE',
                            }).then((res) => {
                              if (res.ok) {
                                setSubjects(subjects.filter(s => s.id !== subj.id));
                              } else {
                                alert('Failed to delete subject');
                              }
                            });
                          }
                        }}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>

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

                    {belowTarget && (
                      <p className="mt-2 text-sm font-semibold text-red-600">Below target!</p>
                    )}
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
            <select
              value={newSubject.target_grade}
              onChange={(e) => setNewSubject({ ...newSubject, target_grade: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded mb-3"
            >
              <option value={0}>Select Target Grade</option>
              <option value={1.00}>1.00</option>
              <option value={1.25}>1.25</option>
              <option value={1.50}>1.50</option>
              <option value={1.75}>1.75</option>
              <option value={2.00}>2.00</option>
              <option value={2.25}>2.25</option>
              <option value={2.50}>2.50</option>
              <option value={2.75}>2.75</option>
              <option value={3.00}>3.00</option>
            </select>

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
                  <NumberInput
                    value={c.percentage}
                    onChange={(value) => {
                      const updated = [...newSubject.components];
                      updated[i].percentage = value;
                      setNewSubject({ ...newSubject, components: updated });
                    }}
                    className="w-20 p-1 border rounded"
                  />
                  <NumberInput
                    value={c.priority}
                    onChange={(value) => {
                      const updated = [...newSubject.components];
                      updated[i].priority = value;
                      setNewSubject({ ...newSubject, components: updated });
                    }}
                    className="w-20 p-1 border rounded"
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
              <NumberInput
                placeholder="%"
                value={newComponent.percentage}
                onChange={(value) => setNewComponent({ ...newComponent, percentage: value })}
                className="w-20 p-2 border rounded"
              />
              <NumberInput
                placeholder="P"
                value={newComponent.priority}
                onChange={(value) => setNewComponent({ ...newComponent, priority: value })}
                className="w-20 p-2 border rounded"
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