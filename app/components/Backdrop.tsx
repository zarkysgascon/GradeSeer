"use client"

export default function Backdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400"></div>
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url("/bg.png")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          animation: 'floatUpDown 4s ease-in-out infinite',
        }}
      ></div>
    </div>
  )
}
