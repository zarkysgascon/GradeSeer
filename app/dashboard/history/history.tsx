"use client"

interface HistoryEntry {
  id: string
  subjectName: string
  dateStarted: string
  dateCompleted: string
  targetGrade: number
  status: "Pass" | "Failed"
}

// Sample data - replace with actual data from your API
const sampleHistory: HistoryEntry[] = [
  {
    id: "1",
    subjectName: "PathFitt",
    dateStarted: "10/08/2025",
    dateCompleted: "12/08/2025",
    targetGrade: 2,
    status: "Failed",
  },
  {
    id: "2",
    subjectName: "EMath 1011",
    dateStarted: "10/08/2025",
    dateCompleted: "12/08/2025",
    targetGrade: 3,
    status: "Pass",
  },
  {
    id: "3",
    subjectName: "EMath 1015",
    dateStarted: "10/08/2025",
    dateCompleted: "12/08/2025",
    targetGrade: 3,
    status: "Pass",
  },
  {
    id: "4",
    subjectName: "SE 3",
    dateStarted: "10/08/2025",
    dateCompleted: "12/08/2025",
    targetGrade: 3,
    status: "Pass",
  },
]

interface HistoryProps {
  historyData?: HistoryEntry[]
}

export default function History({ historyData = sampleHistory }: HistoryProps) {
  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Table Container */}
      <div className="bg-gray-200 rounded-xl p-4">
        {/* Header Row */}
        <div className="grid grid-cols-5 gap-4 bg-white rounded-xl px-6 py-4 mb-2 shadow-sm">
          <div className="text-center font-medium text-gray-800">
            Subject
            <br />
            Name
          </div>
          <div className="text-center font-medium text-gray-800">
            Date
            <br />
            Started
          </div>
          <div className="text-center font-medium text-gray-800">
            Date
            <br />
            Completed
          </div>
          <div className="text-center font-medium text-gray-800">
            Target
            <br />
            Grade
          </div>
          <div className="text-center font-medium text-gray-800">Status</div>
        </div>

        {/* Data Rows */}
        <div className="space-y-2">
          {historyData.map((entry) => (
            <div key={entry.id} className="grid grid-cols-5 gap-4 bg-white rounded-xl px-6 py-6 shadow-sm">
              <div className="text-center text-gray-700">{entry.subjectName}</div>
              <div className="text-center text-gray-700">{entry.dateStarted}</div>
              <div className="text-center text-gray-700">{entry.dateCompleted}</div>
              <div className="text-center text-gray-700">{entry.targetGrade}</div>
              <div className={`text-center font-medium ${entry.status === "Pass" ? "text-gray-700" : "text-gray-700"}`}>
                {entry.status}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {historyData.length === 0 && (
          <div className="bg-white rounded-xl px-6 py-12 text-center text-gray-500">No history records found.</div>
        )}
      </div>
    </div>
  )
}
