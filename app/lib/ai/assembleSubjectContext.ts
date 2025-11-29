import { Array, Order } from "effect"
import _ from "lodash"

type Item = {
  id: string
  name: string
  score: number | null
  max: number | null
  date: string | null
  target: number | null
  topic: string | null
}

type Component = {
  id: string
  name: string
  percentage: number | string
  priority: number
  items?: Item[]
}

type Subject = {
  id: string
  name: string
  target_grade?: number | string | null
  color?: string
  components: Component[]
}

function toNumber(v: number | string | null | undefined, def = 0): number {
  if (v === null || v === undefined) return def
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : def
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

function computeComponentGrade(items: Item[], fillPercent?: number): number {
  if (!items || items.length === 0) return 0
  const fp = fillPercent
  const totals = _.reduce(items, (acc, item) => {
    const max = toNumber(item.max, 0)
    if (max <= 0) return acc
    const hasScore = item.score !== null && item.score !== undefined
    const score = hasScore ? toNumber(item.score, 0) : fp === undefined ? 0 : (fp / 100) * max
    return { totalScore: acc.totalScore + score, totalMax: acc.totalMax + max }
  }, { totalScore: 0, totalMax: 0 })
  return totals.totalMax > 0 ? Number(((totals.totalScore / totals.totalMax) * 100).toFixed(2)) : 0
}

function computeWeightedPercentage(components: Component[], perComp: (c: Component) => number): number {
  if (!components || components.length === 0) return 0
  const totals = _.reduce(components, (acc, c) => {
    const grade = perComp(c)
    const weight = toNumber(c.percentage, 0) / 100
    return { totalWeighted: acc.totalWeighted + grade * weight, totalWeight: acc.totalWeight + weight }
  }, { totalWeighted: 0, totalWeight: 0 })
  return totals.totalWeight > 0 ? Number((totals.totalWeighted / totals.totalWeight).toFixed(2)) : 0
}

function itemsCompleted(items: Item[]): number {
  return Array.filter(items, (i) => i.score !== null && i.score !== undefined && !!i.max && (i.max as number) > 0).length
}

function itemsTotal(items: Item[]): number {
  return Array.filter(items, (i) => !!i.max && (i.max as number) > 0).length
}

export function assembleSubjectContext(subject: Subject) {
  const targetGrade = toNumber(subject.target_grade, 0)
  const allItems = (subject.components || []).flatMap(c => c.items || [])
  const rawPercentage = computeWeightedPercentage(subject.components || [], c => computeComponentGrade(c.items || [], undefined))
  const projectedPercentage = computeWeightedPercentage(subject.components || [], c => computeComponentGrade(c.items || [], 75))
  const worstPercentage = computeWeightedPercentage(subject.components || [], c => computeComponentGrade(c.items || [], 0))
  const bestPercentage = computeWeightedPercentage(subject.components || [], c => computeComponentGrade(c.items || [], 100))
  const currentGrade = percentageToGradeScale(rawPercentage)
  const projectedGrade = percentageToGradeScale(projectedPercentage)
  const worstCase = percentageToGradeScale(worstPercentage)
  const bestCase = percentageToGradeScale(bestPercentage)
  const percentComplete = itemsTotal(allItems) === 0 ? 0 : Math.round((itemsCompleted(allItems) / itemsTotal(allItems)) * 100)
  const gapToTarget = targetGrade > 0 ? Number((targetGrade - currentGrade).toFixed(2)) : 0
  const safetyZone = targetGrade > 0 ? (currentGrade <= targetGrade ? 'green' : rawPercentage >= 71 ? 'yellow' : 'red') : (rawPercentage >= 75 ? 'green' : rawPercentage >= 65 ? 'yellow' : 'red')

  const componentsCtx = Array.map((subject.components || []), (c) => {
    const compItems = c.items || []
    const compAvgPct = computeComponentGrade(compItems, undefined)
    const progress = itemsTotal(compItems) === 0 ? 0 : Math.round((itemsCompleted(compItems) / itemsTotal(compItems)) * 100)
    return {
      name: c.name,
      weight: toNumber(c.percentage, 0),
      progress,
      averageScore: Number((percentageToGradeScale(compAvgPct)).toFixed(2)),
      targetScore: targetGrade || 0,
      status: targetGrade > 0 ? (percentageToGradeScale(compAvgPct) >= targetGrade ? 'above_target' : 'below_target') : 'unknown'
    }
  })

  const completedAssessments = Array.map(
    Array.filter(allItems, (i) => i.score !== null && i.score !== undefined && !!i.max && (i.max as number) > 0),
    (i) => {
      const percentage = Number((((toNumber(i.score, 0)) / (toNumber(i.max, 0))) * 100).toFixed(2))
      const comp = (subject.components || []).find(c => (c.items || []).some(ci => ci.id === i.id))
      return {
        name: i.name,
        component: comp ? comp.name : '',
        weight: comp ? toNumber(comp.percentage, 0) : 0,
        score: toNumber(i.score, 0),
        maxScore: toNumber(i.max, 0),
        percentage,
        date: i.date || ''
      }
    }
  )

  const upcomingAssessments = Array.map(
    Array.filter(allItems, (i) => i.score === null || i.score === undefined),
    (i) => {
      const comp = (subject.components || []).find(c => (c.items || []).some(ci => ci.id === i.id))
      return {
        name: i.name,
        component: comp ? comp.name : '',
        weight: comp ? toNumber(comp.percentage, 0) : 0,
        dueDate: i.date || '',
        daysUntil: 0
      }
    }
  )

  const quizLike = Array.filter(completedAssessments, (a) => a.name.toLowerCase().includes("quiz"))
  const examLike = Array.filter(completedAssessments, (a) => {
    const n = a.name.toLowerCase()
    return n.includes("midterm") || n.includes("final") || n.includes("exam")
  })
  const quizScores = Array.map(quizLike, (a) => a.score)
  const examScores = Array.map(examLike, (a) => a.score)
  const quizAverage = quizScores.length ? Number(_.mean(quizScores).toFixed(2)) : 0
  const examAverage = examScores.length ? Number(_.mean(examScores).toFixed(2)) : 0

  const performanceInsights = {
    quizAverage,
    examAverage,
    trending: projectedGrade >= currentGrade ? 'improving' : 'declining',
    strongestComponent: Array.sort(
      componentsCtx.slice(),
      Order.reverse(Order.mapInput(Order.number, (c: { name: string; weight: number; progress: number; averageScore: number; targetScore: number; status: string }) => c.averageScore))
    )[0]?.name || '',
    weakestComponent: Array.sort(
      componentsCtx.slice(),
      Order.mapInput(Order.number, (c: { name: string; weight: number; progress: number; averageScore: number; targetScore: number; status: string }) => c.averageScore)
    )[0]?.name || ''
  }

  return {
    subject: {
      name: subject.name,
      targetGrade: targetGrade || 0,
      passingGrade: 2.0,
      gradeScale: '4.0 scale'
    },
    currentStatus: {
      currentGrade: Number(currentGrade.toFixed(2)),
      rawGrade: Number(currentGrade.toFixed(2)),
      projectedGrade: Number(projectedGrade.toFixed(2)),
      percentComplete,
      worstCase: Number(worstCase.toFixed(2)),
      bestCase: Number(bestCase.toFixed(2)),
      gapToTarget,
      safetyZone
    },
    components: componentsCtx,
    completedAssessments,
    upcomingAssessments,
    performanceInsights
  }
}

