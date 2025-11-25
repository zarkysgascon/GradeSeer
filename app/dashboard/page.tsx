"use client";

import { useEffect, useState, ChangeEvent, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";


/* ------------------------- Interfaces ------------------------- */
interface ComponentInput {
  id?: string;
  name: string;
  percentage: number;
  priority: number;
  grade?: number | null;
  items?: ItemInput[];
}

interface ItemInput {
  id?: string;
  name: string;
  score?: number | null;
  max?: number | null;
  date?: string | null;
  target?: number | null;
}

interface Subject {
  id: string;
  name: string;
  is_major: boolean;
  target_grade?: number | null;
  color: string;
  components: ComponentInput[];
  items?: ItemInput[];
}

interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface Notification {
  id: string;
  type: 'quiz' | 'assignment' | 'exam' | 'general';
  title: string;
  message: string;
  subjectId?: string;
  subjectName?: string;
  dueDate?: string;
  read: boolean;
  createdAt: string;
}

interface HistoryEntry {
  id: string;
  subjectName: string;
  rawGrade: number;
  targetGrade: number;
  completedAt: string;
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

// Convert percentage grade to Philippine transmuted grade (1.0-5.0 scale)
function percentageToGradeScale(percentage: number): number {
  if (percentage >= 97) return 1.0;
  if (percentage >= 94) return 1.25;
  if (percentage >= 91) return 1.5;
  if (percentage >= 88) return 1.75;
  if (percentage >= 85) return 2.0;
  if (percentage >= 82) return 2.25;
  if (percentage >= 79) return 2.5;
  if (percentage >= 76) return 2.75;
  if (percentage >= 75) return 3.0;
  if (percentage >= 72) return 4.0;
  return 5.0;
}

// Convert Philippine grade scale to percentage for display
function gradeScaleToPercentage(grade: number): number {
  const scaleMap: { [key: number]: number } = {
    1.0: 97,
    1.25: 94,
    1.5: 91,
    1.75: 88,
    2.0: 85,
    2.25: 82,
    2.5: 79,
    2.75: 76,
    3.0: 75,
    4.0: 72,
    5.0: 0
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
  min,
  max,
  maxDigits,
  ...props 
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  maxDigits?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) => {
  const [displayValue, setDisplayValue] = useState(value === 0 ? "" : value.toString());

  useEffect(() => {
    setDisplayValue(value === 0 ? "" : value.toString());
  }, [value]);

  const clamp = (n: number) => {
    let v = n;
    if (typeof min === 'number' && v < min) v = min;
    if (typeof max === 'number' && v > max) v = max;
    return v;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // If maxDigits is provided, enforce digit-length (trim extras) instead of clamping to max numeric value.
    if (typeof maxDigits === 'number') {
      // Keep only optional leading '-' and digits
      const matched = newValue.match(/^-?\d*/);
      const raw = matched ? matched[0] : '';
      // Remove leading '-' for digit counting
      const isNegative = raw.startsWith('-');
      const digits = isNegative ? raw.slice(1) : raw;
      if (digits.length > maxDigits) {
        const trimmedDigits = digits.slice(0, maxDigits);
        const finalStr = (isNegative ? '-' : '') + trimmedDigits;
        setDisplayValue(finalStr);
        const parsed = parseInt(finalStr, 10);
        if (!isNaN(parsed)) onChange(parsed);
        return;
      }
      setDisplayValue(raw);
      if (raw === '' || raw === '-') {
        onChange(0);
      } else {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) onChange(parsed);
      }
      return;
    }

    setDisplayValue(newValue);
    
    if (newValue === "") {
      onChange(0);
    } else {
      const numValue = parseInt(newValue, 10);
      if (!isNaN(numValue)) {
        const final = clamp(numValue);
        onChange(final);
        setDisplayValue(final.toString());
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
      setDisplayValue(value === 0 ? "" : value.toString());
      return;
    }
    const numValue = parseInt(displayValue, 10);
    if (!isNaN(numValue)) {
      const final = clamp(numValue);
      if (final !== numValue) {
        setDisplayValue(final.toString());
        onChange(final);
      }
    } else {
      setDisplayValue(value === 0 ? "" : value.toString());
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
      min={min}
      max={max}
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  const user = session?.user as ExtendedUser | undefined;

  const historyStorageKey = user?.email ? `gradeHistory:${user.email}` : null;

  /* ---------------------- Test Email Function ---------------------- */
  const sendTestEmail = async () => {
    if (!user?.email) {
      alert('Please log in to test email');
      return;
    }

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'GradeSeer Test Email',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">GradeSeer</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Test Email Successful! 🎉</p>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #333; margin-bottom: 20px;">Email System Working</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <p style="color: #666; line-height: 1.6;">Congratulations! Your email system is working correctly.</p>
                  <p style="color: #666; line-height: 1.6;">You will receive notifications for:</p>
                  <ul style="color: #666; line-height: 1.6;">
                    <li>Upcoming quizzes and assignments</li>
                    <li>Exam reminders</li>
                    <li>Grade updates</li>
                    <li>Important announcements</li>
                  </ul>
                </div>
              </div>
            </div>
          `
        }),
      });

      const result = await res.json();
      
      if (result.success) {
        if (result.service === 'development') {
          alert('Development mode: Email simulation successful! Check browser console for details.');
        } else {
          alert('Test email sent successfully! Check your inbox.');
        }
      } else {
        alert('Failed to send test email: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error sending test email:', err);
      alert('Error sending test email');
    }
  };

  /* ---------------------- Fetch Updated Profile Image ---------------------- */
  useEffect(() => {
    if (!user?.email) return;
    const fetchUserProfile = async () => {
      try {
        const res = await fetch(`/api/users?email=${encodeURIComponent(user.email!)}`);
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

  /* ---------------------- Fetch Notifications ---------------------- */
  const fetchNotifications = async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(`/api/notifications?email=${encodeURIComponent(user.email!)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.email]);

  /* ---------------------- Enhanced Quiz Detection ---------------------- */
  useEffect(() => {
    if (!user?.email || subjects.length === 0) return;

    const checkUpcomingAssessments = async () => {
      try {
        // Get all items from all subjects
        const allItems: { item: ItemInput; subject: Subject; component: ComponentInput }[] = [];
        subjects.forEach(subject => {
          subject.components?.forEach(component => {
            component.items?.forEach((item: ItemInput) => {
              if (item.date) {
                allItems.push({ item, subject, component });
              }
            });
          });
        });

        // Check for items due within different timeframes
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const { item, subject, component } of allItems) {
          if (!item.date) continue;

          const itemDate = new Date(item.date);
          const timeDiff = itemDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

          // Only create notifications for future dates
          if (daysDiff >= 0 && daysDiff <= 7) {
            // Determine notification type based on item name and component
            let notificationType: 'quiz' | 'assignment' | 'exam' | 'general' = 'assignment';
            const itemName = item.name.toLowerCase();
            const componentName = component.name.toLowerCase();
            
            if (itemName.includes('quiz') || componentName.includes('quiz')) {
              notificationType = 'quiz';
            } else if (itemName.includes('exam') || itemName.includes('final') || itemName.includes('midterm')) {
              notificationType = 'exam';
            } else if (itemName.includes('project') || itemName.includes('assignment')) {
              notificationType = 'assignment';
            }

            // Create appropriate message based on timeframe
            let message = '';
            let title = '';

            if (daysDiff === 0) {
              title = `${notificationType.charAt(0).toUpperCase() + notificationType.slice(1)} Due Today!`;
              message = `${item.name} in ${subject.name} is due today`;
            } else if (daysDiff === 1) {
              title = `${notificationType.charAt(0).toUpperCase() + notificationType.slice(1)} Due Tomorrow`;
              message = `${item.name} in ${subject.name} is due tomorrow`;
            } else if (daysDiff <= 3) {
              title = `${notificationType.charAt(0).toUpperCase() + notificationType.slice(1)} Approaching`;
              message = `${item.name} in ${subject.name} is due in ${daysDiff} days`;
            } else {
              title = `Upcoming ${notificationType}`;
              message = `${item.name} in ${subject.name} is due in ${daysDiff} days`;
            }

            // Create notification
            await fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userEmail: user.email,
                type: notificationType,
                title,
                message,
                subjectId: subject.id,
                subjectName: subject.name,
                dueDate: item.date
              })
            });
          }
        }

        // Refresh notifications after creating new ones
        await fetchNotifications();
      } catch (err) {
        console.error("Error checking upcoming assessments:", err);
      }
    };

    // Check every hour for new notifications
    checkUpcomingAssessments();
    const interval = setInterval(checkUpcomingAssessments, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [subjects, user?.email]);

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

    const fetchSubjects = async () => {``
      try {
        const res = await fetch(`/api/subjects?email=${encodeURIComponent(user.email!)}`);
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

  /* ---------------------- Fetch History ---------------------- */
  const fetchHistory = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!historyStorageKey) {
      setHistoryEntries([]);
      return;
    }
    try {
      const stored = localStorage.getItem(historyStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setHistoryEntries(
        (Array.isArray(parsed) ? parsed : []).map((entry: any, idx: number) => ({
          id: entry.id ?? `${idx}-${entry.subjectName ?? "subject"}`,
          subjectName: entry.subjectName ?? "Unnamed Subject",
          rawGrade: Number(entry.rawGrade ?? 0),
          targetGrade: Number(entry.targetGrade ?? 0),
          completedAt: entry.completedAt ?? new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.error("Error loading history:", err);
      setHistoryEntries([]);
    }
  }, [historyStorageKey]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => fetchHistory();
    window.addEventListener("history-updated", handler);
    return () => window.removeEventListener("history-updated", handler);
  }, [fetchHistory]);

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

  /* ---------------------- Mark Notification as Read ---------------------- */
  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/mark-as-read/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  /* ---------------------- Mark All as Read ---------------------- */
  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user?.email })
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  /* ---------------------- Delete Notification ---------------------- */
  const deleteNotification = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/delete/${notificationId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
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
          target_grade: newSubject.target_grade,
          color: newSubject.color,
          components: newSubject.components,
          user_email: user.email,
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
                className={`capitalize font-medium transition relative ${
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {tab}
                {tab === "notifications" && unreadCount > 0 && (
                  <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
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
                const belowTarget = currentGrade > targetGrade;

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

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Notifications</h2>
                <div className="flex gap-2">
                  <button
                    onClick={sendTestEmail}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Test Email System
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Mark All as Read
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.93 4.93l9.07 9.07-9.07 9.07L4.93 4.93z" />
                  </svg>
                  <p className="text-lg">No notifications yet</p>
                  <p className="text-sm">You'll get notified about upcoming quizzes and assignments here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg transition-all ${
                        notification.read 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              notification.type === 'quiz' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : notification.type === 'exam'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {notification.type.toUpperCase()}
                            </span>
                            {!notification.read && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                                NEW
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg mb-1">{notification.title}</h3>
                          <p className="text-gray-700 mb-2">{notification.message}</p>
                          {notification.subjectName && (
                            <p className="text-sm text-gray-600 mb-1">
                              Subject: <span className="font-medium">{notification.subjectName}</span>
                            </p>
                          )}
                          {notification.dueDate && (
                            <p className="text-sm text-gray-600">
                              Due: <span className="font-medium">{new Date(notification.dueDate).toLocaleDateString()}</span>
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Grade History</h2>
              {historyEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg">No completed courses yet</p>
                  <p className="text-sm">Use “Finish course” inside a subject to log it here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-500 uppercase text-xs border-b">
                        <th className="py-2 pr-4">Subject</th>
                        <th className="py-2 pr-4">Target Grade</th>
                        <th className="py-2 pr-4">Raw Grade</th>
                        <th className="py-2">Finished</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyEntries.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-b-0">
                          <td className="py-3 pr-4 font-medium text-gray-900">{entry.subjectName}</td>
                          <td className="py-3 pr-4">{entry.targetGrade.toFixed(2)}</td>
                          <td className="py-3 pr-4">{entry.rawGrade.toFixed(2)}%</td>
                          <td className="py-3 text-gray-600">
                            {new Date(entry.completedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ADD SUBJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/30 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-[500px] p-6">
            <div className="h-6 rounded-t-xl" style={{ backgroundColor: newSubject.color }} />
            <h2 className="text-xl font-bold mb-4 text-center">Add  t</h2>

            {/* Subject Name */}
            <input
              type="text"
              placeholder="Subject name"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value.slice(0, 50) })}
              maxLength={50}
              className="w-full p-2 border rounded mb-3"
            />

            {/* Type */}
            <select
              value={newSubject.is_major ? "major" : "minor"}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
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
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setNewSubject({ ...newSubject, target_grade: parseFloat(e.target.value) })
              }
              className="w-full p-2 border rounded mb-3"
            >
              <option value={0}>Select Target Grade</option>
              <option value={1.00}>1.00 - Excellent</option>
              <option value={1.25}>1.25 - Superior</option>
              <option value={1.50}>1.50 - Very Good</option>
              <option value={1.75}>1.75 - Good</option>
              <option value={2.00}>2.00 - Satisfactory</option>
              <option value={2.25}>2.25 - Fairly Satisfactory</option>
              <option value={2.50}>2.50 - Fair</option>
              <option value={2.75}>2.75 - Passable</option>
              <option value={3.00}>3.00 - Passing</option>
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const updated = [...newSubject.components];
                      updated[i].name = e.target.value;
                      setNewSubject({ ...newSubject, components: updated });
                    }}
                  />
                  <NumberInput
                    value={c.percentage}
                    onChange={(value: number) => {
                      const updated = [...newSubject.components];
                      updated[i].percentage = value;
                      setNewSubject({ ...newSubject, components: updated });
                    }}
                    min={0}
                    max={100}
                    className="w-20 p-1 border rounded"
                  />
                  <NumberInput
                    value={c.priority}
                    onChange={(value: number) => {
                      const updated = [...newSubject.components];
                      updated[i].priority = value;
                      setNewSubject({ ...newSubject, components: updated });
                    }}
                    min={0}
                    maxDigits={4}
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
                maxLength={80}
                value={newComponent.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setNewComponent({ ...newComponent, name: e.target.value.slice(0, 80) })
                }
              />
              <NumberInput
                placeholder="%"
                value={newComponent.percentage}
                onChange={(value: number) =>
                  setNewComponent({ ...newComponent, percentage: value })
                }
                min={0}
                max={100}
                className="w-20 p-2 border rounded"
              />
              <NumberInput
                placeholder="P"
                value={newComponent.priority}
                onChange={(value: number) =>
                  setNewComponent({ ...newComponent, priority: value })
                }
                min={0}
                maxDigits={4}
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