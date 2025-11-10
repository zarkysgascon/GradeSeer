"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

/* -------------------- Types -------------------- */
interface ItemInput {
  id?: string
  name: string
  score?: number | null
  max?: number | null
  date?: string | null
  target?: number | null
}

interface ComponentInput {
  id: string
  name: string
  percentage: number
  priority: number
  grade?: number | null
  items?: ItemInput[]
}

interface Subject {
  id: string
  name: string
  target_grade?: number | null
  color: string
  components: ComponentInput[]
}

/* -------------------- Grade Computation -------------------- */
function computeComponentGrade(items: ItemInput[]): number {
  if (!items || items.length === 0) return 0

  const validItems = items.filter((item) => item.score !== null && item.max !== null && item.max > 0)
  if (validItems.length === 0) return 0

  const totalScore = validItems.reduce((sum, item) => sum + (item.score || 0), 0)
  const totalMax = validItems.reduce((sum, item) => sum + (item.max || 0), 0)

  return totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(2)) : 0
}

function computeCurrentGrade(components: ComponentInput[]) {
  if (!components || components.length === 0) return 0

  let totalWeightedGrade = 0
  let totalWeight = 0

  components.forEach((component) => {
    const componentGrade = computeComponentGrade(component.items || [])
    totalWeightedGrade += componentGrade * (component.percentage / 100)
    totalWeight += component.percentage / 100
  })

  return totalWeight > 0 ? Number((totalWeightedGrade / totalWeight).toFixed(2)) : 0
}

// Convert percentage grade to 1.0-3.0 scale
function percentageToGradeScale(percentage: number): number {
  if (percentage >= 97) return 3.0
  if (percentage >= 93) return 2.75
  if (percentage >= 89) return 2.5
  if (percentage >= 85) return 2.25
  if (percentage >= 81) return 2.0
  if (percentage >= 77) return 1.75
  if (percentage >= 73) return 1.5
  if (percentage >= 69) return 1.25
  if (percentage >= 65) return 1.0
  return 0.0
}

export default function SubjectDetail() {
  const { id } = useParams()
  const router = useRouter()

  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState("")
  const [inputMessage, setInputMessage] = useState("")
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<ItemInput>({
    name: "",
    score: null,
    max: null,
    date: "",
    target: null,
  })
  const [savingItem, setSavingItem] = useState(false)

  /* -------------------- Fetch Subject -------------------- */
  useEffect(() => {
    if (!id) return

    const fetchSubject = async () => {
      try {
        const res = await fetch(`/api/subjects/${id}`, {
          cache: "no-store",
        })

        if (!res.ok) {
          setSubject(null)
          return
        }

        const data = await res.json()
        setSubject(data)
      } catch (err) {
        console.error("Subject fetch failed:", err)
        setSubject(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSubject()
  }, [id])

  /* -------------------- Add Item -------------------- */
  const handleAddItem = async (componentId: string) => {
    if (!newItem.name.trim()) {
      alert("Item name is required!")
      return
    }

    setSavingItem(true)
    try {
      const res = await fetch(`/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component_id: componentId,
          name: newItem.name,
          score: newItem.score,
          max: newItem.max,
          date: newItem.date,
          target: newItem.target,
        }),
      })

      if (res.ok) {
        // Refresh the subject data to show the new item
        const updatedRes = await fetch(`/api/subjects/${id}`, {
          cache: "no-store",
        })
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json()
          setSubject(updatedData)
        }

        setShowAddItemModal(false)
        setNewItem({
          name: "",
          score: null,
          max: null,
          date: "",
          target: null,
        })
        setSelectedComponent(null)
      } else {
        const errorData = await res.json()
        alert(`Failed to add item: ${errorData.error}`)
      }
    } catch (err) {
      console.error("Error adding item:", err)
      alert("Error adding item.")
    } finally {
      setSavingItem(false)
    }
  }

  /* -------------------- Progress Calculation -------------------- */
  const calculateComponentProgress = (component: ComponentInput) => {
    const grade = computeComponentGrade(component.items || [])
    return {
      grade,
      scaledGrade: percentageToGradeScale(grade),
      progress: Math.min(100, grade),
    }
  }

  if (loading) return <div className="h-screen flex justify-center items-center text-xl">Loading…</div>

  if (!subject)
    return (
      <div className="h-screen flex flex-col justify-center items-center text-xl">
        <p>Subject not found</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-3 px-5 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Go Back
        </button>
      </div>
    )

  const currentPercentage = computeCurrentGrade(subject.components)
  const currentGrade = percentageToGradeScale(currentPercentage)
  const targetGrade = subject.target_grade ? Number.parseFloat(subject.target_grade.toString()) : 0

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-gray-100 p-10 flex justify-center">
      {/* MAIN MODAL CARD */}
      <div className="bg-white w-[1100px] rounded-3xl shadow-2xl p-8">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-400 p-8 rounded-2xl text-white flex justify-between items-center shadow-lg">
          <h1 className="text-3xl font-bold">{subject.name}</h1>

          <div className="flex gap-12 text-center">
            <div>
              <div className="text-sm">Target Grade</div>
              <div className="text-3xl font-bold">{targetGrade.toFixed(2)}</div>
            </div>

            <div>
              <div className="text-sm">Current Grade</div>
              <div className="text-3xl font-bold">{currentGrade.toFixed(2)}</div>
            </div>

            <div>
              <div className="text-sm">Progress</div>
              <div className="text-3xl font-bold">{currentPercentage}%</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column - Components */}
          <div className="lg:col-span-2 space-y-6">
            {/* Components List */}
            {subject.components.map((component) => {
              const componentProgress = calculateComponentProgress(component)

              return (
                <div key={component.id} className="bg-white rounded-xl border border-gray-300 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{component.name}</h2>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                        {component.percentage}%
                      </span>
                      <span className="text-sm text-gray-600">Grade: {componentProgress.scaledGrade.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Component Progress</span>
                      <span>{componentProgress.grade}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${componentProgress.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3 mb-4">
                    {(component.items ?? []).map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="grid grid-cols-4 gap-4 py-2 border-b border-gray-200 last:border-b-0"
                      >
                        <div>
                          <div className="text-sm text-gray-500">Name</div>
                          <div className="font-medium">{item.name || "—"}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Score</div>
                          <div className="font-medium">
                            {item.score ?? "—"}/{item.max ?? "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Date</div>
                          <div className="font-medium">{item.date || "—"}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-500">Target</div>
                            <div className="font-medium">{item.target ?? "—"}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              if (window.confirm("Are you sure you want to delete this item?")) {
                                fetch(`/api/items/${item.id}`, {
                                  method: "DELETE",
                                }).then(async (res) => {
                                  if (res.ok) {
                                    // Refresh the subject data to show updated items
                                    const updatedRes = await fetch(`/api/subjects/${id}`, {
                                      cache: "no-store",
                                    })
                                    if (updatedRes.ok) {
                                      const updatedData = await updatedRes.json()
                                      setSubject(updatedData)
                                    }
                                  } else {
                                    alert("Failed to delete item")
                                  }
                                })
                              }
                            }}
                            className="text-red-600 hover:text-red-800 p-1 rounded"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}

                    {(component.items ?? []).length === 0 && (
                      <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                        No items yet
                      </div>
                    )}
                  </div>

                  {/* Add Item Button */}
                  <button
                    onClick={() => {
                      setSelectedComponent(component.id)
                      setShowAddItemModal(true)
                    }}
                    className="w-full py-3 text-blue-600 font-medium rounded-lg border border-dashed border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
              )
            })}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Overall Progress Section */}
            <div className="bg-white rounded-xl border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Grade</span>
                    <span>
                      {currentGrade.toFixed(2)} / {targetGrade.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, (currentGrade / targetGrade) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {subject.components.map((component) => {
                    const progress = calculateComponentProgress(component)
                    return (
                      <div key={component.id} className="flex justify-between items-center text-sm">
                        <span className="truncate">{component.name}</span>
                        <span className="font-medium">{progress.scaledGrade.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Feedback Section */}
            <div className="bg-white rounded-xl border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h3>

              <div className="space-y-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <div className="text-sm text-gray-600">Add your feedback here</div>
                </div>

                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Feedback..."
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Import messages..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BACK BUTTON */}
        <div className="flex justify-end mt-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* ADD ITEM MODAL */}
      {showAddItemModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/30 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6">
            <h2 className="text-xl font-bold mb-4 text-center">Add New Item</h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Score"
                  value={newItem.score || ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, score: e.target.value ? Number.parseInt(e.target.value) : null })
                  }
                  className="p-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Max Score"
                  value={newItem.max || ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, max: e.target.value ? Number.parseInt(e.target.value) : null })
                  }
                  className="p-2 border rounded"
                />
              </div>
              <input
                type="date"
                value={newItem.date}
                onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Target"
                value={newItem.target || ""}
                onChange={(e) =>
                  setNewItem({ ...newItem, target: e.target.value ? Number.parseInt(e.target.value) : null })
                }
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  setShowAddItemModal(false)
                  setSelectedComponent(null)
                  setNewItem({
                    name: "",
                    score: null,
                    max: null,
                    date: "",
                    target: null,
                  })
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedComponent && handleAddItem(selectedComponent)}
                disabled={savingItem}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              >
                {savingItem ? "Saving..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
