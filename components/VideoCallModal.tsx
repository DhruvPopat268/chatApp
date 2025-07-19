"use client"

import React, { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { CallState } from '@/lib/webrtc'

interface VideoCallModalProps {
  callState: CallState
  contactName: string
  contactAvatar: string
  onEnd: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleSpeaker: () => void
  onSwitchCamera?: () => void
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  callState,
  contactName,
  contactAvatar,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Handle local video stream
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream
    }
  }, [callState.localStream])

  // Handle remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream
    }
  }, [callState.remoteStream])

  // Auto-play videos when streams are available
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.play().catch(console.error)
    }
  }, [callState.localStream])

  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.play().catch(console.error)
    }
  }, [callState.remoteStream])

  if (!callState.isConnected && !callState.isOutgoing) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-6xl max-h-full p-4">
        {/* Main remote video */}
        <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden relative">
          {callState.remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <Avatar className="h-32 w-32 mx-auto mb-4">
                  <AvatarImage src={contactAvatar} />
                  <AvatarFallback className="text-4xl">
                    {contactName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-semibold mb-2">{contactName}</h3>
                <p className="text-gray-300">
                  {callState.isOutgoing ? 'Calling...' : 'Connecting...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border-2 border-white overflow-hidden">
          {callState.localStream && callState.isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted={true}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <Avatar className="h-16 w-16">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="text-xl">You</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>

        {/* Call controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4">
          {/* Mute button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={onToggleMute}
            className="rounded-full p-4 bg-gray-700 text-white hover:bg-gray-600"
          >
            {callState.isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* Video toggle button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={onToggleVideo}
            className="rounded-full p-4 bg-gray-700 text-white hover:bg-gray-600"
          >
            {callState.isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          {/* Speaker toggle button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={onToggleSpeaker}
            className="rounded-full p-4 bg-gray-700 text-white hover:bg-gray-600"
          >
            {callState.isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </Button>

          {/* Switch camera button (only show if video is enabled) */}
          {callState.isVideoEnabled && onSwitchCamera && (
            <Button
              variant="ghost"
              size="lg"
              onClick={onSwitchCamera}
              className="rounded-full p-4 bg-gray-700 text-white hover:bg-gray-600"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          )}

          {/* End call button */}
          <Button
            variant="destructive"
            size="lg"
            onClick={onEnd}
            className="rounded-full p-4"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        {/* Call status */}
        <div className="absolute top-4 left-4">
          <Card className="px-4 py-2 bg-black bg-opacity-50 text-white">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">
                {callState.isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default VideoCallModal 