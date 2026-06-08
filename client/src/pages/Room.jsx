import { useState, useEffect, useRef } from 'react'
import VideoTile from '../components/VideoTile'
import Controls from '../components/Controls'
import Toast from '../components/Toast'

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
const PEER_ID_RE = /^[a-f0-9]{6}$/
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

function isValid(id) { return PEER_ID_RE.test(id) }

export default function Room() {
  const sessionId = new URLSearchParams(window.location.search).get('session_id') || ''

  const [joined, setJoined]           = useState(false)
  const [joining, setJoining]         = useState(false)
  const [micOn, setMicOn]             = useState(true)
  const [camOn, setCamOn]             = useState(true)
  const [sharing, setSharing]         = useState(false)
  const [remoteStreams, setRemoteStreams] = useState({}) // peerId → MediaStream
  const [toast, setToast]             = useState(null)

  const wsRef            = useRef(null)
  const connectionsRef   = useRef(Object.create(null))
  const localStreamRef   = useRef(null)
  const screenStreamRef  = useRef(null)
  const localVideoRef    = useRef(null)

  function showToast(msg, ms = 3500) {
    setToast(msg)
    setTimeout(() => setToast(null), ms)
  }

  // ── WebSocket + peer connection setup ──────────────────────
  useEffect(() => {
    if (!sessionId || !SESSION_ID_RE.test(sessionId)) {
      showToast('Invalid room ID')
      return
    }

    const ws = new WebSocket(`wss://${window.location.host}?session_id=${encodeURIComponent(sessionId)}`)
    wsRef.current = ws

    function send(data) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data))
    }

    function addStream(peerId, stream) {
      setRemoteStreams(prev => ({ ...prev, [peerId]: stream }))
    }
    function removeStream(peerId) {
      setRemoteStreams(prev => { const n = { ...prev }; delete n[peerId]; return n })
    }

    function buildPC(remotePeerId, polite) {
      const pc = new RTCPeerConnection(ICE)
      const conn = { pc, polite, makingOffer: false }
      connectionsRef.current[remotePeerId] = conn

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current))
      }

      pc.ontrack = ({ streams }) => {
        if (streams[0]) addStream(remotePeerId, streams[0])
      }

      pc.onnegotiationneeded = async () => {
        try {
          conn.makingOffer = true
          const offer = await pc.createOffer()
          if (pc.signalingState !== 'stable') return
          await pc.setLocalDescription(offer)
          send({ type: 'offer', to: remotePeerId, offer: pc.localDescription })
        } catch (e) { console.error(e) }
        finally { conn.makingOffer = false }
      }

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) send({ type: 'candidate', to: remotePeerId, candidate })
      }

      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          pc.close()
          delete connectionsRef.current[remotePeerId]
          removeStream(remotePeerId)
        }
      }

      return conn
    }

    ws.onmessage = async (ev) => {
      let msg
      try { msg = JSON.parse(ev.data) } catch { return }

      if (msg.type === 'init') {
        if (!isValid(msg.peerId)) return
        ;(msg.peers || []).filter(isValid).forEach(pid => buildPC(pid, false))
        return
      }

      if (msg.from && !isValid(msg.from)) return

      switch (msg.type) {
        case 'peer_joined': {
          if (!isValid(msg.peerId)) return
          buildPC(msg.peerId, true)
          break
        }
        case 'peer_left': {
          if (!isValid(msg.peerId)) return
          connectionsRef.current[msg.peerId]?.pc.close()
          delete connectionsRef.current[msg.peerId]
          removeStream(msg.peerId)
          break
        }
        case 'offer': {
          const conn = connectionsRef.current[msg.from]
          if (!conn) return
          const { pc, polite, makingOffer } = conn
          const collision = pc.signalingState !== 'stable' || makingOffer
          if (!polite && collision) return
          await pc.setRemoteDescription(msg.offer)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          send({ type: 'answer', to: msg.from, answer: pc.localDescription })
          break
        }
        case 'answer': {
          const conn = connectionsRef.current[msg.from]
          if (conn) await conn.pc.setRemoteDescription(msg.answer)
          break
        }
        case 'candidate': {
          const conn = connectionsRef.current[msg.from]
          if (conn) try { await conn.pc.addIceCandidate(msg.candidate) } catch {}
          break
        }
      }
    }

    ws.onerror = () => showToast('Signaling connection error')

    return () => {
      ws.close()
      Object.values(connectionsRef.current).forEach(c => c.pc.close())
      connectionsRef.current = Object.create(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join call ──────────────────────────────────────────────
  async function joinCall() {
    setJoining(true)
    let stream = null

    for (const constraints of [{ video: true, audio: true }, { video: false, audio: true }, null]) {
      try {
        if (constraints) { stream = await navigator.mediaDevices.getUserMedia(constraints); break }
        else { showToast('No camera/mic found — screen share still available'); break }
      } catch {}
    }

    if (stream) {
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      setMicOn(true)
      setCamOn(stream.getVideoTracks().length > 0)

      // add tracks to already-existing peer connections
      Object.values(connectionsRef.current).forEach(({ pc }) => {
        stream.getTracks().forEach(track => {
          const existing = pc.getSenders().find(s => s.track?.kind === track.kind)
          if (existing) existing.replaceTrack(track)
          else pc.addTrack(track, stream)
        })
      })
    }

    setJoined(true)
    setJoining(false)
  }

  // ── Media controls ─────────────────────────────────────────
  function toggleMic() {
    const t = localStreamRef.current?.getAudioTracks()[0]
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled) }
  }

  function toggleCam() {
    const t = localStreamRef.current?.getVideoTracks()[0]
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled) }
  }

  function stopSharing() {
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null
    const camTrack = localStreamRef.current?.getVideoTracks()[0] ?? null
    Object.values(connectionsRef.current).forEach(({ pc }) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (sender) sender.replaceTrack(camTrack)
    })
    if (localVideoRef.current && localStreamRef.current)
      localVideoRef.current.srcObject = localStreamRef.current
    setSharing(false)
  }

  async function toggleShare() {
    if (sharing) { stopSharing(); return }

    let screenStream
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    } catch { return }

    screenStreamRef.current = screenStream
    const screenTrack = screenStream.getVideoTracks()[0]
    screenTrack.onended = stopSharing

    Object.values(connectionsRef.current).forEach(({ pc }) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (sender) sender.replaceTrack(screenTrack)
      else pc.addTrack(screenTrack, screenStream)
    })

    if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
    setSharing(true)
  }

  function endCall() {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    wsRef.current?.close()
    Object.values(connectionsRef.current).forEach(c => c.pc.close())
    window.location.href = '/'
  }

  // ── Grid layout ────────────────────────────────────────────
  const remoteList = Object.entries(remoteStreams)
  const gridClass = remoteList.length <= 1
    ? 'grid-cols-1'
    : 'grid-cols-2'

  const participantCount = remoteList.length + (joined ? 1 : 0)

  return (
    <div className="h-screen flex flex-col bg-slate-900 relative overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-slate-900/90 backdrop-blur border-b border-slate-800 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">VideoCall</span>
          <span className="text-slate-500 text-xs font-mono">·&nbsp;{sessionId.slice(0, 10)}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-slate-300 text-xs">{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {/* Video grid */}
      <main className="flex-1 p-4 overflow-hidden relative">
        {remoteList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
              <svg className="w-9 h-9 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">Waiting for others…</p>
            <p className="text-slate-600 text-sm max-w-xs">Share the room link from the home page to invite people</p>
          </div>
        ) : (
          <div className={`grid ${gridClass} gap-3 h-full`}>
            {remoteList.map(([peerId, stream]) => (
              <VideoTile key={peerId} stream={stream} peerId={peerId} />
            ))}
          </div>
        )}

        {/* Local PiP */}
        {joined && (
          <div className="absolute bottom-3 right-3 w-36 aspect-video rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-800 shadow-2xl">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {!camOn && !sharing && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <span className="text-slate-500 text-xs">Cam off</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Controls — only shown after joining */}
      {joined && (
        <Controls
          micOn={micOn}
          camOn={camOn}
          sharing={sharing}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onShare={toggleShare}
          onEnd={endCall}
        />
      )}

      {toast && <Toast message={toast} />}

      {/* Pre-join overlay */}
      {!joined && (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-20 p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Ready to join?</h2>
            <p className="text-slate-400 text-sm mb-2">
              Room <span className="font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">{sessionId}</span>
            </p>
            <p className="text-slate-400 text-xs mb-6">Camera and mic are optional — you can still screen share without them.</p>
            <button
              onClick={joinCall}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {joining
                ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
              }
              {joining ? 'Joining…' : 'Join Call'}
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="mt-3 w-full text-slate-400 hover:text-slate-600 text-sm py-2 transition-colors"
            >
              ← Back to home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
