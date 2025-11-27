export interface ComponentProgress {
  name: string;
  percentage: number;
  itemsScored: number;
  totalItems: number;
}

export interface SubjectProgressData {
  subjectName: string;
  components: ComponentProgress[];
  overallProgress: number;
}

// Re-export your existing types
export interface ItemInput {
  id?: string;
  name: string;
  score?: number | null;
  max?: number | null;
  date?: string | null;
  target?: number | null;
  topic?: string | null;
}

export interface ComponentInput {
  id: string;
  name: string;
  percentage: number;
  priority: number;
  grade?: number | null;
  items?: ItemInput[];
}

export interface Subject {
  id: string;
  name: string;
  target_grade?: number | null;
  color: string;
  components: ComponentInput[];
}