"use client"

import { useEffect, useRef, useState } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, PhoneOff, Volume2, VolumeX } from "lucide-react"
import { CallData } from "@/lib/webrtc"

interface IncomingCallNotificationProps {
  callData: CallData
  contactName: string
  contactAvatar: string
  onAccept: () => void
  onReject: () => void
}

export default function IncomingCallNotification({
  callData,
  contactName,
  contactAvatar,
  onAccept,
  onReject
}: IncomingCallNotificationProps) {
  const [isRinging, setIsRinging] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const ringtoneRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)

  // Generate and play ringtone
  useEffect(() => {
    if (isRinging) {
      // Create audio context for ringtone
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create oscillator for ringtone
      oscillatorRef.current = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillatorRef.current.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      // Set ringtone properties
      oscillatorRef.current.type = 'sine'
      oscillatorRef.current.frequency.setValueAtTime(800, audioContextRef.current.currentTime)
      oscillatorRef.current.frequency.setValueAtTime(1000, audioContextRef.current.currentTime + 0.5)
      oscillatorRef.current.frequency.setValueAtTime(800, audioContextRef.current.currentTime + 1)
      
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime + 1)
      
      // Start and loop the ringtone
      oscillatorRef.current.start()
      
      const ringtoneInterval = setInterval(() => {
        if (oscillatorRef.current && audioContextRef.current) {
          oscillatorRef.current.frequency.setValueAtTime(800, audioContextRef.current.currentTime)
          oscillatorRef.current.frequency.setValueAtTime(1000, audioContextRef.current.currentTime + 0.5)
          oscillatorRef.current.frequency.setValueAtTime(800, audioContextRef.current.currentTime + 1)
          
          const gainNode = audioContextRef.current.createGain()
          oscillatorRef.current.connect(gainNode)
          gainNode.connect(audioContextRef.current.destination)
          gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
          gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime + 1)
        }
      }, 2000)
      
      return () => {
        clearInterval(ringtoneInterval)
        if (oscillatorRef.current) {
          oscillatorRef.current.stop()
          oscillatorRef.current = null
        }
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
      }
    }
  }, [isRinging])

  // Stop ringtone when call is accepted/rejected
  const handleAccept = () => {
    setIsRinging(false)
    onAccept()
  }

  const handleReject = () => {
    setIsRinging(false)
    onReject()
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (ringtoneRef.current) {
      ringtoneRef.current.muted = !isMuted
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-80 p-6 text-center animate-pulse">
        <div className="relative">
          {/* Ringing animation */}
          <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
          <div className="absolute inset-2 rounded-full bg-blue-500 animate-ping opacity-30"></div>
          <div className="absolute inset-4 rounded-full bg-blue-500 animate-ping opacity-40"></div>
          
          <Avatar className="h-24 w-24 mx-auto mb-4 relative z-10">
            <AvatarImage src={contactAvatar || "/placeholder.svg"} />
            <AvatarFallback className="text-2xl">
              {contactName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <h3 className="text-xl font-semibold mb-2">{contactName}</h3>
        
        <p className="text-gray-500 mb-2">
          {callData.callType === 'voice' ? 'Voice Call' : 'Video Call'}
        </p>
        
        <p className="text-sm text-gray-400 mb-6">Incoming call...</p>

        {/* Hidden audio elements */}
        <audio ref={audioRef} autoPlay />
        <audio ref={ringtoneRef} />

        <div className="flex justify-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-3"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-3 bg-red-500 text-white hover:bg-red-600"
            onClick={handleReject}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-3 bg-green-500 text-white hover:bg-green-600"
            onClick={handleAccept}
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </div>
  )
} 