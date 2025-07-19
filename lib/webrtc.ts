"use client"

export interface CallData {
  callerId: string
  receiverId: string
  callType: 'voice' | 'video'
  roomId: string
}

export interface CallState {
  isIncoming: boolean
  isOutgoing: boolean
  isConnected: boolean
  isMuted: boolean
  isSpeakerOn: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callData: CallData | null
}

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private socket: any = null
  private callState: CallState = {
    isIncoming: false,
    isOutgoing: false,
    isConnected: false,
    isMuted: false,
    isSpeakerOn: false,
    localStream: null,
    remoteStream: null,
    callData: null
  }

  private onCallStateChange: ((state: CallState) => void) | null = null

  constructor(socket: any) {
    this.socket = socket
    this.setupSocketListeners()
  }

  private setupSocketListeners() {
    if (!this.socket) return

    // Handle incoming call
    this.socket.on('incoming_call', (data: CallData) => {
      console.log('Incoming call received:', data)
      this.callState.isIncoming = true
      this.callState.callData = data
      this.notifyStateChange()
    })

    // Handle call accepted
    this.socket.on('call_accepted', async (data: CallData) => {
      this.callState.isOutgoing = false
      this.callState.isConnected = true
      this.callState.callData = data
      await this.createPeerConnection()
      this.notifyStateChange()
    })

    // Handle call rejected
    this.socket.on('call_rejected', () => {
      this.endCall()
    })

    // Handle call ended
    this.socket.on('call_ended', () => {
      this.endCall()
    })

    // Handle ICE candidates
    this.socket.on('ice_candidate', async (data: { candidate: RTCIceCandidate, roomId: string }) => {
      if (this.peerConnection && this.callState.callData?.roomId === data.roomId) {
        try {
          await this.peerConnection.addIceCandidate(data.candidate)
        } catch (error) {
          console.error('Error adding ICE candidate:', error)
        }
      }
    })

    // Handle offer
    this.socket.on('offer', async (data: { offer: RTCSessionDescriptionInit, roomId: string }) => {
      if (this.peerConnection && this.callState.callData?.roomId === data.roomId) {
        try {
          await this.peerConnection.setRemoteDescription(data.offer)
          const answer = await this.peerConnection.createAnswer()
          await this.peerConnection.setLocalDescription(answer)
          this.socket.emit('answer', { answer, roomId: this.callState.callData.roomId })
        } catch (error) {
          console.error('Error handling offer:', error)
        }
      }
    })

    // Handle answer
    this.socket.on('answer', async (data: { answer: RTCSessionDescriptionInit, roomId: string }) => {
      if (this.peerConnection && this.callState.callData?.roomId === data.roomId) {
        try {
          await this.peerConnection.setRemoteDescription(data.answer)
        } catch (error) {
          console.error('Error handling answer:', error)
        }
      }
    })
  }

  private async createPeerConnection() {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    this.peerConnection = new RTCPeerConnection(configuration)
    console.log('Peer connection created with config:', configuration)

    // Add local stream tracks
    if (this.localStream) {
      console.log('Adding local stream tracks:', this.localStream.getTracks())
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!)
      })
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Remote track received:', event)
      this.remoteStream = event.streams[0]
      this.callState.remoteStream = this.remoteStream
      this.notifyStateChange()
      
      // Ensure the remote stream is properly connected
      if (this.remoteStream) {
        console.log('Remote stream tracks:', this.remoteStream.getTracks())
      }
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice_candidate', {
          candidate: event.candidate,
          roomId: this.callState.callData?.roomId
        })
      }
    }

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState)
      if (this.peerConnection?.connectionState === 'connected') {
        this.callState.isConnected = true
        this.notifyStateChange()
      }
    }
  }

  async startVoiceCall(receiverId: string): Promise<boolean> {
    try {
      // Get user media for voice
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })

      this.callState.localStream = this.localStream
      this.callState.isOutgoing = true
      this.callState.callData = {
        callerId: '', // Will be set by server
        receiverId,
        callType: 'voice',
        roomId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      this.notifyStateChange()

      // Create peer connection
      await this.createPeerConnection()

      // Create and send offer
      const offer = await this.peerConnection!.createOffer()
      await this.peerConnection!.setLocalDescription(offer)

      // Send call request
      this.socket.emit('start_call', {
        receiverId,
        callType: 'voice',
        roomId: this.callState.callData.roomId,
        offer
      })

      return true
    } catch (error) {
      console.error('Error starting voice call:', error)
      this.endCall()
      return false
    }
  }

  async acceptCall(): Promise<boolean> {
    try {
      if (!this.callState.callData) return false

      // Get user media for voice
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })

      this.callState.localStream = this.localStream
      this.callState.isIncoming = false
      this.callState.isConnected = true

      this.notifyStateChange()

      // Create peer connection
      await this.createPeerConnection()

      // Accept the call
      this.socket.emit('accept_call', {
        roomId: this.callState.callData.roomId
      })

      return true
    } catch (error) {
      console.error('Error accepting call:', error)
      this.endCall()
      return false
    }
  }

  rejectCall() {
    if (this.callState.callData) {
      this.socket.emit('reject_call', {
        roomId: this.callState.callData.roomId
      })
    }
    this.endCall()
  }

  endCall() {
    // Notify server that call ended
    if (this.callState.callData) {
      this.socket.emit('end_call', {
        roomId: this.callState.callData.roomId
      })
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Reset call state
    this.callState = {
      isIncoming: false,
      isOutgoing: false,
      isConnected: false,
      isMuted: false,
      isSpeakerOn: false,
      localStream: null,
      remoteStream: null,
      callData: null
    }

    this.notifyStateChange()
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        this.callState.isMuted = !audioTrack.enabled
        this.notifyStateChange()
      }
    }
  }

  toggleSpeaker() {
    this.callState.isSpeakerOn = !this.callState.isSpeakerOn
    this.notifyStateChange()
  }

  onStateChange(callback: (state: CallState) => void) {
    this.onCallStateChange = callback
  }

  private notifyStateChange() {
    if (this.onCallStateChange) {
      this.onCallStateChange({ ...this.callState })
    }
  }

  getCallState(): CallState {
    return { ...this.callState }
  }
}

export default WebRTCManager 