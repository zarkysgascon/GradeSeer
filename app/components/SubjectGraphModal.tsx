"use client"

import { ComponentInput } from 'lib/types'
import { useState, useEffect } from 'react'

interface SubjectGraphModalProps {
  isOpen: boolean
  onClose: () => void
  subjectName: string
  components: ComponentInput[]
  subjectColor?: string
}

// Professional color palette for academic grading
const COMPONENT_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#14B8A6',
  '#6366F1', '#22C55E', '#EAB308', '#DC2626', '#A855F7'
]

// Grade scale colors based on performance
const getGradeColor = (percentage: number) => {
  if (percentage >= 90) return '#10B981' // Excellent - Green
  if (percentage >= 80) return '#22C55E' // Very Good - Light Green
  if (percentage >= 75) return '#EAB308' // Good - Yellow
  if (percentage >= 70) return '#F59E0B' // Fair - Orange
  return '#EF4444' // Needs Improvement - Red
}

const getGradeStatus = (percentage: number) => {
  if (percentage >= 90) return 'Excellent'
  if (percentage >= 80) return 'Very Good'
  if (percentage >= 75) return 'Good'
  if (percentage >= 70) return 'Fair'
  return 'Needs Improvement'
}

export default function SubjectGraphModal({ 
  isOpen, 
  onClose, 
  subjectName, 
  components,
  subjectColor = '#4F46E5'
}: SubjectGraphModalProps) {
  const [activeView, setActiveView] = useState<'graph' | 'detailed'>('graph')
  const [isVisible, setIsVisible] = useState(false)

  // Handle animation states - FIXED VERSION
useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  // Don't render anything if modal is not open - THIS FIXES THE CLICK ISSUE
  if (!isOpen) return null

  // Calculate component progress for each component
  const calculateComponentProgress = (component: ComponentInput) => {
    const items = component.items || []
    const validItems = items.filter(item => 
      item.score !== null && item.score !== undefined && 
      item.max !== null && item.max !== undefined && 
      item.max > 0
    )
    
    if (validItems.length === 0) return 0

    const totalScore = validItems.reduce((sum, item) => sum + (item.score || 0), 0)
    const totalMax = validItems.reduce((sum, item) => sum + (item.max || 0), 0)

    return totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(1)) : 0
  }

  const componentProgress = components.map((component, index) => ({
    id: component.id,
    name: component.name,
    progress: calculateComponentProgress(component),
    weight: component.percentage,
    items: component.items || [],
    color: COMPONENT_COLORS[index % COMPONENT_COLORS.length],
    gradeColor: getGradeColor(calculateComponentProgress(component)),
    status: getGradeStatus(calculateComponentProgress(component))
  }))

  // Calculate overall subject statistics
  const totalWeightedProgress = componentProgress.reduce((sum, comp) => 
    sum + (comp.progress * comp.weight / 100), 0
  )
  const totalWeight = componentProgress.reduce((sum, comp) => sum + comp.weight, 0)
  const overallProgress = totalWeight > 0 ? totalWeightedProgress / (totalWeight / 100) : 0

  const maxProgress = Math.max(...componentProgress.map(cp => cp.progress), 100)
  const completedItems = componentProgress.reduce((sum, comp) => 
    sum + comp.items.filter(item => item.score !== null && item.score !== undefined).length, 0
  )
  const totalItems = componentProgress.reduce((sum, comp) => sum + comp.items.length, 0)

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Enhanced Backdrop with blur and fade animation */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-lg transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Animated Modal Container */}
      <div 
        className={`
          bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden relative z-10
          transform transition-all duration-500 ease-out
          ${isVisible 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4'
          }
        `}
      >
        {/* Enhanced Header with Gradient */}
        <div 
          className="p-6 text-white relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 50%, ${subjectColor}99 100%)`
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/20 rounded-full translate-y-24 -translate-x-24"></div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-2xl font-bold mb-1">{subjectName}</h2>
                <p className="text-white/90 text-base">Progress Breakdown & Analytics</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 group-hover:rotate-90 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <div className="text-xl font-bold">{overallProgress.toFixed(1)}%</div>
                <div className="text-white/80 text-xs">Overall Progress</div>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <div className="text-xl font-bold">{componentProgress.length}</div>
                <div className="text-white/80 text-xs">Components</div>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <div className="text-xl font-bold">{completedItems}/{totalItems}</div>
                <div className="text-white/80 text-xs">Items Scored</div>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <div className="text-xl font-bold">{getGradeStatus(overallProgress)}</div>
                <div className="text-white/80 text-xs">Status</div>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-3">
            <button
              onClick={() => setActiveView('graph')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all duration-200 ${
                activeView === 'graph'
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              📊 Progress Graph
            </button>
            <button
              onClick={() => setActiveView('detailed')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all duration-200 ${
                activeView === 'detailed'
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              📋 Detailed Analysis
            </button>
          </div>
        </div>

        {/* Content Area with proper scroll containment */}
        <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(95vh - 280px)' }}>
          {activeView === 'graph' ? (
            <div className="space-y-6">
              {/* Main Graph Section - Made more compact */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-5 bg-blue-600 rounded-full"></div>
                  Component Performance Overview
                </h3>
                
                <div className="flex items-end justify-between gap-3 h-48 border-b border-l border-gray-300 pb-4 pl-6">
                  {componentProgress.map((component, index) => (
                    <div 
                      key={component.id} 
                      className="flex flex-col items-center gap-2 flex-1 animate-in fade-in"
                      style={{ 
                        animationDelay: `${index * 100}ms`,
                        animationDuration: '500ms'
                      }}
                    >
                      {/* Percentage Label */}
                      <div className="text-center">
                        <div className="text-lg font-bold" style={{ color: component.gradeColor }}>
                          {component.progress}%
                        </div>
                        <div className="text-xs font-medium text-gray-500">{component.status}</div>
                      </div>
                      
                      {/* Bar Container */}
                      <div className="flex flex-col items-center gap-1 w-full">
                        {/* Bar */}
                        <div className="w-full max-w-12 relative group">
                          <div 
                            className="rounded-lg transition-all duration-700 ease-out relative overflow-hidden shadow-md hover:shadow-lg hover:scale-105"
                            style={{ 
                              height: `${(component.progress / maxProgress) * 100}%`,
                              backgroundColor: component.color,
                              minHeight: '20px',
                              background: `linear-gradient(to top, ${component.color}dd, ${component.color})`
                            }}
                          >
                            {/* Shine effect */}
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-lg"></div>
                            
                            {/* Tooltip */}
                            <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 min-w-32 shadow-xl">
                              <div className="text-sm font-semibold mb-1">{component.name}</div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between gap-2">
                                  <span>Progress:</span>
                                  <span className="font-semibold">{component.progress}%</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span>Weight:</span>
                                  <span className="font-semibold">{component.weight}%</span>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Component Info */}
                        <div className="text-center space-y-1">
                          <div className="text-xs font-semibold text-gray-700 leading-tight line-clamp-2 min-h-[2rem] flex items-center justify-center">
                            {component.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {component.weight}% weight
                          </div>
                          <div className="text-xs text-gray-400">
                            {component.items.filter(item => item.score !== null).length}/{component.items.length} scored
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribution Cards - Improved layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Performance Distribution - Fixed layout */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-base">📈</span>
                    Performance Distribution
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {componentProgress.map((component, index) => (
                      <div 
                        key={component.id} 
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 animate-in fade-in"
                        style={{ 
                          animationDelay: `${index * 150}ms`,
                          animationDuration: '500ms'
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: component.color }}
                          ></div>
                          <span className="font-medium text-gray-700 text-sm truncate">{component.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${component.progress}%`,
                                backgroundColor: component.gradeColor
                              }}
                            ></div>
                          </div>
                          <span 
                            className="font-semibold text-sm w-12 text-right"
                            style={{ color: component.gradeColor }}
                          >
                            {component.progress}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weight Distribution - Fixed layout */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-base">⚖️</span>
                    Weight Distribution
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {componentProgress.map((component, index) => (
                      <div 
                        key={component.id} 
                        className="space-y-2 animate-in fade-in"
                        style={{ 
                          animationDelay: `${index * 150}ms`,
                          animationDuration: '500ms'
                        }}
                      >
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: component.color }}
                            ></div>
                            <span className="font-medium text-gray-700 truncate">{component.name}</span>
                          </div>
                          <span className="text-gray-600 font-semibold flex-shrink-0 ml-2">{component.weight}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${component.weight}%`,
                              backgroundColor: component.color
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Detailed Analysis View */
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Component Details</h3>
                <div className="space-y-3">
                  {componentProgress.map((component, index) => (
                    <div 
                      key={component.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all duration-200 animate-in fade-in"
                      style={{ 
                        animationDelay: `${index * 100}ms`,
                        animationDuration: '500ms'
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-gray-800">{component.name}</h4>
                          <p className="text-gray-600 text-sm mt-1">Weight: {component.weight}%</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div 
                            className="text-xl font-bold"
                            style={{ color: component.gradeColor }}
                          >
                            {component.progress}%
                          </div>
                          <div className="text-xs font-medium text-gray-500">{component.status}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="text-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <div className="font-semibold text-gray-800">{component.items.length}</div>
                          <div className="text-gray-600">Total Items</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <div className="font-semibold text-gray-800">
                            {component.items.filter(item => item.score !== null).length}
                          </div>
                          <div className="text-gray-600">Scored Items</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <div className="font-semibold text-gray-800">{component.weight}%</div>
                          <div className="text-gray-600">Weight</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <div className="font-semibold text-gray-800">
                            {((component.progress * component.weight) / 100).toFixed(1)}%
                          </div>
                          <div className="text-gray-600">Contribution</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        <div className="border-t border-gray-200 bg-gray-50/50 p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Overall Grade Status: <span className="font-semibold" style={{ color: getGradeColor(overallProgress) }}>
                {getGradeStatus(overallProgress)}
              </span>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}