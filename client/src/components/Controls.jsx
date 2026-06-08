export default function Controls({ micOn, camOn, sharing, onToggleMic, onToggleCam, onShare, onEnd }) {
  return (
    <div className="bg-white border-t border-slate-100 px-6 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-center gap-3">

        <ControlBtn
          on={micOn}
          onLabel="Mute"
          offLabel="Unmute"
          offRing="ring-red-200"
          onClick={onToggleMic}
          icon={
            micOn
              ? <MicOnIcon />
              : <MicOffIcon className="text-red-500" />
          }
        />

        <ControlBtn
          on={camOn}
          onLabel="Camera off"
          offLabel="Camera on"
          offRing="ring-red-200"
          onClick={onToggleCam}
          icon={
            camOn
              ? <CamOnIcon />
              : <CamOffIcon className="text-red-500" />
          }
        />

        <ControlBtn
          on={!sharing}
          onLabel="Share screen"
          offLabel="Stop sharing"
          offRing="ring-blue-200"
          offBg="bg-blue-50"
          offText="text-blue-600"
          onClick={onShare}
          icon={<ScreenIcon className={sharing ? 'text-blue-600' : 'text-slate-600'} />}
        />

        {/* End call */}
        <button
          onClick={onEnd}
          title="End call"
          className="p-3.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full transition-colors shadow-sm shadow-red-200 ml-2"
        >
          <PhoneOffIcon />
        </button>

      </div>
    </div>
  )
}

function ControlBtn({ on, onLabel, offLabel, offRing, offBg = 'bg-red-50', offText = 'text-red-600', onClick, icon }) {
  return (
    <button
      onClick={onClick}
      title={on ? onLabel : offLabel}
      className={`p-3.5 rounded-full transition-all ring-2 ${
        on
          ? 'bg-slate-100 hover:bg-slate-200 ring-transparent text-slate-600'
          : `${offBg} ${offText} ring-offset-1 ${offRing}`
      }`}
    >
      {icon}
    </button>
  )
}

function MicOnIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  )
}

function MicOffIcon({ className = '' }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v1M3 3l18 18" />
    </svg>
  )
}

function CamOnIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function CamOffIcon({ className = '' }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
    </svg>
  )
}

function ScreenIcon({ className = '' }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function PhoneOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
    </svg>
  )
}
