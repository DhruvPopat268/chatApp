import WebRTCTest from '@/components/webrtc-test'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">WebRTC Voice Call Testing</h1>
        <WebRTCTest />
      </div>
    </div>
  )
} 