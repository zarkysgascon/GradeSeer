'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-800">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">{error?.message || 'Unexpected error occurred.'}</p>
          <button
            className="mt-4 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
