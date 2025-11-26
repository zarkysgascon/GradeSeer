"use client"

import { useEffect, useState, useRef } from "react"
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

/* -------------------- Grade Computation -------------------- */
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

function computeProjectedComponentGrade(items: ItemInput[]): number {
  if (!items || items.length === 0) return 0

  const passingScorePercentage = 75

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
        if (!/[\d-]/.test(e.key) && e.key.length === 1) {
          e.preventDefault();
        }
      }}
    />
  );
};

/* -------------------- AI Service -------------------- */
class AIService {
  private apiKey: string = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  private getFallbackResponse(userMessage: string, subject: Subject | null): string {
    return "I'm having trouble connecting to my AI service right now. Please check that your API key is properly configured and try again.";
  }

  async sendChatMessage(messages: ChatMessage[], userMessage: string, subject: Subject | null): Promise<string> {
    try {
      console.log('=== 🔍 AI SERVICE DEBUG INFO ===');
      console.log('API Key from env:', process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'PRESENT' : 'MISSING');
      console.log('Current this.apiKey:', this.apiKey ? `Present (length: ${this.apiKey.length})` : 'MISSING');
      console.log('============================');

      if (!this.apiKey || this.apiKey === '') {
        console.error('❌ CRITICAL: No API key found in class instance');
        return "Please configure your Gemini API key in the environment variables to use the AI chat feature.";
      }

      const conversationHistory = messages
        .slice(-6)
        .map(msg => `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      let context = "You are a helpful AI tutor and study assistant. You help students with academic questions, study strategies, time management, and general learning advice.";
      
      if (subject) {
        context += `\n\nThe student is currently viewing their "${subject.name}" subject but may ask about any academic topic.`;
      }

      const prompt = `${context}

CONVERSATION HISTORY:
${conversationHistory}

STUDENT'S CURRENT QUESTION: ${userMessage}

Please provide a helpful, engaging response. Answer their question directly and be conversational but informative.`;

      console.log('🚀 Calling Gemini API...');

      const modelName = 'gemini-1.5-flash';
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${this.apiKey}`;
      
      console.log('📡 API URL (key hidden):', apiUrl.replace(this.apiKey, 'API_KEY_REDACTED'));

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
      });

      console.log('📨 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API call successful!');
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const aiResponse = data.candidates[0].content.parts[0].text;
          console.log('🎉 Got AI response:', aiResponse.substring(0, 100) + '...');
          return aiResponse;
        } else {
          console.error('❌ No content in response:', data);
          throw new Error('No content in API response');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        if (response.status === 401 || response.status === 403) {
          return "Authentication failed. Please check that your Gemini API key is valid and has the correct permissions.";
        } else if (response.status === 404) {
          return "The AI model is not available. Please try a different model or check the API documentation.";
        } else {
          return `API request failed with status ${response.status}. Please check your API key and try again.`;
        }
      }

    } catch (error) {
      console.error('💥 AI service error:', error);
      return this.getFallbackResponse(userMessage, subject);
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

  const [showEditItemModal, setShowEditItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemInput | null>(null)
  const [editingItemComponentId, setEditingItemComponentId] = useState<string | null>(null)

  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null)

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState("")
  const [aiLoading, setAiLoading] = useState(false)

  // Finishing course state
  const [finishingCourse, setFinishingCourse] = useState(false)

  const [finishLoading, setFinishLoading] = useState(false)

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const localKey = typeof id === "string" ? `grades:subject:${id}` : `grades:subject:${String(id)}`
  const historyStorageKey = user?.email ? `gradeHistory:${user.email}` : "gradeHistory:guest";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Initialize with welcome message
  useEffect(() => {
    if (subject && chatMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `Hi! I'm your AI study assistant for ${subject.name}. I can help you analyze your performance, suggest study strategies, and provide academic advice. What would you like to know about your progress?`,
        timestamp: new Date()
      }
      setChatMessages([welcomeMessage])
    }
  }, [subject])

  /* -------------------- Updated Finish Subject Function -------------------- */
const handleFinishSubject = async () => {
  if (!subject?.id || !user?.email) {
    alert("You need to be logged in to finish a subject.");
    return;
  }

  if (!window.confirm(`Are you sure you want to finish "${subject.name}"? This will calculate your final grade and move it to history. This action cannot be undone.`)) {
    return;
  }

  setFinishLoading(true);
  try {
    console.log('🔄 Starting finish process for subject:', {
      subjectId: subject.id,
      subjectName: subject.name,
      userEmail: user.email
    });

    const finishData = { 
      user_email: user.email 
    };

    console.log('📤 Sending finish request with data:', finishData);

    const res = await fetch(`/api/subjects/${subject.id}/finish`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finishData),
    });

    console.log('📨 Finish API response status:', res.status);
    console.log('📨 Finish API response ok:', res.ok);

    // Get the response text first to see what's coming back
    const responseText = await res.text();
    console.log('📄 Raw response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('📊 Parsed response data:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!res.ok) {
      console.error('❌ Finish API Error:', data);
      throw new Error(data.error || data.details || `Failed to finish subject (${res.status})`);
    }

    if (data.success) {
      console.log('✅ Finish API success:', data);
      
      const statusMessage = data.status === 'reached' ? '🎉 Target Reached!' : 'Target Missed';
      const message = `Subject completed successfully!\n\nFinal Grade: ${data.final_grade}\nTarget Grade: ${subject.target_grade}\nStatus: ${statusMessage}\n\nYou can view this in your History tab.`;
      
      alert(message);
      
      // Set multiple flags to ensure refresh
      localStorage.setItem('shouldRefreshHistory', 'true');
      localStorage.setItem('lastFinishedSubject', JSON.stringify({
        id: subject.id,
        name: subject.name,
        timestamp: new Date().toISOString()
      }));
      
      console.log('🏁 Subject finished, flags set, redirecting to dashboard...');
      
      // Redirect to dashboard
      router.push("/dashboard");
    } else {
      console.error('❌ API returned success: false', data);
      throw new Error(data.error || 'Unknown error occurred');
    }
  } catch (err) {
    console.error("💥 Finish subject error:", err);
    alert(`Error finishing subject: ${err instanceof Error ? err.message : 'Please try again.'}`);
  } finally {
    setFinishLoading(false);
  }
};
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

  const quickQuestions = [
    "How can I improve my grades?",
    "What should I focus on?",
    "Study schedule suggestions?",
    "How to prepare for exams?"
  ]

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

    if (window.confirm("Are you sure you want to delete this item?")) {
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
      }
    }
    setDropdownOpenId(null)
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
    <div className="min-h-screen bg-gray-100 p-10 flex justify-center relative">
      {/* FLOATING BACK BUTTON - TOP LEFT */}
      <div className="fixed top-6 left-6 z-40">
        <button
          onClick={() => router.push("/dashboard")}
          className="px-5 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 border border-gray-200 flex items-center gap-2 transition-all duration-200 hover:shadow-xl"
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
      <div className="w-[1100px] rounded-3xl shadow-2xl p-8">
        {/* HEADER */}
        <div 
          className="p-8 rounded-2xl text-white flex justify-between items-center shadow-lg relative overflow-hidden"
        >
          {/* Background with proper color */}
          <div 
            className="absolute inset-0 z-0"
            style={{ 
              background: subject?.color 
                ? `linear-gradient(135deg, ${subject.color} 0%, ${subject.color}dd 50%, ${subject.color}aa 100%)`
                : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)'
            }}
          />
          
          {/* Content */}
          <div className="relative z-10 flex items-center gap-3">
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
                  className="text-3xl font-bold px-3 py-1 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
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

          {/* Grade Metrics */}
          <div className="relative z-10 flex items-center gap-4">
            {/* Grade Metrics with Icons */}
            <div className="flex gap-8 text-center">
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
                  <div className="text-sm text-white/90">Target Grade</div>
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
                      <div className="text-2xl font-bold">
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
                  <div className="text-sm text-white/90">Projected Grade</div>
                  <div className="text-2xl font-bold">{projectedGrade.toFixed(2)}</div>
                  <div className="text-xs opacity-80">
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
                  <div className="text-sm text-white/90">Raw Grade</div>
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

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column - Components */}
          <div className="lg:col-span-2 space-y-6">
            {subject.components.map((component) => {
              const componentProgress = calculateComponentProgress(component)

              return (
                <div key={component.id} className="bg-white rounded-xl border border-gray-300 p-6">
                  {/* Component Header */}
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
                        className="grid grid-cols-5 gap-4 py-2 border-b border-gray-200 last:border-b-0 items-start"
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

            {/* AI Chatbox */}
            <div className="bg-white rounded-xl border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Study Assistant</h3>
              <div className="space-y-4">
                {/* Chat Messages Area */}
                <div 
                  ref={chatContainerRef}
                  className="h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-3"
                >
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                        message.role === 'user' 
                          ? 'bg-blue-500' 
                          : 'bg-green-500'
                      }`}>
                        {message.role === 'user' ? (
                          <span className="text-white text-xs font-bold">U</span>
                        ) : (
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
                        )}
                      </div>
                      <div className={`flex-1 ${
                        message.role === 'user' ? 'text-right' : ''
                      }`}>
                        <p className={`text-sm whitespace-pre-wrap ${
                          message.role === 'user' 
                            ? 'bg-blue-100 text-blue-900' 
                            : 'bg-white text-gray-800'
                        } rounded-lg px-3 py-2 inline-block max-w-[80%]`}>
                          {message.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {aiLoading && (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2 inline-block">
                          Thinking...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Questions */}
                <div className="grid grid-cols-2 gap-2">
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-2 py-1 transition-colors text-left"
                    >
                      {question}
                    </button>
                  ))}
                </div>
                
                {/* Input Area */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your grades, study tips, or anything else..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={aiLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={aiLoading || !userInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {aiLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
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
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    )}
                    Send
                  </button>
                </div>

                {/* Quick Tips */}
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-600 text-center">
                    Ask me about study strategies, grade analysis, time management, or academic advice!
                  </p>
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
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 font-semibold disabled:bg-green-400 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 flex justify-center items-center z-50">
          <div 
            className="absolute inset-0"
            style={{
              background: subject?.color 
                ? `linear-gradient(135deg, ${subject.color}40 0%, ${subject.color}20 50%, ${subject.color}10 100%)`
                : 'linear-gradient(135deg, #4F46E540 0%, #6366F120 50%, #818CF810 100%)'
            }}
          />
          
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6 relative z-10 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-center">Add New Item</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="Item Name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
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
                    value={newItem.score || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, score: e.target.value ? Number.parseInt(e.target.value) : null })
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
                    value={newItem.max || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, max: e.target.value ? Number.parseInt(e.target.value) : null })
                    }
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <CustomDateInput
                  value={newItem.date || ""}
                  onChange={(date) => setNewItem({ ...newItem, date })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Day must be 1-31, Year must be 4 digits</p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setSelectedComponent(null);
                  setNewItem({
                    name: "",
                    score: null,
                    max: null,
                    date: "",
                    target: null,
                    topic: "",
                  });
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
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
        <div className="fixed inset-0 flex justify-center items-center z-50">
          <div 
            className="absolute inset-0"
            style={{
              background: subject?.color 
                ? `linear-gradient(135deg, ${subject.color}40 0%, ${subject.color}20 50%, ${subject.color}10 100%)`
                : 'linear-gradient(135deg, #4F46E540 0%, #6366F120 50%, #818CF810 100%)'
            }}
          />
          
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6 relative z-10 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-center">Edit Item</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
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
                  onChange={(e) => setEditingItem({ ...editingItem, topic: e.target.value })}
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
                      setEditingItem({ ...editingItem, score: e.target.value ? Number.parseInt(e.target.value) : null })
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
                      setEditingItem({ ...editingItem, max: e.target.value ? Number.parseInt(e.target.value) : null })
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
                  onChange={(date) => setEditingItem({ ...editingItem, date })}
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
    </div>
  )
}

function validateDate(dateStr: string): boolean {
  if (!dateStr) return false
  const m = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (String(year).length !== 4) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  return true
}
