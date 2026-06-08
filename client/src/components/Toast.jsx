export default function Toast({ message }) {
  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-2xl border border-white/10">
        {message}
      </div>
    </div>
  )
}
