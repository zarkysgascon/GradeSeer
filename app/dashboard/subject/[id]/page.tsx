"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

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
  target_grade?: number;
  color: string;
  components: ComponentInput[];
}

export default function SubjectDetails() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const subjectId = params?.id;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  const userEmail = session?.user?.email;

  useEffect(() => {
    if (!userEmail || !subjectId) return;

    const fetchSubject = async () => {
      try {
        const res = await fetch(`/api/subjects?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        const found = data.find((s: any) => (s.id || s._id).toString() === subjectId);
        if (found) setSubject(found);
        else router.push("/dashboard");
      } catch (err) {
        console.error(err);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchSubject();
  }, [userEmail, subjectId]);

  const handleGradeChange = (index: number, value: number) => {
    if (!subject) return;
    const updated = [...subject.components];
    updated[index].grade = value;
    setSubject({ ...subject, components: updated });
  };

  const handleSaveGrades = async () => {
    if (!subject) return;
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components: subject.components }),
      });
      if (res.ok) alert("Grades updated successfully!");
      else alert("Failed to update grades.");
    } catch (err) {
      console.error(err);
      alert("Error updating grades");
    }
  };

  if (loading)
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;

  if (!subject) return null;

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <button onClick={() => router.push("/dashboard")} className="mb-4 px-4 py-2 bg-gray-300 rounded">
        ← Back to Dashboard
      </button>

      <div className="p-6 bg-white rounded-2xl shadow-lg" style={{ borderLeft: `8px solid ${subject.color}` }}>
        <h1 className="text-2xl font-bold">{subject.name}</h1>
        <p className="text-sm text-gray-600 mb-4">
          Type: <b>{subject.is_major ? "Major" : "Minor"}</b> | Target: <b>{subject.target_grade}%</b>
        </p>

        <h2 className="font-bold text-lg mb-2">Components</h2>
        <div className="flex flex-col gap-2">
          {subject.components.map((c, i) => (
            <div key={i} className="flex justify-between items-center gap-2">
              <span>{c.name}</span>
              <input
                type="number"
                className="w-20 p-1 border rounded"
                value={c.grade ?? 0}
                onChange={(e) => handleGradeChange(i, Number(e.target.value))}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveGrades}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Grades
        </button>
      </div>
    </div>
  );
}
