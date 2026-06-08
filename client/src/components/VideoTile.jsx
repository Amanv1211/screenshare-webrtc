import { useRef, useEffect } from 'react'

export default function VideoTile({ stream, peerId }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  return (
    <div className="relative bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center min-h-0">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-mono">
        {peerId}
      </div>
    </div>
  )
}
