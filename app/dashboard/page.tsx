"use client";

import { useEffect, useState, ChangeEvent, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import DashboardSearch from "./search";


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
  topic?: string | null;
  componentName?: string;
  subjectName?: string;
  subjectId?: string;
  completed?: boolean;
}

interface Subject {
  id: string;
  name: string;
  is_major: boolean;
  target_grade?: number | null;
  color: string;
  components: ComponentInput[];
  items?: ItemInput[];
  units?: number;
}

interface HistoryRecord {
  id: string;
  subject_id: string;
  user_email: string;
  course_name: string;
  target_grade: string;
  final_grade: string;
  status: 'reached' | 'missed';
  completed_at: string;
}

interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/* ------------------------- Calculations ------------------------- */

function computeRawGrade(components: ComponentInput[]) {
  if (!components || components.length === 0) return 0;
  
  let totalWeightedGrade = 0;
  let totalWeight = 0;

  components.forEach(component => {
    const componentGrade = computeComponentGrade(component);
    const weight = component.percentage / 100;
    
   
    totalWeightedGrade += componentGrade * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) return 0;
  
  return Number(totalWeightedGrade.toFixed(2));
}

function computeComponentGrade(component: ComponentInput): number {
  if (!component.items || component.items.length === 0) return 0;
  
  const validItems = component.items.filter(item => 
    item.score !== null && 
    item.score !== undefined && 
    item.max !== null && 
    item.max !== undefined && 
    item.max > 0
  );
  
  if (validItems.length === 0) return 0;

  const totalScore = validItems.reduce((sum, item) => sum + (item.score || 0), 0);
  const totalMax = validItems.reduce((sum, item) => sum + (item.max || 0), 0);

  if (totalMax === 0) return 0;

  const percentage = (totalScore / totalMax) * 100;
  return Number(percentage.toFixed(2));
}

function computeCompletionProgress(subject: Subject): number {
  if (!subject.components || subject.components.length === 0) return 0;
  
  let totalItems = 0;
  let completedItems = 0;

  subject.components.forEach((component) => {
    if (component.items && component.items.length > 0) {
      component.items.forEach((item) => {
        totalItems++;
        if (item.score !== null && item.score !== undefined) {
          completedItems++;
        }
      });
    }
  });

  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  return progress;
}

// Philippine Grading System: 1.00 (Highest) to 5.00 (Lowest), 3.00+ is failing
function percentageToGradeScale(percentage: number): number {
  if (percentage >= 97) return 1.0;
  if (percentage >= 94) return 1.25;
  if (percentage >= 91) return 1.5;
  if (percentage >= 88) return 1.75;
  if (percentage >= 85) return 2.0;
  if (percentage >= 82) return 2.25;
  if (percentage >= 79) return 2.5;
  if (percentage >= 76) return 2.75;
  if (percentage >= 75) return 3.0;  // Passing grade
  if (percentage >= 72) return 4.0;  // Conditional failure
  return 5.0; // Failure
}

function getGradeStatus(grade: number): { status: string; color: string; bgColor: string } {
  if (grade <= 1.75) return { status: "Excellent", color: "text-green-600", bgColor: "bg-green-100" };
  if (grade <= 2.50) return { status: "Very Good", color: "text-blue-600", bgColor: "bg-blue-100" };
  if (grade <= 3.00) return { status: "Passing", color: "text-yellow-600", bgColor: "bg-yellow-100" };
  if (grade <= 4.00) return { status: "Conditional", color: "text-orange-600", bgColor: "bg-orange-100" };
  return { status: "Failed", color: "text-red-600", bgColor: "bg-red-100" };
}

/* ---------------------- Utility Functions ---------------------- */
const generateColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
};

const predefinedColors = [
  "#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#E0BBE4",
  "#FFDFBA", "#B5EAD7", "#C7CEEA", "#F8B195", "#F67280",
  "#C06C84", "#6C5B7B", "#355C7D", "#99B898", "#FECEAB",
  "#FF847C", "#E84A5F", "#2A363B", "#A8E6CE", "#DCEDC2"
];

const BackgroundImage = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400"></div>
    
    {/* Single floating image */}
    <div 
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: 'url("/bg.png")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        animation: 'floatUpDown 4s ease-in-out infinite'
      }}
    ></div>
  </div>
);

/* ---------------------- Circular Progress Component ---------------------- */
const CircularProgress = ({ 
  progress, 
  size = 80, 
  strokeWidth = 8,
  color = "#3B82F6" 
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-800">{progress}%</span>
      </div>
    </div>
  );
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
      placeholder={placeholder || "0"}
      min={min}
      max={max}
      className={`${className} ${value === 0 ? "text-gray-400" : "text-gray-900"}`}
      {...props}
    />
  );
};

/* ---------------------- GWA Calculator Modal ---------------------- */
const GPACalculatorModal = ({ 
  isOpen, 
  onClose, 
  subjects,
  selectedSubjects,
  onAddSubject,
  onRemoveSubject,
  onCalculate,
  onReset,
  gpaResult 
}: {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  selectedSubjects: Subject[];
  onAddSubject: (subject: Subject) => void;
  onRemoveSubject: (subjectId: string) => void;
  onCalculate: () => void;
  onReset: () => void;
  gpaResult: { gpa: number; totalWeightedScore: number; totalUnits: number } | null;
}) => {
  if (!isOpen) return null;

  const availableSubjects = subjects.filter(subject => 
    !selectedSubjects.find(s => s.id === subject.id)
  );

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm z-50 p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-white">GWA Calculator</h2>
                <p className="text-blue-100 text-sm">Calculate your General Weighted Average (GWA)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Subjects */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Available Subjects</h3>
              <p className="text-sm text-gray-600">Drag or click subjects to add them to calculation</p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                {availableSubjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p>No subjects available</p>
                    <p className="text-sm">All subjects are already selected</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableSubjects.map(subject => {
                      const currentPercentage = computeRawGrade(subject.components);
                      const currentGrade = percentageToGradeScale(currentPercentage);
                      const gradeStatus = getGradeStatus(currentGrade);
                      
                      return (
                        <div
                          key={subject.id}
                          onClick={() => onAddSubject(subject)}
                          className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
                                {subject.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${gradeStatus.bgColor} ${gradeStatus.color}`}>
                                  {currentGrade.toFixed(2)} - {gradeStatus.status}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {subject.units || 3} units
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {currentPercentage.toFixed(1)}%
                              </div>
                              <button className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Subjects & Calculation */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Selected Subjects</h3>
                <span className="text-sm text-gray-500">
                  {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              
              <div className="border-2 border-gray-200 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                {selectedSubjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>No subjects selected</p>
                    <p className="text-sm">Add subjects from the left panel</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSubjects.map(subject => {
                      const currentPercentage = computeRawGrade(subject.components);
                      const currentGrade = percentageToGradeScale(currentPercentage);
                      const gradeStatus = getGradeStatus(currentGrade);
                      const weightedScore = currentGrade * (subject.units || 3);
                      
                      return (
                        <div
                          key={subject.id}
                          className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900">{subject.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${gradeStatus.bgColor} ${gradeStatus.color}`}>
                                  Grade: {currentGrade.toFixed(2)}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Units: {subject.units || 3}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Weighted: {weightedScore.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => onRemoveSubject(subject.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded transition-colors ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Calculation Results */}
              {gpaResult && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">GPA Calculation Result</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{gpaResult.gpa.toFixed(2)}</div>
                      <div className="text-xs text-gray-600">GWA/GPA</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">{gpaResult.totalWeightedScore}</div>
                      <div className="text-xs text-gray-600">Total Weighted</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-600">{gpaResult.totalUnits}</div>
                      <div className="text-xs text-gray-600">Total Units</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded border">
                    <div className="text-sm text-gray-700">
                      <strong>Formula:</strong> GPA = Σ(Grade × Units) ÷ Σ(Units)
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Calculation:</strong> {gpaResult.totalWeightedScore} ÷ {gpaResult.totalUnits} = {gpaResult.gpa.toFixed(2)}
                    </div>
                    <div className={`mt-2 text-sm font-medium ${
                      gpaResult.gpa <= 1.75 ? 'text-green-600' :
                      gpaResult.gpa <= 2.50 ? 'text-blue-600' :
                      gpaResult.gpa <= 3.00 ? 'text-yellow-600' :
                      gpaResult.gpa <= 4.00 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      Status: {getGradeStatus(gpaResult.gpa).status}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onReset}
                  disabled={selectedSubjects.length === 0}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={onCalculate}
                  disabled={selectedSubjects.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Calculate GPA
                </button>
              </div>
            </div>
          </div>

          {/* Philippine Grading System Legend */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Philippine Grading System</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>1.00-1.75: Excellent</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>1.76-2.50: Very Good</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>2.51-3.00: Passing</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>3.01-4.00: Conditional</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>4.01-5.00: Failed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------------- Dashboard Component ---------------------- */
export default function Dashboard() { 
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"subjects" | "pending" | "history">("subjects");
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [upcomingItems, setUpcomingItems] = useState<ItemInput[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<{ id: string; role: 'user'|'assistant'; content: string; timestamp: Date; }[]>([]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (assistantOpen) inputRef.current?.focus();
  }, [assistantOpen]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // GWA Calculator States
  const [showGPAModal, setShowGPAModal] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [gpaResult, setGpaResult] = useState<{ gpa: number; totalWeightedScore: number; totalUnits: number } | null>(null);

  const user = session?.user as ExtendedUser | undefined;

  // Comparator: put names starting with digits first, then alphabetical
  const compareSubjectNames = (a: { name: string }, b: { name: string }) => {
    const na = (a.name || '').trim().toLowerCase();
    const nb = (b.name || '').trim().toLowerCase();
    const isDigitA = /^[0-9]/.test(na);
    const isDigitB = /^[0-9]/.test(nb);
    if (isDigitA && !isDigitB) return -1;
    if (!isDigitA && isDigitB) return 1;
    return na.localeCompare(nb);
  };

  /* ---------------------- GWA Calculator Functions ---------------------- */
  const calculateGPA = (subjects: Subject[]) => {
    let totalWeightedScore = 0;
    let totalUnits = 0;
    
    subjects.forEach(subject => {
      const currentPercentage = computeRawGrade(subject.components);
      const currentGrade = percentageToGradeScale(currentPercentage);
      const units = subject.units || 3;
      
      totalWeightedScore += currentGrade * units;
      totalUnits += units;
    });
    
    const gpa = totalUnits > 0 ? totalWeightedScore / totalUnits : 0;
    
    return {
      gpa: Number(gpa.toFixed(2)),
      totalWeightedScore: Number(totalWeightedScore.toFixed(2)),
      totalUnits
    };
  };

  const handleAddSubject = (subject: Subject) => {
    if (!selectedSubjects.find(s => s.id === subject.id)) {
      setSelectedSubjects(prev => [...prev, subject]);
    }
  };

  const handleRemoveSubject = (subjectId: string) => {
    setSelectedSubjects(prev => prev.filter(s => s.id !== subjectId));
  };

  const handleCalculateGPA = () => {
    const result = calculateGPA(selectedSubjects);
    setGpaResult(result);
  };

  const handleResetCalculator = () => {
    setSelectedSubjects([]);
    setGpaResult(null);
  };

  const handleOpenGPAModal = () => {
    setShowGPAModal(true);
    setSelectedSubjects([]);
    setGpaResult(null);
  };

  const sendDashboardAssistantMessage = async () => {
    if (!assistantInput.trim() || !user?.email) return;
    const msg = { id: Date.now().toString(), role: 'user' as const, content: assistantInput, timestamp: new Date() };
    setAssistantMessages(prev => [...prev, msg]);
    setAssistantInput("");
    setAssistantLoading(true);
    try {
      const res = await fetch('/api/ai/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, message: msg.content })
      });
      if (res.ok) {
        const data = await res.json();
        const text = String(data?.response || '');
        if (text) {
          const a = { id: (Date.now()+1).toString(), role: 'assistant' as const, content: text, timestamp: new Date() };
          setAssistantMessages(prev => [...prev, a]);
        }
      } else {
        const a = { id: (Date.now()+1).toString(), role: 'assistant' as const, content: 'I could not generate advice right now. Try again later.', timestamp: new Date() };
        setAssistantMessages(prev => [...prev, a]);
      }
    } finally {
      setAssistantLoading(false);
    }
  };

  /* ---------------------- Fetch History ---------------------- */
  const fetchHistory = async () => {
    if (!user?.email) {
      console.log('❌ No user email available for fetching history');
      return;
    }

    try {
      console.log('🔄 Fetching history for:', user.email);
      
      // First try API
      const res = await fetch(`/api/subjects/history?email=${encodeURIComponent(user.email)}`);
      
      if (res.ok) {
        const apiHistory = await res.json();
        console.log('🌐 API history data:', apiHistory.length, 'records');
        
        if (apiHistory.length > 0) {
          setHistory(apiHistory);
          // Also update localStorage as backup
          const localHistoryKey = `user_history_${user.email}`;
          localStorage.setItem(localHistoryKey, JSON.stringify(apiHistory));
          return;
        }
      }
      
      // If API fails or returns empty, try localStorage
      console.log('🌐 API returned empty or failed, trying localStorage...');
      const localHistoryKey = `user_history_${user.email}`;
      const localHistory = JSON.parse(localStorage.getItem(localHistoryKey) || '[]');
      
      if (localHistory.length > 0) {
        console.log('📱 Using local history data:', localHistory.length, 'records');
        setHistory(localHistory);
      } else {
        console.log('💡 No history data found anywhere');
        setHistory([]);
      }
      
    } catch (err) {
      console.error("💥 Error fetching history:", err);
      // Final fallback to local storage
      const localHistoryKey = `user_history_${user.email}`;
      const localHistory = JSON.parse(localStorage.getItem(localHistoryKey) || '[]');
      setHistory(localHistory);
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

  /* ---------------------- Fetch Upcoming Items ---------------------- */
  const fetchUpcomingItems = async () => {
    if (!user?.email) return;

    try {
      console.log('🔄 Fetching upcoming items for:', user.email);
      const res = await fetch(`/api/items/upcoming?email=${encodeURIComponent(user.email)}`);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Upcoming items data:', data);
        setUpcomingItems(data);
      } else {
        console.error('❌ Failed to fetch upcoming items:', res.status);
        const errorText = await res.text();
        console.error('Error details:', errorText);
      }
    } catch (err) {
      console.error("💥 Error fetching upcoming items:", err);
    }
  };

  useEffect(() => {
    if (!user?.email) return;

    fetchUpcomingItems();
    const interval = setInterval(() => {
      fetchUpcomingItems();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.email]);

  /* ---------------------- Fetch History when tab is active ---------------------- */
  useEffect(() => {
    if (activeTab === "history" && user?.email) {
      console.log('📊 History tab activated, fetching history...');
      
      // Check if we need to refresh after finishing a subject
      const shouldRefresh = localStorage.getItem('shouldRefreshHistory');
      if (shouldRefresh === 'true') {
        console.log('🔄 Auto-refreshing history after subject completion');
        localStorage.removeItem('shouldRefreshHistory');
      }
      
      fetchHistory();
    }
  }, [activeTab, user?.email]);

  /* ---------------------- Modal States ---------------------- */
  const [newSubject, setNewSubject] = useState({
    name: "",
    is_major: false,
    target_grade: 0,
    color: generateColor(),
    components: [] as ComponentInput[],
    units: 3,
  });

  const [newComponent, setNewComponent] = useState<ComponentInput>({
    name: "",
    percentage: 0,
    priority: 1,
  });
  // Subject delete confirmation modal state
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Percentage exceed modal state
  const [percentErrorModal, setPercentErrorModal] = useState<{ open: boolean; currentTotal: number; attempted: number }>({ open: false, currentTotal: 0, attempted: 0 });

  // Generic message modal state
  const [messageModal, setMessageModal] = useState<{ open: boolean; title?: string; message: string }>({ open: false, title: '', message: '' });

  // History delete confirmation modal state
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);
  const [showDeleteHistoryModal, setShowDeleteHistoryModal] = useState(false);

  /* ---------------------- Auth Redirect ---------------------- */
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  /* ---------------------- Fetch Subjects ---------------------- */
  useEffect(() => {
    if (status !== "authenticated" || !user?.email) return;

    const fetchSubjects = async () => {
      try {
        const res = await fetch(`/api/subjects?email=${encodeURIComponent(user.email!)}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: Subject[] = data.map((s: any) => ({
            ...s,
            id: s.id || s._id,
            components: s.components || [],
            color: s.color || generateColor(),
            units: s.units || 3,
          }));
          mapped.sort(compareSubjectNames);
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
  // Calculate totals and check for duplicate priority
  const currentTotal = newSubject.components.reduce((sum, c) => sum + c.percentage, 0);
  const newTotal = currentTotal + newComponent.percentage;

  const duplicate = newSubject.components.some(
    (c) => c.priority === newComponent.priority && c.name !== newComponent.name
  );

  // If both exceed and duplicate occur, show a combined modal
  if (newTotal > 100 && duplicate) {
    setMessageModal({
      open: true,
      title: 'A component with that priority already exist and Duplicate priority',
      message: `A component with that priority already exists. Current total: ${currentTotal}%. Adding ${newComponent.percentage}% would exceed 100% limit. Also Duplicate Priority`,
    });
    return;
  }

  // Check if adding would exceed 100%
  if (newTotal > 100) {
    setPercentErrorModal({ open: true, currentTotal, attempted: newComponent.percentage });
    return;
  }

  // Existing validation checks
  if (!newComponent.name.trim()) {
    setMessageModal({ open: true, title: 'Component required', message: 'Component name required!' });
    return;
  }

  if (duplicate) {
    setMessageModal({ open: true, title: 'Duplicate priority', message: 'A component with that priority already exists.' });
    return;
  }

  // Add/Update component
  const updated = [...newSubject.components];
  const idx = updated.findIndex((c) => c.name === newComponent.name);

  if (idx >= 0) updated[idx] = newComponent;
  else updated.push(newComponent);

  setNewSubject({ ...newSubject, components: updated });

  // Reset form
  setNewComponent({
    name: "",
    percentage: 0,
    priority: updated.length + 1,
  });
};

  /* ---------------------- Remove Component ---------------------- */
  const handleRemoveComponent = (index: number) => {
    const updated = [...newSubject.components];
    updated.splice(index, 1);
    setNewSubject({ ...newSubject, components: updated });
  };

  /* ---------------------- Save Subject ---------------------- */
  const handleSaveSubject = async () => {
    if (!user?.email || !newSubject.name.trim()) return;
    const totalPct = newSubject.components.reduce((sum, c) => sum + (c.percentage || 0), 0);
    if (newSubject.components.length === 0) {
      setMessageModal({ open: true, title: 'Components required', message: 'Add at least one grading component.' });
      return;
    }
    if (totalPct > 100) {
      setMessageModal({ open: true, title: 'Total exceeds 100%', message: 'Total component percentage must be 100% or less.' });
      return;
    }
    if (!newSubject.target_grade || newSubject.target_grade === 0) {
      setMessageModal({ open: true, title: 'Target grade required', message: 'Select a target grade.' });
      return;
    }

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
          units: newSubject.units || 3,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        console.log('Subject created:', result);
        
        setShowSuccess(true);
        setShowModal(false);
        setNewSubject({
          name: "",
          is_major: false,
          target_grade: 0,
          color: generateColor(),
          components: [],
          units: 3,
        });
        
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Refresh subjects list
        const refreshRes = await fetch(`/api/subjects?email=${encodeURIComponent(user.email!)}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const mapped: Subject[] = data.map((s: any) => ({
            ...s,
            id: s.id || s._id,
            components: s.components || [],
            color: s.color || generateColor(),
            units: s.units || 3,
          }));
          mapped.sort(compareSubjectNames);
          setSubjects(mapped);
        }
        
        await fetchUpcomingItems();
      } else {
        const errorData = await res.json();
        setMessageModal({ open: true, title: 'Save failed', message: `Failed to save subject: ${errorData.error || "Unknown error"}` });
      }
    } catch (err) {
      console.error(err);
      setMessageModal({ open: true, title: 'Save error', message: 'Error saving subject.' });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------- Delete Subject ---------------------- */
  // Open delete confirmation modal (actual deletion performed in confirmDeleteSubject)
  const handleDeleteSubject = (subjectId: string) => {
    setSubjectToDelete(subjectId);
    setShowDeleteModal(true);
  };

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;

    try {
      const res = await fetch(`/api/subjects/${subjectToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSubjects(prev => prev.filter(s => s.id !== subjectToDelete));
        // Refresh upcoming items after deletion
        await fetchUpcomingItems();
        setShowDeleteModal(false);
        setSubjectToDelete(null);
      } else {
        const errText = await res.text();
        setMessageModal({ open: true, title: 'Delete failed', message: `Failed to delete subject: ${errText || res.statusText}` });
      }
    } catch (err) {
      console.error("Error deleting subject:", err);
      setMessageModal({ open: true, title: 'Delete error', message: 'Error deleting subject.' });
    }
  };

  /* ---------------------- Handle Modal Close ---------------------- */
  const handleModalClose = () => {
    setShowModal(false);
    setNewSubject({
      name: "",
      is_major: false,
      target_grade: 0,
      color: generateColor(),
      components: [],
      units: 3,
    });
    setNewComponent({
      name: "",
      percentage: 0,
      priority: 1,
    });
  };

  if (status === "loading")
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;

  /* ---------------------- Format Date ---------------------- */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /* ---------------------- Delete History Record ---------------------- */
  const handleDeleteHistory = async (historyId: string) => {
    if (!historyId) return;
    try {
      const res = await fetch(`/api/history/${historyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete history');
      setHistory(prev => prev.filter((h: any) => h.id !== historyId));

      // Also remove from localStorage cache so it doesn't reappear on refresh
      if (user?.email) {
        const key = `user_history_${user.email}`;
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = Array.isArray(local) ? local.filter((h: any) => h.id !== historyId) : [];
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to delete history record:', err);
    }
  };

  // Open confirmation modal for history deletion
  const handleRequestDeleteHistory = (historyId: string) => {
    setHistoryToDelete(historyId);
    setShowDeleteHistoryModal(true);
  };

  // Confirm deletion from modal
  const confirmDeleteHistory = async () => {
    if (!historyToDelete) return;
    await handleDeleteHistory(historyToDelete);
    setShowDeleteHistoryModal(false);
    setHistoryToDelete(null);
  };

    /* ---------------------- Handle Subject Card Click ---------------------- */  // ← ADDED HERE
  const handleSubjectClick = (subjectId: string) => {
    // Navigate to subject page with showGraph parameter to auto-open the modal
    router.push(`dashboard/subject/${subjectId}?showGraph=true`)
  }

  /* ---------------------- UI Return ---------------------- */
  const displayedSubjects = subjects
    .filter((s) => {
      if (!searchQuery || !searchQuery.trim()) return true;
      const first = searchQuery.trim()[0].toLowerCase();
      return s.name.toLowerCase().startsWith(first);
    })
    .slice()
    .sort(compareSubjectNames);
  return (
    <div className="min-h-screen bg-transparent relative overflow-y-auto">
      {/* Animated Background */}
      <BackgroundImage />
      
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right-full duration-500">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 border-l-4 border-green-600">
            <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Subject Created!</p>
              <p className="text-green-100 text-sm">Your subject has been added successfully.</p>
            </div>
          </div>
        </div>
      )}
      {/* Message Modal */}
      {messageModal.open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-[9999]"
          onClick={() => setMessageModal({ open: false, title: '', message: '' })}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <h3 className="text-lg font-semibold mb-2">{messageModal.title || 'Notice'}</h3>
            <p className="text-sm text-gray-600 mb-4">{messageModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMessageModal({ open: false, title: '', message: '' })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Percent Exceed Modal */}
      {percentErrorModal.open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-[9999]"
          onClick={() => setPercentErrorModal({ open: false, currentTotal: 0, attempted: 0 })}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <h3 className="text-lg font-semibold mb-2">Cannot add component</h3>
            <p className="text-sm text-gray-600 mb-4">
              {`Current total: ${percentErrorModal.currentTotal}%. Adding ${percentErrorModal.attempted}% would exceed 100% limit.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPercentErrorModal({ open: false, currentTotal: 0, attempted: 0 })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-white/90 backdrop-blur-md shadow-md px-10 py-4 flex items-center justify-between relative z-10">
        <div className="flex-1 flex justify-start">
          <button
            onClick={() => {
              try {
                // If user is on a different tab within dashboard (pending/history), switch to subjects
                if (activeTab && activeTab !== 'subjects') {
                  setActiveTab('subjects');
                  return;
                }

                if (typeof window !== 'undefined' && window.location.pathname === '/dashboard') {
                  // If already on dashboard subjects, refresh to reload data
                  router.refresh();
                } else {
                  // Otherwise navigate to dashboard
                  router.push('/dashboard');
                }
              } catch (e) {
                // Fallback: navigate
                router.push('/dashboard');
              }
            }}
            aria-label="Go to Dashboard"
            className="p-0 m-0 bg-transparent border-0 cursor-pointer"
          >
            <Image src="/gslogo.png" alt="Logo" width={80} height={80} className="drop-shadow-sm" />
          </button>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="flex gap-80">
            {["subjects", "pending", "history"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`capitalize font-medium transition-all relative ${
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
          <button onClick={() => router.push("/profile")} className="group">
            <Image
              src={profileImage || user?.image || "/default.png"}
              alt="Profile"
              width={50}
              height={50}
              className="rounded-full cursor-pointer border-2 border-gray-300 group-hover:border-blue-500 transition-all duration-300 shadow-sm"
            />
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="p-6 relative z-10 overflow-y-auto">
        {/* SUBJECTS TAB */}
        {activeTab === "subjects" && (
          <div className="max-w-7xl mx-auto">
            
            {/* Header Section */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex-1 flex justify-center">
                  <div className="w-96">
                    <DashboardSearch
                      items={subjects.map((s) => s.name)}
                      maxResults={5}
                      placeholder="Search subjects..."
                      className="w-full"
                      onSearch={(q) => setSearchQuery(q)}
                    />
                  </div>
                </div>
              
              <div className="flex-1 flex justify-end">
                <div className="flex gap-4">
                  <button
                    onClick={handleOpenGPAModal}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold flex items-center gap-2 group"
                  >
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    Calculate GWA
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold flex items-center gap-2 group"
                  >
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    Add New Subject
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            {subjects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📚</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{subjects.length}</p>
                      <p className="text-sm text-gray-600">Total Subjects</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        {subjects.filter(subj => {
                          const currentPercentage = computeRawGrade(subj.components);
                          const currentGrade = percentageToGradeScale(currentPercentage);
                          return currentGrade <= (subj.target_grade || 5.0);
                        }).length}
                      </p>
                      <p className="text-sm text-gray-600">On Track</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        {subjects.filter(subj => {
                          const currentPercentage = computeRawGrade(subj.components);
                          const currentGrade = percentageToGradeScale(currentPercentage);
                          return currentGrade > (subj.target_grade || 5.0);
                        }).length}
                      </p>
                      <p className="text-sm text-gray-600">Needs Attention</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBJECT CARDS - 4 CARDS PER ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedSubjects.map((subj) => {
                const currentPercentage = computeRawGrade(subj.components);
                const currentGrade = percentageToGradeScale(currentPercentage);
                const targetGrade = subj.target_grade ? parseFloat(subj.target_grade.toString()) : 0;
                const completionProgress = computeCompletionProgress(subj);
                const belowTarget = currentGrade > targetGrade;
                const gradeDifference = currentGrade - targetGrade;
                const gradeStatus = getGradeStatus(currentGrade);

                // Calculate item counts for completion
                let totalItems = 0;
                let completedItems = 0;
                
                subj.components.forEach(component => {
                  if (component.items && component.items.length > 0) {
                    component.items.forEach(item => {
                      totalItems++;
                      if (item.score !== null && item.score !== undefined) {
                        completedItems++;
                      }
                    });
                  }
                });

                return (
                  <div
                    key={subj.id}
                    onClick={() => handleSubjectClick(subj.id)}
                    className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg cursor-pointer hover:shadow-2xl border border-gray-100 transition-all duration-300 hover:scale-105 overflow-hidden"
                  >
                    {/* Color Header */}
                    <div 
                      className="h-3 w-full"
                      style={{ backgroundColor: subj.color }}
                    />
                    
                    <div className="p-5">
                      {/* Header with Subject Name and Actions */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-800 group-hover:text-gray-900 truncate">
                            {subj.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              subj.is_major 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {subj.is_major ? 'Major' : 'Minor'}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {subj.units || 3} units
                            </span>
                            {belowTarget && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Needs Attention
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubject(subj.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all duration-200 ml-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Grade Display */}
                      <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-xl">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 font-medium">Raw</p>
                          <p className={`text-lg font-bold ${gradeStatus.color}`}>
                            {currentGrade.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 font-medium">Target</p>
                          <p className="text-lg font-bold text-gray-800">{targetGrade.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 font-medium">Diff</p>
                          <p className={`text-sm font-bold ${
                            gradeDifference <= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {gradeDifference <= 0 ? '+' : ''}{(gradeDifference * -1).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Completion Progress Circle */}
                      <div className="flex justify-center items-center mb-4">
                        <div className="text-center">
                          <CircularProgress 
                            progress={completionProgress} 
                            size={80}
                            strokeWidth={8}
                            color="#3B82F6"
                          />
                          <p className="text-xs text-gray-600 mt-2 font-medium">Completion</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {completedItems}/{totalItems} items scored
                          </p>
                        </div>
                      </div>

                      {/* Components Summary */}
                      <div className="flex justify-between items-center text-xs text-gray-600 mb-3">
                        <span>{subj.components?.length || 0} components</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {computeRawGrade(subj.components).toFixed(1)}%
                        </span>
                      </div>

                      {/* Quick Action Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubjectClick(subj.id);
                        }}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 group-hover:bg-blue-50 group-hover:text-blue-600"
                      >
                        View Details
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty State: no subjects at all */}
              {subjects.length === 0 && (
                <div className="col-span-full text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-6xl">📚</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">No subjects yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Start by creating your first subject to track your academic progress and manage your grades effectively.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-lg inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Subject
                  </button>
                </div>
              )}

              {/* No matches for current search */}
              {subjects.length > 0 && displayedSubjects.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No subjects start with \"{searchQuery.trim()[0]}\"</h3>
                  <p className="text-sm text-gray-600">Try a different letter or clear the search.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PENDING TAB */}
        {activeTab === "pending" && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Pending Items
                  </h2>
                  <p className="text-gray-600 mt-2">
                    Items that need your attention - add scores to complete them
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={fetchUpcomingItems}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow hover:shadow-md transition-all duration-300 text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Pending Items Content */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden">
                {upcomingItems.length === 0 ? (
                  // Empty State - No Pending Items
                  <div className="text-center py-16 text-gray-500">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-inner">
                      <span className="text-4xl">✅</span>
                    </div>
                    <p className="text-xl font-semibold mb-2">No pending items!</p>
                    <p className="text-sm max-w-md mx-auto mb-6">
                      Great job! You've scored all your items. 
                      Add new items to your subjects or create new subjects to see them here.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-300 font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add New Subject
                      </button>
                      <button
                        onClick={() => setActiveTab("subjects")}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition-all duration-300 font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        View Subjects
                      </button>
                    </div>
                  </div>
                ) : (
                  // Pending Items List
                  <div className="space-y-4 max-h-[600px] overflow-y-auto p-4">
                    {upcomingItems.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="font-semibold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
                                {item.name}
                              </h4>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                ⏳ Pending
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                </svg>
                                <span><strong>Subject:</strong> {item.subjectName || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span><strong>Component:</strong> {item.componentName || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span><strong>Due Date:</strong> {item.date ? new Date(item.date).toLocaleDateString() : 'No date'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span><strong>Topic:</strong> {item.topic || '—'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">Score:</span>
                                <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                                  {item.score !== null && item.score !== undefined ? item.score : '—'} / {item.max !== null && item.max !== undefined ? item.max : '—'}
                                </span>
                              </div>
                              {item.score === null || item.score === undefined ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Needs Scoring
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => item.subjectId && router.push(`/dashboard/subject/${item.subjectId}`)}
                            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            View Subject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Row */}
              {upcomingItems.length > 0 && (
                <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-200">
                  <div className="text-center p-6 bg-blue-50/80 rounded-2xl backdrop-blur-sm">
                    <div className="text-3xl font-bold text-blue-600">{upcomingItems.length}</div>
                    <div className="text-sm text-gray-600 font-medium">Total Items</div>
                  </div>
                  <div className="text-center p-6 bg-yellow-50/80 rounded-2xl backdrop-blur-sm">
                    <div className="text-3xl font-bold text-yellow-600">
                      {upcomingItems.filter(item => item.score === null || item.score === undefined).length}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Pending</div>
                  </div>
                  <div className="text-center p-6 bg-green-50/80 rounded-2xl backdrop-blur-sm">
                    <div className="text-3xl font-bold text-green-600">
                      {upcomingItems.filter(item => item.score !== null && item.score !== undefined).length}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Completed</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Grade History
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={fetchHistory}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow hover:shadow-md transition-all duration-300 text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {/* History Table */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden">
                {history.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-inner">
                      <span className="text-4xl">📚</span>
                    </div>
                    <p className="text-xl font-semibold mb-2">No history yet</p>
                    <p className="text-sm max-w-md mx-auto">Complete subjects to see your grade history here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50/80 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Course</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Target Grade</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Final Grade</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Completed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {history.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.course_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{record.target_grade}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{record.final_grade}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                record.status === 'reached' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {record.status === 'reached' ? 'Target Reached' : 'Target Missed'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="flex items-center gap-3">
                                <span>{formatDate(record.completed_at)}</span>
                                <button
                                  onClick={() => handleRequestDeleteHistory(record.id)}
                                  className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Delete record"
                                  aria-label="Delete history record"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Assistant Floating Bubble */}
      <button
        aria-label="Open Assistant"
        aria-expanded={assistantOpen}
        aria-controls="dashboard-assistant"
        onClick={() => setAssistantOpen(v => !v)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center z-50 hover:bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <Image src="/gslogo.png" alt="GradeSeer" width={28} height={28} className="object-contain" />
      </button>

      {assistantOpen && (
        <div
          id="dashboard-assistant"
          className="fixed bottom-24 right-6 w-96 max-w-[90vw] h-96 rounded-2xl shadow-2xl border border-gray-200 bg-white/95 backdrop-blur-sm z-50 flex flex-col"
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
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {assistantMessages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <Image src="/gslogo.png" alt="Assistant" width={20} height={20} className="rounded-full mr-2 object-contain" />
                )}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>{m.content}</div>
              </div>
            ))}
            {assistantLoading && <div className="text-sm text-gray-600">Thinking...</div>}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              placeholder="Ask about priorities across subjects"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={assistantLoading}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAssistantOpen(false);
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!assistantLoading && assistantInput.trim() && user?.email) sendDashboardAssistantMessage();
                }
              }}
            />
            <button
              onClick={sendDashboardAssistantMessage}
              disabled={assistantLoading || !assistantInput.trim() || !user?.email}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* ADD SUBJECT MODAL */}
{showModal && (
  <div className="fixed inset-0 flex justify-center items-center bg-black/40 z-50">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h2 className="text-white text-lg font-semibold">Add New Subject</h2>
        </div>
        <p className="text-blue-100 text-sm mt-1">Fill in the subject details and grading components</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[calc(85vh-64px-60px)]">
        {/* LEFT COLUMN - Basic Information */}
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Information
            </h3>
            
            {/* Subject Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Mathematics, Physics, English"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value.slice(0, 50) })}
                maxLength={50}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Required • Max 50 characters</p>
            </div>

            {/* Type and Units in one row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject Type
                </label>
                <select
                  value={newSubject.is_major ? "major" : "minor"}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setNewSubject({ ...newSubject, is_major: e.target.value === "major" })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Core subject or elective</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Units <span className="text-red-500">*</span>
                </label>
                <select
                  value={newSubject.units}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setNewSubject({ ...newSubject, units: parseInt(e.target.value) })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value={1}>1 Unit</option>
                  <option value={2}>2 Units</option>
                  <option value={3}>3 Units</option>
                  <option value={4}>4 Units</option>
                  <option value={5}>5 Units</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Credit weight</p>
              </div>
            </div>

            {/* Target Grade */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target Grade <span className="text-red-500">*</span>
              </label>
              <select
                value={newSubject.target_grade}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setNewSubject({ ...newSubject, target_grade: parseFloat(e.target.value) })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value={0}>Select your target grade</option>
                <option value={1.00}>1.00 - Excellent</option>
                <option value={1.25}>1.25 - Very Good</option>
                <option value={1.50}>1.50 - Good</option>
                <option value={1.75}>1.75 - Very Satisfactory</option>
                <option value={2.00}>2.00 - Satisfactory</option>
                <option value={2.25}>2.25 - Fairly Satisfactory</option>
                <option value={2.50}>2.50 - Fair</option>
                <option value={2.75}>2.75 - Passed</option>
                <option value={3.00}>3.00 - Conditional</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Your goal for this subject</p>
            </div>

            {/* Subject Color */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject Color
              </label>
              <p className="text-xs text-gray-600 mb-3">Choose a color to easily identify this subject</p>
              <div className="flex flex-wrap items-center gap-3">
                {predefinedColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewSubject({ ...newSubject, color: c })}
                    className={`w-8 h-8 rounded-lg border-2 ${newSubject.color === c ? 'border-blue-600 ring-2 ring-blue-300 scale-110' : 'border-gray-300'} hover:scale-105 transition-all duration-200`}
                    style={{ backgroundColor: c }}
                    aria-label={`Choose color ${c}`}
                  />
                ))}
                
                {/* Custom color card */}
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">Custom:</span>
                    <input
                      type="color"
                      value={newSubject.color}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSubject({ ...newSubject, color: e.target.value })}
                      className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                      aria-label="Custom color picker"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 bg-white border border-gray-300 rounded-l text-xs text-gray-600">#</span>
                    <input
                      type="text"
                      value={newSubject.color.replace('#','')}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                        const color = `#${raw}`;
                        setNewSubject({ ...newSubject, color });
                      }}
                      placeholder="Hex code"
                      className="w-20 p-1 border border-gray-300 rounded-r text-xs"
                      aria-label="Custom color hex"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

                {/* Components Section */}
                <div className="border-t pt-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Grading Components</h3>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {newSubject.components.length} added
                    </span>
                  </div>

          {/* Components List */}
          <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto mb-4 bg-gray-50">
            {newSubject.components.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">No components added yet</p>
                <p className="text-xs mt-1">Add your first component below</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newSubject.components.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {c.percentage}%
                        </span>
                        {c.priority > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Priority: {c.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveComponent(i)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove component"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Component Form */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">Add New Component</h4>
            
            <div className="grid grid-cols-[1fr_6rem_4.5rem] gap-2 mb-3">
              <div>
                <input
                  type="text"
                  placeholder="e.g., Final Exam"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  maxLength={80}
                  value={newComponent.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewComponent({ ...newComponent, name: e.target.value.slice(0, 80) })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">Component name</p>
              </div>
              
              <div>
                <NumberInput
                  placeholder="%"
                  value={newComponent.percentage}
                  onChange={(value: number) =>
                    setNewComponent({ ...newComponent, percentage: value })
                  }
                  min={0}
                  max={100}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Weight %</p>
              </div>
              
              <div>
                <NumberInput
                  placeholder="P"
                  value={newComponent.priority}
                  onChange={(value: number) =>
                    setNewComponent({ ...newComponent, priority: value })
                  }
                  min={0}
                  maxDigits={4}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Priority</p>
              </div>
            </div>
            
            <button
              onClick={handleAddOrUpdateComponent}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Component
            </button>
            
            {/* Total Percentage Indicator */}
            {newSubject.components.length > 0 && (
              <div className={`mt-3 text-xs font-medium px-2 py-1 rounded text-center ${
                newSubject.components.reduce((sum, c) => sum + (c.percentage || 0), 0) === 100 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                Total: {newSubject.components.reduce((sum, c) => sum + (c.percentage || 0), 0)}% / 100%
              </div>
            )}
          </div>
        </div>
      </div>

              {/* Footer */}
              <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={handleModalClose}
                  className="px-4 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSubject}
                  disabled={loading || !newSubject.name.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Subject
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
      )}

      {/* GPA CALCULATOR MODAL */}
      <GPACalculatorModal
        isOpen={showGPAModal}
        onClose={() => setShowGPAModal(false)}
        subjects={subjects}
        selectedSubjects={selectedSubjects}
        onAddSubject={handleAddSubject}
        onRemoveSubject={handleRemoveSubject}
        onCalculate={handleCalculateGPA}
        onReset={handleResetCalculator}
        gpaResult={gpaResult}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50" onClick={() => { setShowDeleteModal(false); setSubjectToDelete(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Subject</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this subject? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSubjectToDelete(null); }}
                className="px-4 py-2 bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSubject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Delete Confirmation Modal */}
      {showDeleteHistoryModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
          onClick={() => { setShowDeleteHistoryModal(false); setHistoryToDelete(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete History Record</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this record? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteHistoryModal(false); setHistoryToDelete(null); }}
                className="px-4 py-2 bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteHistory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <GPACalculatorModal
        isOpen={showGPAModal}
        onClose={() => setShowGPAModal(false)}
        subjects={subjects}
        selectedSubjects={selectedSubjects}
        onAddSubject={handleAddSubject}
        onRemoveSubject={handleRemoveSubject}
        onCalculate={handleCalculateGPA}
        onReset={handleResetCalculator}
        gpaResult={gpaResult}
      />

      {/* Add custom styles for floating animation */}
      <style jsx global>{`
        @keyframes floatUpDown {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}