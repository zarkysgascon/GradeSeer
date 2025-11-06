"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

// Generate pastel color for a new subject
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

  const user = session?.user as ExtendedUser | undefined;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Fetch subjects safely
  useEffect(() => {
    if (!user?.email) return;

    const fetchSubjects = async () => {
      try {
        const email: string = user.email!;
        const res = await fetch(`/api/subjects?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setSubjects(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSubjects();
  }, [user?.email]);

  // Add or update a component
  const handleAddOrUpdateComponent = () => {
    if (!newComponent.name.trim()) return;

    const duplicate = newSubject.components.some(
      (c) => c.priority === newComponent.priority && c.name !== newComponent.name
    );
    if (duplicate) return alert("Priority already exists!");

    const updatedComponents = [...newSubject.components];
    const idx = updatedComponents.findIndex((c) => c.name === newComponent.name);
    if (idx >= 0) updatedComponents[idx] = newComponent;
    else updatedComponents.push(newComponent);

    setNewSubject({ ...newSubject, components: updatedComponents });
    setNewComponent({ name: "", percentage: 0, priority: updatedComponents.length + 1 });
  };

  // Save subject
  const handleSaveSubject = async () => {
    if (!newSubject.name.trim() || !user?.email) return;
    setLoading(true);

    try {
      const email: string = user.email;
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSubject, user_email: email }),
      });

      if (res.ok) {
        const data = await (await fetch(`/api/subjects?email=${encodeURIComponent(email)}`)).json();
        setSubjects(data);
        setShowModal(false);
        setNewSubject({
          name: "",
          is_major: false,
          target_grade: 0,
          color: generateColor(),
          components: [],
        });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save subject");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save subject");
    }

    setLoading(false);
  };

  if (status === "loading") return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-10 py-4 flex items-center justify-between">
        <div className="flex-1 flex justify-start">
          <Image src="/gslogo.png" alt="Logo" width={48} height={48} />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex gap-8">
            {["subjects","history","notifications"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)}
                className={`capitalize font-medium transition ${activeTab===tab?'text-blue-600 border-b-2 border-blue-600 pb-1':'text-gray-700 hover:text-blue-600'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex justify-end">
          <button onClick={() => router.push("/profile")}>
            {user?.image ? (
              <Image
                src={user.image}
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

      {/* Main */}
      <main className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Welcome, {user?.name ?? "Student"} 👋</h1>

        {activeTab==="subjects" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-start mb-4">
              <button onClick={()=>setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">+ Add Subject</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {subjects.length===0 ? (
                <p className="text-gray-600 text-center col-span-full">No subjects yet.</p>
              ) : subjects.map(subj => (
                <div key={subj.id} className="p-4 bg-white rounded-xl shadow-lg relative border-l-8"
                  style={{ borderColor: subj.color }}>
                  <div className="font-bold text-lg">{subj.name}</div>
                  <div className="mt-1 text-sm text-gray-600">
                    {subj.is_major ? "Major" : "Minor"} 
                    {subj.target_grade != null && ` • Target: ${Number(subj.target_grade).toFixed(2)}`}
                  </div>
                  <ul className="mt-2 text-sm text-gray-800 space-y-1">
                    {subj.components.sort((a,b)=>a.priority-b.priority).map((c,i)=>(
                      <li key={i}>{i+1}. {c.name} – {c.percentage.toFixed(2)} (Priority {c.priority})</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      <div className={`fixed inset-0 flex justify-center items-center bg-black/30 backdrop-blur-sm z-50 ${showModal ? "block" : "hidden"}`}>
        <div className="bg-white rounded-3xl shadow-2xl w-[500px] p-6 relative">
          <div className="h-6 rounded-t-xl" style={{ backgroundColor: newSubject.color }} />
          <h2 className="text-xl font-bold mb-4 text-center">Add New Subject</h2>

          <input type="text" placeholder="Subject name" value={newSubject.name}
            onChange={e=>setNewSubject({...newSubject,name:e.target.value})}
            className="w-full p-2 border rounded mb-3" />

          <label className="flex flex-col mb-3">
            <span className="mb-1 font-medium">Subject Type</span>
            <select value={newSubject.is_major ? "major":"minor"}
              onChange={e=>setNewSubject({...newSubject,is_major:e.target.value==="major"})}
              className="p-2 border rounded">
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          </label>

          <label className="flex flex-col mb-3">
            <span className="mb-1 font-medium">Target Grade (numeric, e.g., 3.00)</span>
            <input type="number" min={0} max={100} step={0.01} value={newSubject.target_grade ?? 0}
              onChange={e=>setNewSubject({...newSubject,target_grade: Number(e.target.value)})}
              className="p-2 border rounded" />
          </label>

          <h3 className="font-semibold mb-2">Components</h3>
          <div className="border rounded p-2 mb-3 max-h-40 overflow-y-auto text-sm space-y-1">
            {newSubject.components.length===0 ? <p className="text-gray-400 text-center">No components yet</p> :
              newSubject.components.map((comp,i)=>( 
                <div key={i} className="flex gap-2 items-center">
                  <input className="flex-1 p-1 border rounded text-sm" value={comp.name}
                    onChange={e=>{ const updated=[...newSubject.components]; updated[i].name=e.target.value; setNewSubject({...newSubject,components:updated}); }} />
                  <input className="w-20 p-1 border rounded text-sm" type="number" step={0.01} value={comp.percentage}
                    onChange={e=>{ const updated=[...newSubject.components]; updated[i].percentage=Number(e.target.value); setNewSubject({...newSubject,components:updated}); }} />
                  <input className="w-20 p-1 border rounded text-sm" type="number" value={comp.priority}
                    onChange={e=>{ const updated=[...newSubject.components]; updated[i].priority=Number(e.target.value); setNewSubject({...newSubject,components:updated}); }} />
                </div>
              ))
            }
          </div>

          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Component name" value={newComponent.name}
              onChange={e=>setNewComponent({...newComponent,name:e.target.value})}
              className="flex-1 p-2 border rounded"/>
            <input type="number" placeholder="Numeric" step={0.01} value={newComponent.percentage}
              onChange={e=>setNewComponent({...newComponent,percentage:Number(e.target.value)})}
              className="w-20 p-2 border rounded"/>
            <input type="number" placeholder="Priority" value={newComponent.priority}
              onChange={e=>setNewComponent({...newComponent,priority:Number(e.target.value)})}
              className="w-20 p-2 border rounded"/>
          </div>

          <button onClick={handleAddOrUpdateComponent} className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded mb-4 transition">+ Add / Update Component</button>

          <div className="flex justify-between">
            <button onClick={()=>setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">Cancel</button>
            <button onClick={handleSaveSubject} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">{loading ? "Saving..." : "Save Subject"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
