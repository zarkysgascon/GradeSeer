"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

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

// RAW GRADE: Only calculates based on items that have actual scores (no assumptions)
function computeRawComponentGrade(items: ItemInput[]): number {
  if (!items || items.length === 0) return 0

  const validItems = items.filter((item) => 
    item.score !== null && item.score !== undefined && 
    item.max !== null && item.max !== undefined && 
    item.max > 0
  )
  
  if (validItems.length === 0) return 0

  const totalScore = validItems.reduce((sum, item) => sum + (item.score || 0), 0)
  const totalMax = validItems.reduce((sum, item) => sum + (item.max || 0), 0)

  return totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(2)) : 0
}

// PROJECTED GRADE: Assumes all incomplete items will get passing scores (75%)
function computeProjectedComponentGrade(items: ItemInput[]): number {
  if (!items || items.length === 0) return 0

  const passingScorePercentage = 75 // Default passing score assumption

  let totalScore = 0
  let totalMax = 0

  items.forEach((item) => {
    if (item.max !== null && item.max !== undefined && item.max > 0) {
      const hasScore = item.score !== null && item.score !== undefined
      const itemScore = hasScore ? item.score! : (passingScorePercentage / 100) * item.max
      
      totalScore += itemScore
      totalMax += item.max
    }
  })

  return totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(2)) : 0
}

function computeRawGrade(components: ComponentInput[]): number {
  if (!components || components.length === 0) return 0

  let totalWeightedGrade = 0
  let totalWeight = 0

  components.forEach((component) => {
    const componentGrade = computeRawComponentGrade(component.items || [])
    totalWeightedGrade += componentGrade * (component.percentage / 100)
    totalWeight += component.percentage / 100
  })

  return totalWeight > 0 ? Number((totalWeightedGrade / totalWeight).toFixed(2)) : 0
}

function computeProjectedGrade(components: ComponentInput[]): number {
  if (!components || components.length === 0) return 0

  let totalWeightedGrade = 0
  let totalWeight = 0

  components.forEach((component) => {
    const componentGrade = computeProjectedComponentGrade(component.items || [])
    totalWeightedGrade += componentGrade * (component.percentage / 100)
    totalWeight += component.percentage / 100
  })

  return totalWeight > 0 ? Number((totalWeightedGrade / totalWeight).toFixed(2)) : 0
}

// Convert percentage grade to 1.0-5.0 scale (Philippine System)
function percentageToGradeScale(percentage: number): number {
  if (percentage >= 98) return 1.0
  if (percentage >= 95) return 1.25
  if (percentage >= 92) return 1.5
  if (percentage >= 89) return 1.75
  if (percentage >= 86) return 2.0
  if (percentage >= 83) return 2.25
  if (percentage >= 80) return 2.5
  if (percentage >= 77) return 2.75
  if (percentage >= 74) return 3.0
  if (percentage >= 71) return 3.25
  if (percentage >= 68) return 3.5
  if (percentage >= 65) return 3.75
  if (percentage >= 60) return 4.0
  return 5.0 // Below 60% is failing (5.00)
}

// Calculate target score needed to reach passing threshold
function calculateTargetScoreForPassing(
  component: ComponentInput, 
  currentItem: ItemInput, 
  passingThreshold: number
): number | null {
  if (!currentItem.max || currentItem.max <= 0) return null

  const currentItems = component.items || []
  const otherItems = currentItems.filter(item => item.id !== currentItem.id)
  
  // Calculate current total from other items
  const otherValidItems = otherItems.filter(item => item.score !== null && item.max !== null && item.max! > 0)
  const otherTotalScore = otherValidItems.reduce((sum, item) => sum + (item.score || 0), 0)
  const otherTotalMax = otherValidItems.reduce((sum, item) => sum + (item.max || 0), 0)

  // Calculate required score for this item to reach passing threshold
  const totalMax = otherTotalMax + currentItem.max
  const requiredTotalScore = (passingThreshold / 100) * totalMax
  const requiredItemScore = requiredTotalScore - otherTotalScore

  // Return the minimum score needed (at least 0, at most max score)
  return Math.max(0, Math.min(currentItem.max, Math.ceil(requiredItemScore)))
}

/* -------------------- AI Service -------------------- */
class AIService {
  private apiKey: string = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  private getFallbackSuggestions(subject: Subject, effectivePassingMark: number): string {
    const strugglingComponents = subject.components
      .filter(comp => {
        const grade = computeRawComponentGrade(comp.items || [])
        return grade < effectivePassingMark
      })
      .map(comp => `${comp.name} (${comp.percentage}% weight - current: ${computeRawComponentGrade(comp.items || [])}%)`)

    const strongComponents = subject.components
      .filter(comp => {
        const grade = computeRawComponentGrade(comp.items || [])
        return grade >= effectivePassingMark
      })
      .map(comp => comp.name)

    let suggestions = "📊 **Grade Analysis**\n\n"

    if (strugglingComponents.length > 0) {
      suggestions += `🎯 **Focus Areas:**\n${strugglingComponents.map(comp => `• ${comp}`).join('\n')}\n\n`
      suggestions += `💡 **Study Strategy:**\n• Prioritize ${strugglingComponents[0].split(' (')[0]} as it has the most impact\n`
      suggestions += `• Aim for at least ${effectivePassingMark}% on upcoming assessments\n`
      suggestions += `• Review completed items to identify patterns in mistakes\n\n`
    } else {
      suggestions += "✅ **Great job!** You're passing all components.\n\n"
    }

    if (strongComponents.length > 0) {
      suggestions += `🌟 **Strong Areas:** ${strongComponents.join(', ')}\n\n`
    }

    suggestions += `📈 **General Tips:**\n• Complete all missing assignments\n• Focus on high-weightage components first\n• Set specific target scores for each component\n• Review materials regularly`

    return suggestions
  }

  async getStudySuggestions(subject: Subject, rawPercentage: number, projectedPercentage: number, effectivePassingMark: number): Promise<string> {
    try {
      // Check if API key is configured
      if (!this.apiKey || this.apiKey === '') {
        console.log('No API key found, using fallback suggestions')
        return this.getFallbackSuggestions(subject, effectivePassingMark)
      }

      // Check if API key looks valid (starts with AIza)
      if (!this.apiKey.startsWith('AIza')) {
        console.log('Invalid API key format, using fallback')
        return this.getFallbackSuggestions(subject, effectivePassingMark)
      }

      const componentAnalysis = subject.components.map(comp => {
        const rawGrade = computeRawComponentGrade(comp.items || [])
        const projectedGrade = computeProjectedComponentGrade(comp.items || [])
        return {
          name: comp.name,
          weight: comp.percentage,
          currentGrade: rawGrade,
          projectedGrade: projectedGrade,
          isPassing: rawGrade >= effectivePassingMark,
          itemsCount: comp.items?.length || 0,
          scoredItems: comp.items?.filter(item => item.score !== null && item.score !== undefined).length || 0
        }
      })

      const prompt = `
As an academic advisor, analyze this student's performance and provide specific, actionable study suggestions:

SUBJECT: ${subject.name}
CURRENT GRADE: ${rawPercentage}% (${percentageToGradeScale(rawPercentage)})
PROJECTED GRADE: ${projectedPercentage}% (${percentageToGradeScale(projectedPercentage)})
TARGET GRADE: ${subject.target_grade || 'Not set'}
PASSING MARK: ${effectivePassingMark}%

COMPONENT BREAKDOWN:
${componentAnalysis.map(comp => `
- ${comp.name} (${comp.weight}% weight):
  * Current: ${comp.currentGrade}% ${comp.currentGrade >= effectivePassingMark ? '✅ PASSING' : '❌ NEEDS IMPROVEMENT'}
  * Projected: ${comp.projectedGrade}%
  * Completion: ${comp.scoredItems}/${comp.itemsCount} items scored
`).join('')}

Please provide:
1. 2-3 most important focus areas
2. Specific study strategies for struggling components
3. Time allocation recommendations based on component weights
4. Practical tips to improve grades
5. Encouraging but realistic outlook

Keep response concise, practical, and focused on actionable advice. Use bullet points and be encouraging.`

      console.log('Sending request to Gemini API...')
      
      // Try the most common model names
      const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.0-pro',
        'gemini-pro'
      ];

      for (const modelName of modelsToTry) {
        try {
          console.log(`Trying model: ${modelName}`)
          const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${this.apiKey}`
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
              }
            })
          })

          if (response.ok) {
            const data = await response.json()
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
              console.log(`✅ Success with model: ${modelName}`)
              return data.candidates[0].content.parts[0].text
            }
          } else {
            console.log(`Model ${modelName} failed: ${response.status}`)
          }
        } catch (error) {
          console.log(`Model ${modelName} error:`, error)
          continue
        }
      }

      // If all models fail, use fallback
      console.log('All models failed, using fallback suggestions')
      return this.getFallbackSuggestions(subject, effectivePassingMark)

    } catch (error) {
      console.error('AI analysis failed:', error)
      // Return fallback suggestions instead of error message
      return this.getFallbackSuggestions(subject, effectivePassingMark)
    }
  }
}

const aiService = new AIService()

export default function SubjectDetail() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user as { email?: string } | undefined

  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
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
  
  // Editing states
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editScore, setEditScore] = useState<number | null>(null)
  const [editMax, setEditMax] = useState<number | null>(null)
  
  // Subject name editing
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState("")
  const [renamingSubject, setRenamingSubject] = useState(false)

  // Component editing
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null)
  const [editingComponentName, setEditingComponentName] = useState("")
  const [editingComponentPercentage, setEditingComponentPercentage] = useState(0)
  const [updatingComponent, setUpdatingComponent] = useState(false)

  // Target grade editing
  const [isEditingTargetGrade, setIsEditingTargetGrade] = useState(false)
  const [editingTargetGrade, setEditingTargetGrade] = useState<number | null>(null)
  const [updatingTargetGrade, setUpdatingTargetGrade] = useState(false)

  // Item editing modal
  const [showEditItemModal, setShowEditItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemInput | null>(null)
  const [editingItemComponentId, setEditingItemComponentId] = useState<string | null>(null)

  // Dropdown menu state
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null)

  // AI States
  const [aiMessage, setAiMessage] = useState<string>("")
  const [aiLoading, setAiLoading] = useState(false)

  // Finishing course state
  const [finishingCourse, setFinishingCourse] = useState(false)

  // Local storage helpers
  const localKey = typeof id === "string" ? `grades:subject:${id}` : `grades:subject:${String(id)}`
  const historyStorageKey = user?.email ? `gradeHistory:${user.email}` : "gradeHistory:guest";

  const loadLocalEdits = (): Record<string, { score: number | null; max: number | null }> => {
    try {
      const raw = localStorage.getItem(localKey)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") return parsed
      return {}
    } catch {
      return {}
    }
  }

  const saveLocalEdit = (itemId: string, values: { score: number | null; max: number | null }) => {
    const current = loadLocalEdits()
    current[itemId] = values
    localStorage.setItem(localKey, JSON.stringify(current))
  }

  const appendHistoryEntry = (entry: {
    id: string;
    subjectName: string;
    rawGrade: number;
    targetGrade: number;
    completedAt: string;
  }) => {
    if (typeof window === "undefined") return;
    try {
      const existingRaw = localStorage.getItem(historyStorageKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const normalized = Array.isArray(existing) ? existing : [];
      localStorage.setItem(historyStorageKey, JSON.stringify([entry, ...normalized]));
      window.dispatchEvent(new Event("history-updated"));
    } catch (err) {
      console.error("Failed to cache history entry:", err);
    }
  }

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
        // Apply local (front-end) edits if present
        const localEdits = loadLocalEdits()
        const patched: Subject = {
          ...data,
          components: (data.components || []).map((comp: ComponentInput) => ({
            ...comp,
            items: (comp.items || []).map((it: ItemInput) => {
              const key = String(it.id ?? "")
              const override = localEdits[key]
              if (!override) return it
              return {
                ...it,
                score: override.score,
                max: override.max ?? it.max ?? null,
              }
            }),
          })),
        }
        setSubject(patched)
        setEditingTargetGrade(data.target_grade ? parseFloat(data.target_grade) : null)
      } catch (err) {
        console.error("Subject fetch failed:", err)
        setSubject(null)
      } finally {
        setLoading(false
        )
      }
    }

    fetchSubject()
  }, [id])

  useEffect(() => {
    if (subject?.name) setEditingName(subject.name)
    if (subject?.target_grade) setEditingTargetGrade(parseFloat(subject.target_grade.toString()))
  }, [subject?.name, subject?.target_grade])

  // Force refresh when target grade changes
  useEffect(() => {
    if (subject) {
      // This triggers re-renders for all components that depend on target_grade
      setSubject(prev => prev ? { ...prev } : null)
    }
  }, [subject?.target_grade])

  /* -------------------- AI Function -------------------- */
  const handleGetAISuggestions = async () => {
    if (!subject) return

    setAiLoading(true)
    setAiMessage("")
    
    try {
      const rawPercentage = computeRawGrade(subject.components)
      const projectedPercentage = computeProjectedGrade(subject.components)
      const targetGrade = subject.target_grade ? Number.parseFloat(subject.target_grade.toString()) : 0
      const effectivePassingMark = targetGrade > 0 ? 
        Math.max(75, (3.0 - targetGrade) * 25 + 50) : 75

      const suggestions = await aiService.getStudySuggestions(
        subject, 
        rawPercentage, 
        projectedPercentage, 
        effectivePassingMark
      )
      
      setAiMessage(suggestions)
    } catch (error) {
      console.error('AI suggestions failed:', error)
      setAiMessage("Sorry, I couldn't generate suggestions right now. Please try again later.")
    } finally {
      setAiLoading(false)
    }
  }

  /* -------------------- Rename Subject -------------------- */
  const handleRenameSubject = async () => {
    if (!subject?.id) return
    const trimmedName = editingName.trim()
    if (!trimmedName) {
      alert("Subject name is required.")
      return
    }
    if (trimmedName === subject.name) {
      setIsEditingName(false)
      return
    }

    setRenamingSubject(true)
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Rename failed")
      }

      // Update local state immediately
      setSubject(prev => prev ? { ...prev, name: trimmedName } : null)
      setIsEditingName(false)
    } catch (err) {
      console.error("Subject rename failed:", err)
      alert("Failed to rename subject.")
    } finally {
      setRenamingSubject(false)
    }
  }

  /* -------------------- Update Target Grade -------------------- */
  const handleUpdateTargetGrade = async () => {
    if (!subject?.id) return

    // Validate target grade
    if (editingTargetGrade === null || editingTargetGrade < 1.0 || editingTargetGrade > 5.0) {
      alert("Target grade must be between 1.0 and 5.0")
      return
    }

    setUpdatingTargetGrade(true)
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          target_grade: editingTargetGrade?.toString(),
          name: subject.name // Include the name to satisfy API validation
        }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Target grade update failed")
      }

      // Update local state immediately - this triggers the useEffect above
      setSubject(prev => prev ? { 
        ...prev, 
        target_grade: editingTargetGrade 
      } : null)
      
      setIsEditingTargetGrade(false)
    } catch (err) {
      console.error("Target grade update failed:", err)
      alert("Failed to update target grade.")
    } finally {
      setUpdatingTargetGrade(false)
    }
  }

  /* -------------------- Update Component -------------------- */
  const handleUpdateComponent = async (componentId: string) => {
    if (!subject?.id) return
    const trimmedName = editingComponentName.trim()
    if (!trimmedName) {
      alert("Component name is required.")
      return
    }

    setUpdatingComponent(true)
    try {
      const res = await fetch(`/api/components/${componentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: trimmedName,
          percentage: editingComponentPercentage 
        }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Component update failed")
      }

      // Update local state immediately
      setSubject(prev => {
        if (!prev) return prev
        return {
          ...prev,
          components: prev.components.map(comp => 
            comp.id === componentId 
              ? { ...comp, name: trimmedName, percentage: editingComponentPercentage }
              : comp
          )
        }
      })
      setEditingComponentId(null)
    } catch (err) {
      console.error("Component update failed:", err)
      alert("Failed to update component.")
    } finally {
      setUpdatingComponent(false)
    }
  }

  /* -------------------- Open Edit Item Modal -------------------- */
  const handleOpenEditItemModal = (item: ItemInput, componentId: string) => {
    setEditingItem(item)
    setEditingItemComponentId(componentId)
    setShowEditItemModal(true)
    setDropdownOpenId(null)
  }

  /* -------------------- Update Item -------------------- */
  const handleUpdateItem = async () => {
    if (!editingItem || !editingItemComponentId || !subject?.id) return

    const trimmedName = editingItem.name.trim()
    if (!trimmedName) {
      alert("Item name is required.")
      return
    }

    setSavingItem(true)
    try {
      const res = await fetch(`/api/items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          score: editingItem.score,
          max: editingItem.max,
          date: editingItem.date,
          target: editingItem.target,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        
        // Update local state immediately
        setSubject(prev => {
          if (!prev) return prev
          return {
            ...prev,
            components: prev.components.map(comp => 
              comp.id === editingItemComponentId
                ? {
                    ...comp,
                    items: (comp.items || []).map(it =>
                      it.id === editingItem.id ? { ...editingItem, name: trimmedName } : it
                    )
                  }
                : comp
            )
          }
        })
        
        setShowEditItemModal(false)
        setEditingItem(null)
        setEditingItemComponentId(null)
      } else {
        const errorData = await res.json()
        alert(`Failed to update item: ${errorData.error || "Unknown error"}`)
      }
    } catch (err) {
      console.error("Error updating item:", err)
      alert("Error updating item.")
    } finally {
      setSavingItem(false)
    }
  }

  /* -------------------- Update Item Score/Max -------------------- */
  const handleUpdateItemScore = async (itemId: string, score: number | null, max: number | null) => {
    if (!subject?.id) return

    // Validation
    if (max !== null && max <= 0) {
      alert("Max must be greater than 0")
      return
    }
    if (score !== null && max !== null && score > max) {
      alert("Score cannot exceed Max")
      return
    }

    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          score: score !== null ? Number(score) : null, 
          max: max !== null ? Number(max) : null 
        }),
      })

      if (res.ok) {
        const result = await res.json()
        
        // Update local state immediately for better UX
        setSubject((prev) => {
          if (!prev) return prev
          const updated: Subject = {
            ...prev,
            components: prev.components.map((comp) => ({
              ...comp,
              items: (comp.items || []).map((it) =>
                String(it.id) === String(itemId)
                  ? { 
                      ...it, 
                      score: score, 
                      max: max ?? it.max ?? null 
                    }
                  : it
              ),
            })),
          }
          return updated
        })

        // Save to local storage
        saveLocalEdit(String(itemId), { score, max })
        
        setEditingItemId(null)
        setEditScore(null)
        setEditMax(null)
      } else {
        const errorData = await res.json()
        throw new Error(errorData.error || "Item update failed")
      }
    } catch (err) {
      console.error("Item score update failed:", err)
      alert("Failed to update item score.")
    }
  }

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
        const result = await res.json()
        
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

  /* -------------------- Delete Item -------------------- */
  const handleDeleteItem = async (itemId: string) => {
    if (!subject?.id) return

    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        const res = await fetch(`/api/items/${itemId}`, {
          method: "DELETE",
        })

        if (res.ok) {
          // Update local state immediately
          setSubject(prev => {
            if (!prev) return prev
            return {
              ...prev,
              components: prev.components.map(comp => ({
                ...comp,
                items: (comp.items || []).filter(it => it.id !== itemId)
              }))
            }
          })
        } else {
          const errorData = await res.json()
          alert(`Failed to delete item: ${errorData.error}`)
        }
      } catch (err) {
        console.error("Error deleting item:", err)
        alert("Error deleting item.")
      }
    }
    setDropdownOpenId(null)
  }

  /* -------------------- Progress Calculation -------------------- */
  const calculateComponentProgress = (component: ComponentInput) => {
    const grade = computeRawComponentGrade(component.items || [])
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

  // Calculate both grades
  const rawPercentage = computeRawGrade(subject.components)
  const projectedPercentage = computeProjectedGrade(subject.components)
  const rawGrade = percentageToGradeScale(rawPercentage)
  const projectedGrade = percentageToGradeScale(projectedPercentage)
  
  const targetGrade = subject.target_grade ? Number.parseFloat(subject.target_grade.toString()) : 0
  const passingMark = 75
  const effectivePassingMark = targetGrade > 0 ? Math.max(passingMark, (3.0 - targetGrade) * 25 + 50) : passingMark

  const handleFinishCourse = async () => {
    if (!subject) return
    setFinishingCourse(true)
    try {
      const completedAt = new Date().toISOString()
      const completionEntry = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${subject.id}-${Date.now()}`,
        subjectName: subject.name,
        rawGrade: rawPercentage,
        targetGrade,
        completedAt,
      }
      appendHistoryEntry(completionEntry)
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          rawGrade: rawPercentage,
          targetGrade,
          completedAt,
          userEmail: user?.email ?? null,
        }),
      })
      if (res.ok) {
        alert("Course saved to history.")
      } else {
        console.warn("History API not ready:", await res.text())
      }
    } catch (err) {
      console.error("Finish course failed:", err)
      alert("Failed to finish course.")
    } finally {
      setFinishingCourse(false)
    }
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-gray-100 p-10 flex justify-center">
      {/* MAIN MODAL CARD */}
      <div className="bg-white w-[1100px] rounded-3xl shadow-2xl p-8">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-400 p-8 rounded-2xl text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubject()
                    if (e.key === "Escape") {
                      setIsEditingName(false)
                      setEditingName(subject?.name || "")
                    }
                  }}
                  autoFocus
                  className="text-3xl font-bold px-3 py-1 rounded-lg bg-white text-gray-900"
                />
                <button
                  type="button"
                  onClick={handleRenameSubject}
                  disabled={renamingSubject || !editingName.trim() || editingName.trim() === subject?.name}
                  className="px-3 py-1 bg-white/20 rounded text-sm font-semibold disabled:opacity-50"
                >
                  {renamingSubject ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false)
                    setEditingName(subject?.name || "")
                  }}
                  className="px-3 py-1 bg-white/10 rounded text-sm font-semibold"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">{subject.name}</h1>
                <button
                  type="button"
                  aria-label="Rename subject"
                  onClick={() => {
                    setEditingName(subject.name)
                    setIsEditingName(true)
                  }}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* UPDATED HEADER SECTION */}
          <div className="flex items-center gap-8">
            {/* Grade Metrics with Icons */}
            <div className="flex gap-8 text-center">
              {/* Target Grade with Icon - Now Editable */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center border-2 border-white/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm">Target Grade</div>
                  {isEditingTargetGrade ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.25"
                        min="1.0"
                        max="5.0"
                        value={editingTargetGrade || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null
                          // Round to nearest 0.25 increment
                          if (value !== null) {
                            const roundedValue = Math.round(value * 4) / 4
                            setEditingTargetGrade(roundedValue)
                          } else {
                            setEditingTargetGrade(null)
                          }
                        }}
                        className="w-20 text-2xl font-bold bg-white/20 border border-white/30 rounded px-1 text-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateTargetGrade()
                          if (e.key === "Escape") {
                            setIsEditingTargetGrade(false)
                            setEditingTargetGrade(subject.target_grade ? parseFloat(subject.target_grade.toString()) : null)
                          }
                        }}
                      />
                      <button
                        onClick={handleUpdateTargetGrade}
                        disabled={updatingTargetGrade}
                        className="text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1"
                      >
                        {updatingTargetGrade ? "Saving" : "✓"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingTargetGrade(false)
                          setEditingTargetGrade(subject.target_grade ? parseFloat(subject.target_grade.toString()) : null)
                        }}
                        className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">{targetGrade.toFixed(2)}</div>
                      <button
                        type="button"
                        aria-label="Edit target grade"
                        onClick={() => {
                          setEditingTargetGrade(subject.target_grade ? parseFloat(subject.target_grade.toString()) : null)
                          setIsEditingTargetGrade(true)
                        }}
                        className="p-1 text-white/70 hover:text-white transition"
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
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Projected Grade with Icon */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center border-2 border-white/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm">Projected Grade</div>
                  <div className="text-2xl font-bold">{projectedGrade.toFixed(2)}</div>
                  <div className="text-xs opacity-80">
                    {projectedPercentage.toFixed(1)}%
                    {projectedPercentage > 0 && (
                      <span className="ml-1">(with 75% on missing scores)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw Grade with Icon */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center border-2 border-white/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm">Raw Grade</div>
                  <div className="text-2xl font-bold">{rawGrade.toFixed(2)}</div>
                  <div className="text-xs opacity-80">
                    {rawPercentage.toFixed(1)}%
                    {rawPercentage > 0 && (
                      <span className="ml-1">(only scored items)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of your component remains the same... */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column - Components */}
          <div className="lg:col-span-2 space-y-6">
            {/* Components List */}
            {subject.components.map((component) => {
              const componentProgress = calculateComponentProgress(component)

              return (
                <div key={component.id} className="bg-white rounded-xl border border-gray-300 p-6">
                  {/* Component Header - Editable */}
                  <div className="flex justify-between items-start mb-4">
                    {editingComponentId === component.id ? (
                      <div className="flex items-center gap-3">
                        <input
                          value={editingComponentName}
                          onChange={(e) => setEditingComponentName(e.target.value)}
                          className="text-xl font-semibold px-2 py-1 border rounded"
                          autoFocus
                        />
                        <input
                          type="number"
                          value={editingComponentPercentage}
                          onChange={(e) => setEditingComponentPercentage(Number(e.target.value))}
                          className="w-20 text-lg font-medium px-2 py-1 border rounded"
                          min="0"
                          max="100"
                        />
                        <span className="text-lg text-gray-700">%</span>
                        <button
                          onClick={() => handleUpdateComponent(component.id)}
                          disabled={updatingComponent}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-400"
                        >
                          {updatingComponent ? "Saving" : "✓"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingComponentId(null)
                            setEditingComponentName("")
                            setEditingComponentPercentage(0)
                          }}
                          className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-semibold text-gray-900">{component.name}</h2>
                          <button
                            onClick={() => {
                              setEditingComponentId(component.id)
                              setEditingComponentName(component.name)
                              setEditingComponentPercentage(component.percentage)
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600 transition"
                            title="Edit component"
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
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                            {component.percentage}%
                          </span>
                          <span className="text-sm text-gray-600">{componentProgress.grade}%</span>
                        </div>
                      </>
                    )}
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
                    {(component.items ?? []).map((item, itemIndex) => {
                      const targetScore = calculateTargetScoreForPassing(component, item, effectivePassingMark)
                      
                      return (
                      <div
                        key={itemIndex}
                        className="grid grid-cols-4 gap-4 py-2 border-b border-gray-200 last:border-b-0 items-start"
                      >
                        {/* Item Name */}
                        <div>
                          <div className="text-sm text-gray-500">Name</div>
                          <div className="font-medium">
                            {item.name || "—"}
                          </div>
                        </div>

                        {/* Score - Editable */}
                        <div className="relative">
                          <div className="text-sm text-gray-500">Score</div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">
                              {item.score ?? "—"} / {item.max ?? "—"}
                            </span>
                            {editingItemId === String(item.id) && (
                              <div
                                className="absolute left-0 top-full z-20 mt-1 w-max min-w-[260px] p-3 rounded-md border border-gray-200 bg-white shadow-lg flex items-center gap-2"
                                role="dialog"
                              >
                                <input
                                  type="number"
                                  className="w-16 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={editScore ?? ""}
                                  onChange={(e) =>
                                    setEditScore(e.target.value === "" ? null : Number.parseInt(e.target.value))
                                  }
                                  placeholder="score"
                                  min={0}
                                />
                                <span className="text-gray-500">/</span>
                                <input
                                  type="number"
                                  className="w-16 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={editMax ?? ""}
                                  onChange={(e) =>
                                    setEditMax(e.target.value === "" ? null : Number.parseInt(e.target.value))
                                  }
                                  placeholder="max"
                                  min={1}
                                />
                                <button
                                  onClick={() => {
                                    const s = editScore ?? null
                                    const m = editMax ?? null
                                    if (m !== null && m <= 0) {
                                      alert("Max must be greater than 0")
                                      return
                                    }
                                    if (s !== null && m !== null && s > m) {
                                      alert("Score cannot exceed Max")
                                      return
                                    }
                                    
                                    handleUpdateItemScore(String(item.id), s, m)
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingItemId(null)
                                    setEditScore(null)
                                    setEditMax(null)
                                  }}
                                  className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Date */}
                        <div>
                          <div className="text-sm text-gray-500">Date</div>
                          <div className="font-medium">
                            {item.date || "—"}
                          </div>
                        </div>

                        {/* Target Score and Actions */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-500">Target</div>
                            <div className="font-medium">
                              {targetScore !== null ? 
                                `${targetScore}/${item.max}` : 
                                "Not Set Yet"
                              }
                            </div>
                          </div>
                          
                          {/* Dropdown Edit Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setDropdownOpenId(dropdownOpenId === String(item.id) ? null : String(item.id))}
                              className="p-1 text-gray-500 hover:text-blue-600 transition"
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
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>

                            {dropdownOpenId === String(item.id) && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-30">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setEditingItemId(String(item.id))
                                      setEditScore(item.score ?? null)
                                      setEditMax(item.max ?? null)
                                      setDropdownOpenId(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                                      className="mr-2"
                                    >
                                      <path d="M12 20h9" />
                                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                    </svg>
                                    Edit Score
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditItemModal(item, component.id)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                                      className="mr-2"
                                    >
                                      <path d="M12 20h9" />
                                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                    </svg>
                                    Edit Item
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(String(item.id))}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
                                      className="mr-2"
                                    >
                                      <path d="M3 6h18"></path>
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    </svg>
                                    Delete Item
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )})}

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
            {/* Component Progress Bar Graph */}
            <div className="bg-white rounded-xl border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Component Progress</h3>
              <div className="space-y-4">
                {subject.components.map((component, index) => {
                  const componentProgress = calculateComponentProgress(component)
                  
                  const isPassing = componentProgress.grade >= effectivePassingMark
                  
                  return (
                    <div key={component.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{component.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{componentProgress.grade.toFixed(0)}%</span>
                          {isPassing ? (
                            <div className="w-2 h-2 rounded-full bg-green-500" title="Passing"></div>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-red-500" title="Not Passing"></div>
                          )}
                        </div>
                      </div>
                      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        {/* Passing threshold indicator */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10"
                          style={{ left: `${effectivePassingMark}%` }}
                          title={`Passing Threshold (${effectivePassingMark}%)`}
                        ></div>
                        {/* Progress bar */}
                        <div
                          className="h-full rounded-full transition-all relative z-20"
                          style={{ 
                            width: `${componentProgress.grade}%`,
                            backgroundColor: componentProgress.grade >= effectivePassingMark ? '#10B981' : '#EF4444'
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Current: {componentProgress.grade.toFixed(1)}%</span>
                        <span>Passing: {effectivePassingMark}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex justify-between mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Passing (≥{effectivePassingMark}%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>Not Passing</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400 text-center">
                {targetGrade > 0 ? 
                  `Passing mark adjusted for target grade ${targetGrade.toFixed(2)}` : 
                  "Using default 75% passing mark"
                }
              </div>
            </div>

            {/* AI Chatbox - NOW WORKING WITH GEMINI */}
            <div className="bg-white rounded-xl border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Study Assistant</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 8V4H8" />
                        <rect width="16" height="12" x="4" y="8" rx="2" />
                        <path d="M2 14h2" />
                        <path d="M20 14h2" />
                        <path d="M15 13v2" />
                        <path d="M9 13v2" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800">
                        Hi! I'm your AI study assistant powered by Gemini. I can analyze your current grades, 
                        identify focus areas, and provide personalized study suggestions based on your performance.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* AI Suggestions Button */}
                <div className="text-center">
                  <button
                    onClick={handleGetAISuggestions}
                    disabled={aiLoading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {aiLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing Your Grades...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        Get AI Study Suggestions
                      </>
                    )}
                  </button>
                </div>

                {/* AI Response */}
                {aiMessage && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3 h-3 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-green-800 whitespace-pre-wrap">{aiMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Tips */}
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-600 text-center">
                    I'll analyze your: current grades, component weights, target scores, and suggest personalized study strategies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BACK & FINISH BUTTONS */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between mt-8">
          <button
            onClick={handleFinishCourse}
            disabled={finishingCourse}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {finishingCourse ? "Saving..." : "Finish course"}
          </button>
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
                value={newItem.date || ""}
                onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
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

      {/* EDIT ITEM MODAL */}
      {showEditItemModal && editingItem && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/30 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6">
            <h2 className="text-xl font-bold mb-4 text-center">Edit Item</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                  <input
                    type="number"
                    placeholder="Score"
                    value={editingItem.score || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, score: e.target.value ? Number.parseInt(e.target.value) : null })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    placeholder="Max Score"
                    value={editingItem.max || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, max: e.target.value ? Number.parseInt(e.target.value) : null })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editingItem.date || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  setShowEditItemModal(false)
                  setEditingItem(null)
                  setEditingItemComponentId(null)
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateItem}
                disabled={savingItem}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              >
                {savingItem ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}