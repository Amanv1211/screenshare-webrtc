import { useState, useEffect } from 'react'

const ROOM_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

export default function Home() {
  const [serverHost, setServerHost] = useState(window.location.host)
  const [shareUrl, setShareUrl] = useState(null)
  const [joinInput, setJoinInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/info')
      .then(r => r.json())
      .then(({ localIp, port }) => {
        if (localIp !== 'localhost') setServerHost(`${localIp}:${port}`)
      })
      .catch(() => {})
  }, [])

  function roomUrl(id) {
    const params = new URLSearchParams({ session_id: id })
    return `https://${serverHost}/room?${params}`
  }

  async function createRoom() {
    setCreating(true)
    try {
      const { roomId } = await fetch('/api/new-room').then(r => r.json())
      if (!ROOM_ID_RE.test(roomId)) return
      setShareUrl(roomUrl(roomId))
    } finally {
      setCreating(false)
    }
  }

  function joinRoom() {
    const id = joinInput.trim()
    if (!id) { setError('Enter a room code'); return }
    if (!ROOM_ID_RE.test(id)) { setError('Invalid room code'); return }
    window.location.href = roomUrl(id)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">VideoCall</h1>
          <p className="text-gray-400 mt-1 text-sm">Peer-to-peer · Video · Audio · Screen Share</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 space-y-5">

          {/* Create */}
          <button
            onClick={createRoom}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 shadow-sm shadow-blue-200"
          >
            {creating
              ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            }
            {creating ? 'Creating…' : 'Create New Room'}
          </button>

          {/* Share panel */}
          {shareUrl && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Room created</p>
              <div className="flex items-center gap-2 bg-white border border-blue-100 rounded-lg px-3 py-2.5">
                <span className="flex-1 text-xs text-gray-500 truncate font-mono">{shareUrl}</span>
                <button
                  onClick={copyLink}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    copied ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
              <button
                onClick={() => (window.location.href = shareUrl)}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Enter Room
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or join existing</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Join */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={joinInput}
                onChange={e => { setJoinInput(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && joinRoom()}
                placeholder="Room code (e.g. a3f9bc)"
                className={`flex-1 border rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-slate-300 text-gray-800 ${
                  error ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              <button
                onClick={joinRoom}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 rounded-xl transition-colors text-sm whitespace-nowrap"
              >
                Join
              </button>
            </div>
            {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
          </div>

        </div>

        {/* SSL note */}
        <p className="mt-5 text-center text-xs text-slate-400 leading-relaxed px-4">
          Self-signed SSL — click <span className="font-medium text-slate-500">Advanced → Proceed</span> once per device to allow camera & mic.
        </p>
      </div>
    </div>
  )
}
