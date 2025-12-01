"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Array, Order } from "effect"
import _ from "lodash"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import SubjectGraphModal from '@/app/components/SubjectGraphModal'
import CongratsModal from '@/app/components/CongratsModal'
import Backdrop from '@/app/components/Backdrop'

/* -------------------- Types -------------------- */
interface ItemInput {
  id?: string
  name: string
  score?: number | null
  max?: number | null
  date?: string | null
  target?: number | null
  topic?: string | null
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
  units?: number // ADDED: Units field
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ExtendedUser {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
}

/* -------------------- Helper Functions -------------------- */
function validateDate(dateString: string): boolean {
  if (!dateString) return false
  const parts = dateString.split('-')
  if (parts.length !== 3) return false
  const [yStr, mStr, dStr] = parts
  if (yStr.length !== 4) return false
  if (mStr.length < 1 || mStr.length > 2) return false
  if (dStr.length < 1 || dStr.length > 2) return false
  const year = Number(yStr)
  const month = Number(mStr)
  const day = Number(dStr)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  return true
}

/* -------------------- Grade Computation -------------------- */
function computeRawComponentGrade(items: ItemInput[]): number {
  if (!items || items.length === 0) return 0

  const validItems = Array.filter(items, (item) => 
    item.score !== null && item.score !== undefined && 
    item.max !== null && item.max !== undefined && 
    (item.max ?? 0) > 0
  )
  
  // use != null to check both null and undefined
  // Removed duplicate declaration of validItems
  if (validItems.length === 0) return 0

  const totalScore = _.sumBy(validItems, (item) => item.score ?? 0)
  const totalMax = _.sumBy(validItems, (item) => item.max ?? 0)

  return totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(2)) : 0
}

function computeProjectedComponentGrade(items: ItemInput[]): number {
  if (!items || items.length === 0) return 0

  const passingScorePercentage = 75

  const totals = _.reduce(items, (acc, item) => {
    if (item.max !== null && item.max !== undefined && item.max > 0) {
      const hasScore = item.score !== null && item.score !== undefined
      const itemScore = hasScore ? (item.score as number) : (passingScorePercentage / 100) * (item.max as number)
      return { totalScore: acc.totalScore + itemScore, totalMax: acc.totalMax + (item.max as number) }
    }
    return acc
  }, { totalScore: 0, totalMax: 0 })

  return totals.totalMax > 0 ? Number(((totals.totalScore / totals.totalMax) * 100).toFixed(2)) : 0
}

function computeRawGrade(components: ComponentInput[]): number {
  if (!components || components.length === 0) return 0

  const weights = _.reduce(components, (acc, component) => {
    const componentGrade = computeRawComponentGrade(component.items || [])
    return {
      totalWeightedGrade: acc.totalWeightedGrade + componentGrade * (component.percentage / 100),
      totalWeight: acc.totalWeight + component.percentage / 100
    }
  }, { totalWeightedGrade: 0, totalWeight: 0 })

  return weights.totalWeight > 0 ? Number((weights.totalWeightedGrade / weights.totalWeight).toFixed(2)) : 0
}

function computeProjectedGrade(components: ComponentInput[]): number {
  if (!components || components.length === 0) return 0

  const proj = _.reduce(components, (acc, component) => {
    const componentGrade = computeProjectedComponentGrade(component.items || [])
    return {
      totalWeightedGrade: acc.totalWeightedGrade + componentGrade * (component.percentage / 100),
      totalWeight: acc.totalWeight + component.percentage / 100
    }
  }, { totalWeightedGrade: 0, totalWeight: 0 })

  return proj.totalWeight > 0 ? Number((proj.totalWeightedGrade / proj.totalWeight).toFixed(2)) : 0
}

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
  return 5.0
}

function calculateTargetScoreForPassing(
  component: ComponentInput, 
  currentItem: ItemInput, 
  passingThreshold: number
): number | null {
  if (!currentItem.max || currentItem.max <= 0) return null

  const currentItems = component.items || []
  const otherItems = currentItems.filter(item => item.id !== currentItem.id)
  
  const otherValidItems = otherItems.filter(item => item.score !== null && item.max !== null && item.max! > 0)
  const otherTotalScore = otherValidItems.reduce((sum, item) => sum + (item.score || 0), 0)
  const otherTotalMax = otherValidItems.reduce((sum, item) => sum + (item.max || 0), 0)

  const totalMax = otherTotalMax + currentItem.max
  const requiredTotalScore = (passingThreshold / 100) * totalMax
  const requiredItemScore = requiredTotalScore - otherTotalScore

  return Math.max(0, Math.min(currentItem.max, Math.ceil(requiredItemScore)))
}

/* -------------------- Custom Date Input Component -------------------- */
const CustomDateInput = ({ 
  value, 
  onChange, 
  className = "" 
}: { 
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(value || "");

  useEffect(() => {
    setDisplayValue(value || "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    if (newValue.length === 10) {
      const date = new Date(newValue);
      const day = date.getDate();
      const year = date.getFullYear();
      
      if (day >= 1 && day <= 31 && year >= 1000 && year <= 9999) {
        onChange(newValue);
      }
    } else if (newValue === "") {
      onChange("");
    }
  };

  const handleBlur = () => {
    if (displayValue && displayValue.length === 10) {
      const date = new Date(displayValue);
      const day = date.getDate();
      const year = date.getFullYear();
      
      if (day >= 1 && day <= 31 && year >= 1000 && year <= 9999) {
        onChange(displayValue);
      } else {
        setDisplayValue(value || "");
      }
    } else if (displayValue === "") {
      onChange("");
    } else {
      setDisplayValue(value || "");
    }
  };

  return (
    <input
      type="date"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab') {
          return;
        }
        const k = e.key
        const isDigit = k >= '0' && k <= '9'
        const isDash = k === '-'
        if (!(isDigit || isDash) && k.length === 1) {
          e.preventDefault()
        }
      }}
    />
  );
};

/* -------------------- AI Service -------------------- */
class AIService {
  private getFallbackResponse(userMessage: string, subject: Subject | null): string {
    if (!subject) return "No subject context available.";
    const normalizedMessage = (userMessage || '').toLowerCase()
    const components = subject.components || []
    const rawPercentage = computeRawGrade(components)
    const currentGrade = percentageToGradeScale(rawPercentage)
    const targetGradeValue = subject.target_grade ? Number.parseFloat(subject.target_grade.toString()) : 0
    const componentItemPairs = _.flatMap(components, (c) => (c.items || []).map((i) => ({ i, comp: c })))
    const compareByComponentWeightDesc = Order.reverse(Order.mapInput(Order.number, (pair: { i: ItemInput; comp: ComponentInput }) => pair.comp.percentage))
    const upcomingItems = Array.sort(Array.filter(componentItemPairs, (pair) => pair.i?.score === null || pair.i?.score === undefined), compareByComponentWeightDesc)
    const componentGrades = Array.map(components, (c) => ({ name: c.name, grade: computeRawComponentGrade(c.items || []), weight: c.percentage }))
    const compareByGradeAsc = Order.mapInput(Order.number, (s: { name: string; grade: number; weight: number }) => s.grade)
    const compareByGradeDesc = Order.reverse(compareByGradeAsc)
    const strongestComponents = Array.sort([...componentGrades], compareByGradeDesc).slice(0, 2)
    const weakestComponents = Array.sort([...componentGrades], compareByGradeAsc).slice(0, 2)
    const statusText = targetGradeValue > 0 ? (currentGrade <= targetGradeValue ? '✅ Above target' : '⚠️ Below target') : 'Set a target to compute status'

    if (normalizedMessage.includes('strength') || normalizedMessage.includes('weak')) {
      const lines = [
        `📊 ${subject.name} — ${statusText} (current ${currentGrade.toFixed(2)} vs target ${targetGradeValue || 0})`,
        `💪 Strengths: ${strongestComponents.length ? strongestComponents.map(s => `${s.name} (${s.grade.toFixed(1)}%)`).join(', ') : 'None logged yet'}`,
        `⚠️ Weaknesses: ${weakestComponents.length ? weakestComponents.map(s => `${s.name} (${s.grade.toFixed(1)}%)`).join(', ') : 'None identified'}`,
        `🎯 Focus: ${upcomingItems.slice(0,3).length ? upcomingItems.slice(0,3).map((u,i)=>`${i+1}. ${u.i.name} (${u.comp.name}, ${u.comp.percentage}% weight)`).join('\n') : 'No upcoming assessments'}`
      ]
      return lines.join('\n')
    }

    if (normalizedMessage.includes('improve') || normalizedMessage.includes('better') || normalizedMessage.includes('increase')) {
      const primaryFocus = weakestComponents[0] || strongestComponents[0]
      const upcomingInPrimary = Array.filter(upcomingItems, (u) => u.comp.name === primaryFocus?.name).slice(0,3)
      const lines = [
        `📊 ${subject.name} — ${statusText} (current ${currentGrade.toFixed(2)} vs target ${targetGradeValue || 0})`,
        `� Plan:`,
        `${primaryFocus ? `1. Prioritize ${primaryFocus.name} — raise average above ${Math.max(75, Math.round(primaryFocus.grade+5))}%` : '1. Log more assessments to compute a plan'}`,
        `${upcomingInPrimary.length ? upcomingInPrimary.map((u,i)=>`${i+2}. Prepare for ${u.i.name} (${u.comp.percentage}% weight)`).join('\n') : (upcomingItems.length ? upcomingItems.slice(0,2).map((u,i)=>`${i+2}. Prepare for ${u.i.name} (${u.comp.percentage}% weight)`).join('\n') : '2. No upcoming assessments — maintain consistency in weakest areas')}`,
        `💡 Tips: Focus study on weakest topics, practice past papers, and aim for steady improvement rather than one-off spikes.`
      ]
      return lines.join('\n')
    }

    if (normalizedMessage.includes('focus') || normalizedMessage.includes('next') || normalizedMessage.includes('priority')) {
      const lines = [
        `📊 ${subject.name} — ${statusText} (current ${currentGrade.toFixed(2)} vs target ${targetGradeValue || 0})`,
        `🎯 Next Focus:`,
        `${upcomingItems.slice(0,3).length ? upcomingItems.slice(0,3).map((u,i)=>`${i+1}. ${u.i.name} (${u.comp.name}, ${u.comp.percentage}% weight)`).join('\n') : 'No upcoming assessments logged'}`,
        `💡 Highest impact components: ${componentGrades.sort((a,b)=>b.weight-a.weight).slice(0,2).map(c=>`${c.name} (${c.weight}% weight)`).join(', ')}`
      ]
      return lines.join('\n')
    }

    if (normalizedMessage.includes('risk') || normalizedMessage.includes('fail')) {
      const risky = weakestComponents.slice(0,2)
      const lines = [
        `📊 ${subject.name} — ${statusText} (current ${currentGrade.toFixed(2)} vs target ${targetGradeValue || 0})`,
        `⚠️ Risk Components: ${risky.length ? risky.map(r=>`${r.name} (${r.grade.toFixed(1)}%)`).join(', ') : 'No risk detected'}`,
        `🛡️ Mitigation: focus on weakest areas first, allocate more time to high-weight assessments, and aim for >=75% on upcoming items.`
      ]
      return lines.join('\n')
    }

    const lines = [
      `📊 ${subject.name} — ${statusText} (current ${currentGrade.toFixed(2)} vs target ${targetGradeValue || 0})`,
      `🎯 Next Focus:`,
      `${upcomingItems.slice(0,3).length ? upcomingItems.slice(0,3).map((u,i)=>`${i+1}. ${u.i.name} (${u.comp.name}, ${u.comp.percentage}% weight)`).join('\n') : 'No upcoming assessments logged'}`,
      `💡 Insights: Strongest: ${strongestComponents[0] ? `${strongestComponents[0].name} (${strongestComponents[0].grade.toFixed(1)}%)` : 'N/A'}, Weakest: ${weakestComponents[0] ? `${weakestComponents[0].name} (${weakestComponents[0].grade.toFixed(1)}%)` : 'N/A'}`
    ]
    return lines.join('\n')
  }

  private async discoverModel(apiKey: string): Promise<string> {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('gemini:model') : null
    if (cached) return cached
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey }
    })
    if (!res.ok) return 'gemini-pro'
    const j = await res.json()
    const isNonEmpty = (s: string): boolean => s.length > 0
    const names: string[] = Array.isArray(j?.models) ?
      Array.filter(
        Array.map(j.models, (m: any) => {
          const raw = String(m?.name || '')
          return raw.startsWith('models/') ? raw.slice('models/'.length) : raw
        }),
        isNonEmpty
      )
      : []
    const pick = names.find(n => n.startsWith('gemini-1.5')) || names.find(n => n.startsWith('gemini-pro')) || names.find(n => n.startsWith('gemini-1.0')) || names[0]
    const chosen = pick || 'gemini-pro'
    if (typeof window !== 'undefined') localStorage.setItem('gemini:model', chosen)
    return chosen
  }

  async sendChatMessage(messages: ChatMessage[], userMessage: string, subject: Subject | null): Promise<string> {
    try {
      if (!subject) return "No subject context available.";
      const history = Array.map(messages.slice(-6), (m) => m.content)
      const serverRes = await fetch(`/api/ai/subject/${subject.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history })
      })
      if (serverRes.ok) {
        const serverData = await serverRes.json()
        const text = String(serverData?.response || '')
        if (text) return text
      }
      return this.getFallbackResponse(userMessage, subject)
    } catch (error) {
      return this.getFallbackResponse(userMessage, subject)
    }
  }
}

const aiService = new AIService();

export default function SubjectDetail() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const user = session?.user as ExtendedUser | undefined

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
    topic: "",
  })
  const [savingItem, setSavingItem] = useState(false)
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editScore, setEditScore] = useState<number | null>(null)
  const [editMax, setEditMax] = useState<number | null>(null)
  
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState("")
  const [renamingSubject, setRenamingSubject] = useState(false)

  const [editingComponentId, setEditingComponentId] = useState<string | null>(null)
  const [editingComponentName, setEditingComponentName] = useState("")
  const [editingComponentPercentage, setEditingComponentPercentage] = useState(0)
  const [updatingComponent, setUpdatingComponent] = useState(false)

  const [isEditingTargetGrade, setIsEditingTargetGrade] = useState(false)
  const [editingTargetGrade, setEditingTargetGrade] = useState<number | null>(null)
  const [updatingTargetGrade, setUpdatingTargetGrade] = useState(false)

  // ADDED: Units editing state
  const [isEditingUnits, setIsEditingUnits] = useState(false)
  const [editingUnits, setEditingUnits] = useState<number>(3)
  const [updatingUnits, setUpdatingUnits] = useState(false)

  const [showEditItemModal, setShowEditItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemInput | null>(null)
  const [editingItemComponentId, setEditingItemComponentId] = useState<string | null>(null)

  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null)
  // Delete Item modal state
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false)
  

  // Congrats Modal
  const [showCongratsModal, setShowCongratsModal] = useState(false)


  // Graph Modal
  const [showGraphModal, setShowGraphModal] = useState(false)

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Finishing course state
  const [finishingCourse, setFinishingCourse] = useState(false)
  const [finishLoading, setFinishLoading] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const localKey = typeof id === "string" ? `grades:subject:${id}` : `grades:subject:${String(id)}`

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    if (assistantOpen) inputRef.current?.focus()
  }, [assistantOpen])

  // Initialize with welcome message
  useEffect(() => {
    if (subject && chatMessages.length === 0) {
      const allItems = (subject.components || []).flatMap(c => c.items || [])
      const total = allItems.filter(i => i?.max && i.max > 0).length
      const completed = allItems.filter(i => i?.score !== null && i?.score !== undefined && i?.max && i.max > 0).length
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100)
      const rawPct = computeRawGrade(subject.components)
      const currentGrade = percentageToGradeScale(rawPct)
      const target = subject.target_grade ? Number.parseFloat(subject.target_grade.toString()) : 0
      let content = ''
      if (completed === 0) {
        content = `📊 ${subject.name} Analysis\n\nCurrent Status: You haven't logged any grades yet (${progress}% progress).\n\nNext Steps:\n1. Add your assessment items\n2. Set your target to ${target || 3.0}\n3. Log grades as you get them`
      } else {
        const status = target > 0 ? (currentGrade <= target ? 'ABOVE TARGET ✅' : 'BELOW TARGET ⚠️') : 'Status available once a target is set'
        content = `📊 ${subject.name} Analysis\n\nCurrent Grade: ${currentGrade.toFixed(2)} (target ${target || 0}) - ${status}\n\nAsk me for prioritized actions based on weights and upcoming assessments.`
      }
      const welcomeMessage: ChatMessage = { id: '1', role: 'assistant', content, timestamp: new Date() }
      setChatMessages([welcomeMessage])
    }
  }, [subject])



  useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search)
  const showGraphParam = searchParams.get('showGraph')
  
  if (showGraphParam === 'true' && subject) {
    setShowGraphModal(true)
    
      // Clean up URL without page reload
      const url = new URL(window.location.href)
      url.searchParams.delete('showGraph')
      window.history.replaceState({}, '', url.toString())
    }
  }, [subject])

  /* -------------------- Finish Subject Function -------------------- */
// In subject page component
// In subject page - UPDATED FINISH FUNCTION
const handleFinishSubject = async () => {
  if (!session?.user?.email) {
    console.log('❌ No user session found');
    return;
  }
  
  if (!subject?.id) {
    console.log('❌ No subject ID found');
    return;
  }
  
  try {
    console.log('🔄 Starting finish process for subject:', subject.id);
    
    const response = await fetch(`/api/subjects/${subject.id}/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_email: session.user.email
      }),
    });

    const responseText = await response.text();
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      result = {};
    }
    
    if (response.ok) {
      console.log('✅ Finish API success:', result);
      
      // CRITICAL FIX: Store history record in localStorage immediately
      if (result.history_record) {
        const userHistoryKey = `user_history_${session.user.email}`;
        const existingHistory = JSON.parse(localStorage.getItem(userHistoryKey) || '[]');
        
        const newHistoryRecord = {
          ...result.history_record,
          // Ensure all fields are present
          id: result.history_record.id || `local_${Date.now()}`,
          subject_id: result.history_record.subject_id || subject.id,
          user_email: result.history_record.user_email || session.user.email,
          course_name: result.history_record.course_name || subject.name,
          target_grade: result.history_record.target_grade || subject.target_grade?.toString() || '0',
          final_grade: result.history_record.final_grade || result.final_grade || '0.00',
          status: result.history_record.status || result.status || 'reached',
          completed_at: result.history_record.completed_at || new Date().toISOString(),
          created_at: result.history_record.created_at || new Date().toISOString()
        };
        
        const updatedHistory = [newHistoryRecord, ...existingHistory];
        localStorage.setItem(userHistoryKey, JSON.stringify(updatedHistory));
        console.log('💾 History record stored locally:', newHistoryRecord);
      }
      
      // Set flag to refresh history from localStorage
      localStorage.setItem('shouldRefreshHistory', 'true');
      
      // Show congrats modal instead of immediate redirect
      console.log('🎉 Showing congrats modal');
      setShowCongratsModal(true);
      
    } else {
      console.error('❌ Finish API error:', result);
      alert('Failed to finish subject: ' + (result.error || result.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('💥 Finish subject error:', error);
    alert('Error finishing subject: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

  // Congrats Model
  const handleCongratsModalClose = () => {
        setShowCongratsModal(false);
        // Redirect to dashboard after modal closes
        console.log('🏁 Congrats modal closed, redirecting to dashboard...');
        router.push('/dashboard');
      };  
  // ADDED: Units update handler
  const handleUpdateUnits = async () => {
    if (!subject?.id) return

    if (editingUnits < 1 || editingUnits > 10) {
      alert("Units must be between 1 and 10")
      return
    }

    setUpdatingUnits(true)
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          units: editingUnits,
          name: subject.name,
          target_grade: subject.target_grade
        }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Units update failed")
      }

      setSubject(prev => prev ? { 
        ...prev, 
        units: editingUnits
      } : null)
      
      setIsEditingUnits(false)
    } catch (err) {
      console.error("Units update failed:", err)
      alert("Failed to update units.")
    } finally {
      setUpdatingUnits(false)
    }
  }

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
        
        // Apply local edits if present
        const localEdits = loadLocalEdits()
        const patched: Subject = {
          ...data,
          color: data.color || '#4F46E5',
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
        setEditingUnits(data.units || 3) // ADDED: Initialize units
      } catch (err) {
        console.error("Subject fetch failed:", err)
        setSubject(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSubject()
  }, [id])

  useEffect(() => {
    if (subject?.name) setEditingName(subject.name)
    if (subject?.target_grade) setEditingTargetGrade(parseFloat(subject.target_grade.toString()))
    if (subject?.units) setEditingUnits(subject.units) // ADDED: Initialize units
  }, [subject?.name, subject?.target_grade, subject?.units])

  useEffect(() => {
    if (subject) {
      setSubject(prev => prev ? { ...prev } : null)
    }
  }, [subject?.target_grade])

  // New Chat Functions
  const handleSendMessage = async () => {
    if (!userInput.trim() || !subject) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setUserInput("")
    setAiLoading(true)

    try {
      const response = await aiService.sendChatMessage(chatMessages, userInput, subject)
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }

      setChatMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setAiLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickQuestions = useMemo(() => {
    if (!subject) return [] as string[]
    const allItems = (subject.components || []).flatMap(c => c.items || [])
    const rawPercentage = computeRawGrade(subject.components)
    const currentGrade = percentageToGradeScale(rawPercentage)
    const target = subject.target_grade ? Number.parseFloat(subject.target_grade.toString()) : 0
    const completedItems = Array.filter(allItems, (i) => i?.score !== null && i?.score !== undefined)
    const upcomingItems = Array.filter(allItems, (i) => i?.score === null || i?.score === undefined)
    const safetyZone = target > 0 ? (currentGrade >= target ? 'green' : rawPercentage >= 71 ? 'yellow' : 'red') : (rawPercentage >= 75 ? 'green' : rawPercentage >= 65 ? 'yellow' : 'red')
    const suggestions: string[] = []
    if (target > 0 && currentGrade < target) suggestions.push("What do I need to reach my target?")
    const byCompPctDesc2 = Order.reverse(Order.mapInput(Order.number, (x: { i: ItemInput; comp?: ComponentInput }) => Number(x.comp?.percentage || 0)))
    const nextHighWeightAssessment = Array.sort(
      Array.map(upcomingItems, (i) => ({ i, comp: (subject.components || []).find(c => (c.items || []).some(ci => ci.id === i.id)) })),
      byCompPctDesc2
    )[0]
    if (nextHighWeightAssessment?.i && nextHighWeightAssessment.comp) suggestions.push(`How should I prepare for ${nextHighWeightAssessment.i.name}?`)
    if (completedItems.length > 0) suggestions.push("What are my strengths and weaknesses?")
    if (safetyZone === 'red') suggestions.push("Am I at risk of failing?")
    return suggestions.slice(0, 4)
  }, [subject])

  const handleQuickQuestion = (question: string) => {
    setUserInput(question)
  }

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

      setSubject(prev => prev ? { ...prev, name: trimmedName } : null)
      setIsEditingName(false)
    } catch (err) {
      console.error("Subject rename failed:", err)
      alert("Failed to rename subject.")
    } finally {
      setRenamingSubject(false)
    }
  }

  const handleUpdateTargetGrade = async () => {
    if (!subject?.id) return

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
          name: subject.name
        }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Target grade update failed")
      }

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

  const handleOpenEditItemModal = (item: ItemInput, componentId: string) => {
    setEditingItem(item)
    setEditingItemComponentId(componentId)
    setShowEditItemModal(true)
    setDropdownOpenId(null)
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItemComponentId || !subject?.id) return

    const trimmedName = editingItem.name.trim()
    if (!trimmedName) {
      alert("Item name is required.")
      return
    }

    if (editingItem.date && !validateDate(editingItem.date)) {
      alert('Please enter a valid date. Day must be between 1-31 and year must be 4 digits.');
      return;
    }

    // Validation for score and max
    if (editingItem.score !== null && editingItem.max !== null) {
      if (editingItem.max! <= 0) {
        alert("Max must be greater than 0")
        return
      }
      if (editingItem.score! > editingItem.max!) {
        alert("Score cannot exceed Max")
        return
      }
    }

    setSavingItem(true)
    try {
      const requestBody = {
        name: trimmedName,
        score: editingItem.score,
        max: editingItem.max,
        date: editingItem.date,
        target: editingItem.target,
        topic: editingItem.topic || null,
      }

      console.log('🔄 Updating item with topic:', requestBody)

      const res = await fetch(`/api/items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (res.ok) {
        const result = await res.json()
        console.log('✅ Item updated successfully:', result)
        
        setSubject(prev => {
          if (!prev) return prev
          return {
            ...prev,
            components: prev.components.map(comp => 
              comp.id === editingItemComponentId
                ? {
                    ...comp,
                    items: (comp.items || []).map(it =>
                      it.id === editingItem.id ? { ...result } : it
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
        let errorMessage = "Failed to update item"
        
        try {
          const contentType = res.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const text = await res.text()
            console.error('Non-JSON error response:', text)
            if (res.status === 405) {
              errorMessage = "Method not allowed. Please check your API route."
            } else if (res.status === 404) {
              errorMessage = "Item not found."
            } else {
              errorMessage = `Server error: ${res.status} ${res.statusText}`
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          errorMessage = `Network error: ${res.status} ${res.statusText}`
        }
        
        alert(errorMessage)
      }
    } catch (err) {
      console.error("Error updating item:", err)
      alert("Network error: Failed to update item. Please check your connection.")
    } finally {
      setSavingItem(false)
    }
  }

  const handleUpdateItemScore = async (itemId: string, score: number | null, max: number | null) => {
    if (!subject?.id) return

    // Validation checks
    if (max !== null && max <= 0) {
      alert("Max must be greater than 0")
      return
    }
    if (score !== null && max !== null && score > max) {
      alert("Score cannot exceed Max")
      return
    }

    try {
      const requestBody = {
        score: score !== null ? Number(score) : null, 
        max: max !== null ? Number(max) : null 
      }

      console.log('🔄 Updating item score:', itemId, requestBody)

      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (res.ok) {
        const result = await res.json()
        console.log('✅ Item score updated successfully:', result)
        
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

        saveLocalEdit(String(itemId), { score, max })
        
        setEditingItemId(null)
        setEditScore(null)
        setEditMax(null)
      } else {
        let errorMessage = "Failed to update item score"
        
        try {
          const contentType = res.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const text = await res.text()
            console.error('Non-JSON error response:', text)
            if (res.status === 405) {
              errorMessage = "Method not allowed. Please check your API route."
            } else if (res.status === 404) {
              errorMessage = "Item not found."
            } else {
              errorMessage = `Server error: ${res.status} ${res.statusText}`
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          errorMessage = `Network error: ${res.status} ${res.statusText}`
        }
        
        alert(errorMessage)
      }
    } catch (err) {
      console.error("Item score update failed:", err)
      alert("Network error: Failed to update item score. Please check your connection.")
    }
  }

  const handleAddItem = async (componentId: string) => {
    if (!newItem.name.trim()) {
      alert("Item name is required!")
      return
    }

    if (newItem.date && !validateDate(newItem.date)) {
      alert('Please enter a valid date. Day must be between 1-31 and year must be 4 digits.');
      return;
    }

    // Validation for score and max
    if (newItem.score !== null && newItem.max !== null) {
      if (newItem.max! <= 0) {
        alert("Max must be greater than 0")
        return
      }
      if (newItem.score! > newItem.max!) {
        alert("Score cannot exceed Max")
        return
      }
    }

    setSavingItem(true)
    try {
      const requestBody = {
        component_id: componentId,
        name: newItem.name,
        score: newItem.score,
        max: newItem.max,
        date: newItem.date,
        target: newItem.target,
        topic: newItem.topic || null,
      }

      console.log('🔄 Creating item with topic:', requestBody)

      const res = await fetch(`/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (res.ok) {
        const result = await res.json()
        console.log('✅ Item created successfully:', result)
        
        setSubject(prev => {
          if (!prev) return prev
          return {
            ...prev,
            components: prev.components.map(comp => 
              comp.id === componentId
                ? {
                    ...comp,
                    items: [
                      ...(comp.items || []),
                      {
                        ...result
                      }
                    ]
                  }
                : comp
            )
          }
        })

        setShowAddItemModal(false)
        setNewItem({
          name: "",
          score: null,
          max: null,
          date: "",
          target: null,
          topic: "",
        })
        setSelectedComponent(null)
      } else {
        let errorMessage = "Failed to add item"
        
        try {
          const contentType = res.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const text = await res.text()
            console.error('Non-JSON error response:', text)
            if (res.status === 405) {
              errorMessage = "Method not allowed. Please check your API route."
            } else {
              errorMessage = `Server error: ${res.status} ${res.statusText}`
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          errorMessage = `Network error: ${res.status} ${res.statusText}`
        }
        
        alert(errorMessage)
      }
    } catch (err) {
      console.error("Error adding item:", err)
      alert("Network error: Failed to add item. Please check your connection.")
    } finally {
      setSavingItem(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!subject?.id) return
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
      })

      if (res.ok) {
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
        let errorMessage = "Failed to delete item"
        try {
          const contentType = res.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const text = await res.text()
            console.error('Non-JSON error response:', text)
            errorMessage = `Server error: ${res.status} ${res.statusText}`
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          errorMessage = `Network error: ${res.status} ${res.statusText}`
        }
        alert(errorMessage)
      }
    } catch (err) {
      console.error("Error deleting item:", err)
      alert("Network error: Failed to delete item. Please check your connection.")
    } finally {
      setDropdownOpenId(null)
    }
  }

  const handleOpenDeleteItemModal = (itemId: string) => {
    setItemToDelete(itemId)
    setShowDeleteItemModal(true)
    setDropdownOpenId(null)
  }

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return
    await handleDeleteItem(itemToDelete)
    setShowDeleteItemModal(false)
    setItemToDelete(null)
  }

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

  const rawPercentage = computeRawGrade(subject.components)
  const projectedPercentage = computeProjectedGrade(subject.components)
  const rawGrade = percentageToGradeScale(rawPercentage)
  const projectedGrade = percentageToGradeScale(projectedPercentage)
  
  const targetGrade = subject.target_grade ? Number.parseFloat(subject.target_grade.toString()) : 0
  const passingMark = 75 // Default passing mark in Philippine system
  const effectivePassingMark = targetGrade > 0 ? 
    Math.max(passingMark, (3.0 - targetGrade) * 25 + 50) : passingMark // Adjust passing mark based on target grade

  return (
    <div className="min-h-screen p-4 md:p-10 flex justify-center relative">
      <Backdrop />
      {/* FLOATING BACK BUTTON - TOP LEFT */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-40">
        <button
          onClick={() => router.push("/dashboard")}
          className="px-3 py-2 md:px-5 md:py-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 border border-gray-200 flex items-center gap-2 transition-all duration-200 hover:shadow-xl text-sm md:text-base"
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
          Back to Dashboard
        </button>
      </div>

      {/* MAIN MODAL CARD */}
      <div className="w-full max-w-6xl rounded-3xl shadow-2xl p-4 md:p-8 bg-white mt-12 md:mt-0">
        {/* HEADER */}
        <div 
          className="p-6 md:p-8 rounded-2xl text-white flex flex-col md:flex-row justify-between items-center shadow-lg relative overflow-hidden gap-6 md:gap-0"
          style={{ 
            background: subject?.color 
              ? `linear-gradient(135deg, ${subject.color} 0%, ${subject.color}dd 50%, ${subject.color}aa 100%)`
              : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)'
          }}
        >
          {/* Content */}
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
                  className="text-3xl font-bold px-3 py-1 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 max-w-[200px] md:max-w-md"
                  placeholder="Subject name"
                />
                <button
                  type="button"
                  onClick={handleRenameSubject}
                  disabled={renamingSubject || !editingName.trim() || editingName.trim() === subject?.name}
                  className="px-3 py-1 bg-white/20 rounded text-sm font-semibold disabled:opacity-50 hover:bg-white/30 transition-colors"
                >
                  {renamingSubject ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false)
                    setEditingName(subject?.name || "")
                  }}
                  className="px-3 py-1 bg-white/10 rounded text-sm font-semibold hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-outline-dark">{subject.name}</h1>
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

          {/* Grade Metrics */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-center">
            {/* Grade Metrics with Icons */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-center">
              {/* Target Grade */}
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
                  <div className="text-sm text-white/90 text-outline-dark">Target Grade</div>
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
                          if (value !== null) {
                            const roundedValue = Math.round(value * 4) / 4
                            setEditingTargetGrade(roundedValue)
                          } else {
                            setEditingTargetGrade(null)
                          }
                        }}
                        className="w-20 text-2xl font-bold bg-white/20 border border-white/30 rounded px-1 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateTargetGrade()
                          if (e.key === "Escape") {
                            setIsEditingTargetGrade(false)
                            setEditingTargetGrade(subject.target_grade ? parseFloat(subject.target_grade.toString()) : null)
                          }
                        }}
                        placeholder="0.00"
                      />
                      <button
                        onClick={handleUpdateTargetGrade}
                        disabled={updatingTargetGrade}
                        className="text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 transition-colors"
                      >
                        {updatingTargetGrade ? "Saving" : "✓"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingTargetGrade(false)
                          setEditingTargetGrade(subject.target_grade ? parseFloat(subject.target_grade.toString()) : null)
                        }}
                        className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-outline-dark">
                        {targetGrade > 0 ? targetGrade.toFixed(2) : "—"}
                      </div>
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

              {/* Units */}
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
                  <div className="text-sm text-white/90 text-outline-dark">Units</div>
                  {isEditingUnits ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editingUnits || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : 0
                          setEditingUnits(Math.max(1, Math.min(10, value)))
                        }}
                        className="w-16 text-2xl font-bold bg-white/20 border border-white/30 rounded px-1 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        autoFocus
                        min="1"
                        max="10"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateUnits()
                          if (e.key === "Escape") {
                            setIsEditingUnits(false)
                            setEditingUnits(subject?.units || 3)
                          }
                        }}
                      />
                      <button
                        onClick={handleUpdateUnits}
                        disabled={updatingUnits}
                        className="text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 transition-colors"
                      >
                        {updatingUnits ? "Saving" : "✓"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingUnits(false)
                          setEditingUnits(subject?.units || 3)
                        }}
                        className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-outline-dark">
                        {subject?.units || 3}
                      </div>
                      <button
                        type="button"
                        aria-label="Edit units"
                        onClick={() => {
                          setEditingUnits(subject?.units || 3)
                          setIsEditingUnits(true)
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

              {/* Projected Grade */}
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
                  <div className="text-sm text-white/90 text-outline-dark">Projected Grade</div>
                  <div className="text-2xl font-bold text-outline-dark">{projectedGrade.toFixed(2)}</div>
                  <div className="text-xs opacity-80 text-outline-dark">
                    {projectedPercentage.toFixed(1)}%
                    {projectedPercentage > 0 && (
                      <span className="ml-1">(with 75% on missing scores)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw Grade */}
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
                  <div className="text-sm text-white/90 text-outline-dark">Raw Grade</div>
                  <div className="text-2xl font-bold text-outline-dark">{rawGrade.toFixed(2)}</div>
                  <div className="text-xs opacity-80 text-outline-dark">
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

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column - Components */}
          <div className="lg:col-span-2 space-y-6">
            {subject.components.map((component) => {
              const componentProgress = calculateComponentProgress(component)

              return (
                <div key={component.id} className="bg-white rounded-xl border border-gray-300 p-6">
                  {/* Component Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4 md:gap-0">
                    {editingComponentId === component.id ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          value={editingComponentName}
                          onChange={(e) => setEditingComponentName(e.target.value)}
                          className="text-xl font-semibold px-2 py-1 border rounded max-w-[140px] md:max-w-xs"
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
                        className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4 md:py-2 border-b border-gray-200 last:border-b-0 items-start"
                      >
                        {/* Item Name */}
                        <div>
                          <div className="text-sm text-gray-500">Name</div>
                          <div className="font-medium">
                            {item.name || "—"}
                          </div>
                        </div>

                        {/* Topic */}
                        <div>
                          <div className="text-sm text-gray-500">Topic</div>
                          <div className="font-medium">
                            {item.topic || "—"}
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
                                    onClick={() => handleOpenDeleteItemModal(String(item.id))}
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
              {/* Header with Graph Button */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Component Progress</h3>
                <button
                  onClick={() => setShowGraphModal(true)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  title="View Progress Graph"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
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
                </button>
              </div>
              
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

            {/* Assistant Floating Bubble */}
            <button
              aria-label="Open Assistant"
              aria-expanded={assistantOpen}
              aria-controls="subject-assistant"
              onClick={() => setAssistantOpen(v => !v)}
              className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center z-50 hover:bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <Image src="/gslogo.png" alt="GradeSeer" width={28} height={28} className="object-contain" />
            </button>

            {assistantOpen && (
              <div
                id="subject-assistant"
                className="fixed bottom-20 right-4 md:bottom-24 md:right-6 w-[calc(100vw-2rem)] md:w-96 max-w-[90vw] h-96 rounded-2xl shadow-2xl border border-gray-200 bg-white/95 backdrop-blur-sm z-50 flex flex-col"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-2">
                    <Image src="/gslogo.png" alt="GradeSeer" width={24} height={24} className="object-contain" />
                    <span className="text-sm font-semibold text-gray-800">GradeSeer Assistant</span>
                  </div>
                  <button
                    onClick={() => setAssistantOpen(false)}
                    className="p-2 rounded hover:bg-gray-100"
                    aria-label="Close Assistant"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'assistant' && (
                        <Image src="/gslogo.png" alt="Assistant" width={20} height={20} className="rounded-full mr-2 object-contain" />
                      )}
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>{message.content}</div>
                    </div>
                  ))}
                  {aiLoading && <div className="text-sm text-gray-600">Thinking...</div>}
                </div>
                <div className="p-3 border-t flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask about this subject"
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={aiLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setAssistantOpen(false)
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (!aiLoading && userInput.trim()) handleSendMessage()
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={aiLoading || !userInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* AI Insights */}
            <div className="bg-white rounded-xl border border-gray-300 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
              <div className="space-y-3 text-sm text-gray-800">
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2">
                    {(() => {
                      const rawPct = computeRawGrade(subject.components)
                      const curr = percentageToGradeScale(rawPct)
                      const tgt = targetGrade
                      if (tgt > 0) return curr <= tgt ? '✅ Above target' : '⚠️ Below target'
                      return 'Set a target to track status'
                    })()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Gap to target:</span>
                  <span className="ml-2">
                    {(() => {
                      const rawPct = computeRawGrade(subject.components)
                      const curr = percentageToGradeScale(rawPct)
                      const tgt = targetGrade
                      if (!tgt) return 'N/A'
                      const gap = Number((tgt - curr).toFixed(2))
                      return `${gap > 0 ? '+' : ''}${gap}`
                    })()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Risk components:</span>
                  <ul className="list-disc ml-6 mt-1">
                    {Array.map(
                      Array.sort(
                        Array.filter(
                          Array.map(subject.components, (c): { c: ComponentInput; pct: number; valid: number } => ({
                            c,
                            pct: computeRawComponentGrade(c.items || []),
                            valid: (c.items || []).filter(i => i?.score !== null && i?.score !== undefined && i?.max && i.max > 0).length
                          })),
                          (x) => {
                            if (x.valid === 0) return false
                            const scaled = percentageToGradeScale(x.pct)
                            return targetGrade > 0 ? scaled > targetGrade : x.pct < effectivePassingMark
                          }
                        ),
                        Order.reverse(Order.mapInput(Order.number, (x: { c: ComponentInput; pct: number; valid: number }) => {
                          const scaled = percentageToGradeScale(x.pct)
                          const gap = targetGrade > 0 ? Math.max(0, scaled - targetGrade) : Math.max(0, effectivePassingMark - x.pct)
                          return Number(x.c.percentage) * gap
                        }))
                      ).slice(0, 3),
                      (x) => (
                        <li key={x.c.id}>{x.c.name} ({x.c.percentage}% weight)</li>
                      )
                    )}
                    {subject.components.filter(c => (c.items || []).length > 0).length === 0 && (
                      <li>No data yet</li>
                    )}
                  </ul>
                </div>
                <div>
                  <span className="font-medium">Upcoming priorities:</span>
                  <ul className="list-disc ml-6 mt-1">
                    {Array.map(
                      Array.sort(
                        Array.filter(
                          _.flatMap(subject.components, (c) => (c.items || []).map((i) => ({ i, comp: c }))),
                          (x) => x.i.score === null || x.i.score === undefined
                        ),
                        Order.reverse(Order.mapInput(Order.number, (x: { i: ItemInput; comp: ComponentInput }) => x.comp.percentage))
                      ).slice(0, 3),
                      (x) => (
                        <li key={`${x.comp.id}-${x.i.name}`}>{x.i.name} ({x.comp.name}, {x.comp.percentage}% weight)</li>
                      )
                    )}
                    {Array.filter(_.flatMap(subject.components, (c) => c.items || []), (i) => i.score === null || i.score === undefined).length === 0 && (
                      <li>No upcoming assessments</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BACK BUTTON */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleFinishSubject}
            disabled={finishLoading}
            className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center md:justify-start gap-3 font-semibold disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            {finishLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Finishing...
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
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Finish Subject
              </>
            )}
          </button>
        </div>
      </div>

      {/* ADD ITEM MODAL */}
      {showAddItemModal && (
        <div className="fixed inset-0 flex justify-center items-center z-50 px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add New Item</h2>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setSelectedComponent(null);
                  setNewItem({ name: "", score: null, max: null, date: "", target: null, topic: "" });
                }}
                className="p-2 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

              <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="Item Name"
                  value={newItem.name}
                  // allow letters and spaces only, limit to 50 characters
                onChange={(e) => {
                  const raw = e.target.value
                  const chars = raw.split("")
                  const sanitized = Array.filter(chars, (ch) => {
                    const code = ch.charCodeAt(0)
                    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
                    const isSpace = ch === " "
                    return isLetter || isSpace
                  }).join("").slice(0, 50)
                  setNewItem({ ...newItem, name: sanitized })
                }}
                maxLength={50}
                pattern="[A-Za-z ]*"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Topic Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input
                  type="text"
                  placeholder="Topic (optional)"
                  value={newItem.topic || ""}
                  onChange={(e) => setNewItem({ ...newItem, topic: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                  <input
                    type="number"
                    placeholder="Score"
                    value={newItem.score ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value
                      const digits = Array.filter(raw.split(""), (ch) => ch >= "0" && ch <= "9").join("").slice(0, 4)
                      setNewItem({ ...newItem, score: digits ? Number.parseInt(digits) : null })
                    }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  max={9999}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    placeholder="Max Score"
                      value={newItem.max ?? ""}
                      // Limit input to digits only and max 4 characters (0-9999) /
                    onChange={(e) => {
                      const raw = e.target.value
                      const digits = Array.filter(raw.split(""), (ch) => ch >= "0" && ch <= "9").join("").slice(0, 5)
                      setNewItem({ ...newItem, max: digits ? Number.parseInt(digits) : null })
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    max={9999}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <CustomDateInput
                  value={newItem.date ?? ""}
                  onChange={(date) => setNewItem({ ...newItem, date })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Day must be 1-31, Year must be 4 digits</p>
              </div>
              
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => selectedComponent && handleAddItem(selectedComponent)}
                disabled={savingItem}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {savingItem ? "Saving..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {showEditItemModal && editingItem && (
        <div className="fixed inset-0 flex justify-center items-center z-50 px-4">
          <div 
            className="absolute inset-0"
            style={{
              background: subject?.color 
                ? `linear-gradient(135deg, ${subject.color}40 0%, ${subject.color}20 50%, ${subject.color}10 100%)`
                : 'linear-gradient(135deg, #4F46E540 0%, #6366F120 50%, #818CF810 100%)'
            }}
          />
          
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-center">Edit Item</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem!, name: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Topic Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input
                  type="text"
                  placeholder="Topic (optional)"
                  value={editingItem.topic || ""}
                  onChange={(e) => setEditingItem({ ...editingItem!, topic: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      setEditingItem({ ...editingItem!, score: e.target.value ? Number.parseInt(e.target.value) : null })
                    }
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    placeholder="Max Score"
                    value={editingItem.max || ""}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem!, max: e.target.value ? Number.parseInt(e.target.value) : null })
                    }
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <CustomDateInput
                  value={editingItem.date || ""}
                  onChange={(date) => setEditingItem({ ...editingItem!, date })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Day must be 1-31, Year must be 4 digits</p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  setShowEditItemModal(false)
                  setEditingItem(null)
                  setEditingItemComponentId(null)
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateItem}
                disabled={savingItem}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {savingItem ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ITEM CONFIRMATION MODAL */}
      {showDeleteItemModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
          onClick={() => { setShowDeleteItemModal(false); setItemToDelete(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Item</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this item? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteItemModal(false); setItemToDelete(null); }}
                className="px-4 py-2 bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteItem}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <SubjectGraphModal
          isOpen={showGraphModal}
          onClose={() => setShowGraphModal(false)}
          subjectName={subject.name}
          components={subject.components}
          subjectColor={subject.color}
        />
        <CongratsModal 
          isOpen={showCongratsModal}
          onClose={handleCongratsModalClose}
        />
    </div>
  )
}
