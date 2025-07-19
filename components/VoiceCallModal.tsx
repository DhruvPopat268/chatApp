"use client"

import { useEffect, useRef } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import { CallState } from "@/lib/webrtc"

interface VoiceCallModalProps {
  callState: CallState
  contactName: string
  contactAvatar: string
  onAccept: () => void
  onReject: () => void
  onEnd: () => void
  onToggleMute: () => void
  onToggleSpeaker: () => void
}

export default function VoiceCallModal({
  callState,
  contactName,
  contactAvatar,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleSpeaker
}: VoiceCallModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  // Debug call state changes
  useEffect(() => {
    console.log('VoiceCallModal - Call state changed:', {
      isConnected: callState.isConnected,
      hasRemoteStream: !!callState.remoteStream,
      remoteStreamTracks: callState.remoteStream?.getTracks().length || 0
    })
  }, [callState.isConnected, callState.remoteStream])

  // Handle remote audio stream
  useEffect(() => {
    if (callState.remoteStream && audioRef.current) {
      console.log('Setting remote stream to audio element:', callState.remoteStream)
      audioRef.current.srcObject = callState.remoteStream
      audioRef.current.play().catch((error) => {
        console.error('Error playing remote audio:', error)
      })
    }
  }, [callState.remoteStream])

  // Handle speaker mode
  useEffect(() => {
    if (audioRef.current) {
      // Enable speaker mode by setting audio output to speaker
      if (callState.isSpeakerOn && 'setSinkId' in audioRef.current) {
        // Try to set audio output to speaker (if supported)
        audioRef.current.setSinkId('speaker').catch(() => {
          // Fallback: just unmute the audio
          audioRef.current!.muted = false
        })
      } else {
        // Normal mode - ensure audio is not muted
        audioRef.current.muted = false
      }
    }
  }, [callState.isSpeakerOn])

  if (!callState.isIncoming && !callState.isOutgoing && !callState.isConnected) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-80 p-6 text-center">
        <Avatar className="h-24 w-24 mx-auto mb-4">
          <AvatarImage src={contactAvatar || "/placeholder.svg"} />
          <AvatarFallback className="text-2xl">
            {contactName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        
        <h3 className="text-xl font-semibold mb-2">{contactName}</h3>
        
        <p className="text-gray-500 mb-6">
          {callState.isIncoming && "Incoming call..."}
          {callState.isOutgoing && "Calling..."}
          {callState.isConnected && "Connected"}
        </p>

        {/* Hidden audio element for remote stream */}
        <audio ref={audioRef} autoPlay />
        
        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 mt-2">
            <p>Connected: {callState.isConnected ? 'Yes' : 'No'}</p>
            <p>Remote Stream: {callState.remoteStream ? 'Yes' : 'No'}</p>
            <p>Tracks: {callState.remoteStream?.getTracks().length || 0}</p>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          {callState.isIncoming ? (
            // Incoming call controls
            <>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full p-3 bg-red-500 text-white hover:bg-red-600"
                onClick={onReject}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full p-3 bg-green-500 text-white hover:bg-green-600"
                onClick={onAccept}
              >
                <Phone className="h-5 w-5" />
              </Button>
            </>
          ) : (
            // Active call controls
            <>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full p-3"
                onClick={onToggleMute}
              >
                {callState.isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full p-3"
                onClick={onToggleSpeaker}
              >
                {callState.isSpeakerOn ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full p-3"
                onClick={onEnd}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
} 