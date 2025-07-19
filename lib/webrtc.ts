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
  isVideoEnabled: boolean
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
    isVideoEnabled: true,
    localStream: null,
    remoteStream: null,
    callData: null
  }

  private onCallStateChange: ((state: CallState) => void) | null = null
  private pendingIceCandidates: RTCIceCandidate[] = []
  private isRemoteDescriptionSet = false
  private pendingOffer: RTCSessionDescriptionInit | null = null
  private callTimeout: NodeJS.Timeout | null = null

  constructor(socket: any) {
    this.socket = socket
    this.setupSocketListeners()
  }

  private setupSocketListeners() {
    if (!this.socket) return

    // Handle incoming call
    this.socket.on('incoming_call', (data: CallData & { offer?: RTCSessionDescriptionInit }) => {
      console.log('Incoming call received:', data)
      this.callState.isIncoming = true
      this.callState.callData = data
      
      // If there's an offer, we need to handle it immediately
      if (data.offer) {
        console.log('Offer received with incoming call, will process after accepting')
        // Store the offer to process after user accepts
        this.pendingOffer = data.offer
      }
      
      this.notifyStateChange()
    })

    // Handle call accepted
    this.socket.on('call_accepted', async (data: CallData) => {
      console.log('Call accepted by receiver')
      this.callState.isOutgoing = false
      this.callState.isConnected = true
      this.callState.callData = data
      
      // Only create peer connection if it doesn't exist
      if (!this.peerConnection) {
        await this.createPeerConnection()
      }
      
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
          if (this.isRemoteDescriptionSet && this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(data.candidate)
            console.log('ICE candidate added successfully')
          } else {
            // Store candidate for later when remote description is set
            this.pendingIceCandidates.push(data.candidate)
            console.log('ICE candidate stored for later, remote description not set yet')
          }
        } catch (error) {
          console.error('Error adding ICE candidate:', error)
          // Don't fail the call on ICE candidate errors, just log them
          if (error.name === 'InvalidStateError') {
            console.log('ICE candidate error - continuing call anyway')
          }
        }
      }
    })

    // Handle offer
    this.socket.on('offer', async (data: { offer: RTCSessionDescriptionInit, roomId: string }) => {
      if (this.peerConnection && this.callState.callData?.roomId === data.roomId) {
        try {
          console.log('Received offer, setting remote description')
          await this.peerConnection.setRemoteDescription(data.offer)
          this.isRemoteDescriptionSet = true
          
          // Add any pending ICE candidates
          while (this.pendingIceCandidates.length > 0) {
            const candidate = this.pendingIceCandidates.shift()!
            try {
              if (this.peerConnection && this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(candidate)
                console.log('Pending ICE candidate added successfully')
              } else {
                console.log('Skipping pending ICE candidate - no remote description')
              }
            } catch (error) {
              console.error('Error adding pending ICE candidate:', error)
              // Continue processing other candidates
            }
          }
          
          const answer = await this.peerConnection.createAnswer()
          await this.peerConnection.setLocalDescription(answer)
          console.log('Sending answer')
          this.socket.emit('answer', { answer, roomId: this.callState.callData.roomId })
        } catch (error) {
          console.error('Error handling offer:', error)
        }
      } else if (this.callState.callData?.roomId === data.roomId) {
        // Store offer if peer connection not ready yet
        console.log('Offer received but peer connection not ready, storing for later')
        this.pendingOffer = data.offer
      }
    })

    // Handle answer
    this.socket.on('answer', async (data: { answer: RTCSessionDescriptionInit, roomId: string }) => {
      if (this.peerConnection && this.callState.callData?.roomId === data.roomId) {
        try {
          console.log('Received answer, setting remote description')
          await this.peerConnection.setRemoteDescription(data.answer)
          this.isRemoteDescriptionSet = true
          
          // Add any pending ICE candidates
          while (this.pendingIceCandidates.length > 0) {
            const candidate = this.pendingIceCandidates.shift()!
            try {
              if (this.peerConnection && this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(candidate)
                console.log('Pending ICE candidate added successfully')
              } else {
                console.log('Skipping pending ICE candidate - no remote description')
              }
            } catch (error) {
              console.error('Error adding pending ICE candidate:', error)
              // Continue processing other candidates
            }
          }
        } catch (error) {
          console.error('Error handling answer:', error)
        }
      }
    })
  }

  private async createPeerConnection() {
    // Don't create a new connection if one already exists
    if (this.peerConnection) {
      console.log('Peer connection already exists, reusing existing connection')
      return
    }

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
        console.log('WebRTC connection established successfully!')
        
        // Clear timeout on successful connection
        if (this.callTimeout) {
          clearTimeout(this.callTimeout)
          this.callTimeout = null
        }
      } else if (this.peerConnection?.connectionState === 'failed') {
        console.error('WebRTC connection failed')
      } else if (this.peerConnection?.connectionState === 'disconnected') {
        console.log('WebRTC connection disconnected')
      }
    }

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection?.iceConnectionState)
    }

    // Handle ICE gathering state changes
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.peerConnection?.iceGatheringState)
    }
  }

  async startVoiceCall(receiverId: string): Promise<boolean> {
    try {
      // Don't start a new call if one is already in progress
      if (this.callState.isOutgoing || this.callState.isIncoming || this.callState.isConnected) {
        console.log('Call already in progress, cannot start new call')
        return false
      }

      // Get user media for voice
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })

      this.callState.localStream = this.localStream
      this.callState.isOutgoing = true
      this.callState.isVideoEnabled = false
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
      console.log('Local description set, sending offer to receiver')

      // Send call request with offer
      this.socket.emit('start_call', {
        receiverId,
        callType: 'voice',
        roomId: this.callState.callData.roomId,
        offer
      })

      // Set timeout for call establishment
      this.callTimeout = setTimeout(() => {
        console.log('Call establishment timeout, ending call')
        this.endCall()
      }, 30000) // 30 seconds timeout

      return true
    } catch (error) {
      console.error('Error starting voice call:', error)
      this.endCall()
      return false
    }
  }

  async startVideoCall(receiverId: string): Promise<boolean> {
    try {
      // Don't start a new call if one is already in progress
      if (this.callState.isOutgoing || this.callState.isIncoming || this.callState.isConnected) {
        console.log('Call already in progress, cannot start new call')
        return false
      }

      // Get user media for video
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })

      this.callState.localStream = this.localStream
      this.callState.isOutgoing = true
      this.callState.isVideoEnabled = true
      this.callState.callData = {
        callerId: '', // Will be set by server
        receiverId,
        callType: 'video',
        roomId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      this.notifyStateChange()

      // Create peer connection
      await this.createPeerConnection()

      // Create and send offer
      const offer = await this.peerConnection!.createOffer()
      await this.peerConnection!.setLocalDescription(offer)
      console.log('Local description set, sending video offer to receiver')

      // Send call request with offer
      this.socket.emit('start_call', {
        receiverId,
        callType: 'video',
        roomId: this.callState.callData.roomId,
        offer
      })

      // Set timeout for call establishment
      this.callTimeout = setTimeout(() => {
        console.log('Call establishment timeout, ending call')
        this.endCall()
      }, 30000) // 30 seconds timeout

      return true
    } catch (error) {
      console.error('Error starting video call:', error)
      this.endCall()
      return false
    }
  }

  async acceptCall(): Promise<boolean> {
    try {
      if (!this.callState.callData) return false

      // Don't accept if already connected or processing
      if (this.callState.isConnected || this.peerConnection) {
        console.log('Call already connected or peer connection exists')
        return false
      }

      console.log('Accepting call, getting user media...')

      // Get user media based on call type
      const mediaConstraints = this.callState.callData.callType === 'video' 
        ? {
            audio: true,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            }
          }
        : {
            audio: true,
            video: false
          }

      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)

      this.callState.localStream = this.localStream
      this.callState.isIncoming = false
      this.callState.isConnected = true
      this.callState.isVideoEnabled = this.callState.callData.callType === 'video'

      this.notifyStateChange()

      // Create peer connection
      await this.createPeerConnection()

      // If we have a pending offer, process it now
      if (this.pendingOffer) {
        console.log('Processing pending offer...')
        try {
          await this.peerConnection!.setRemoteDescription(this.pendingOffer)
          this.isRemoteDescriptionSet = true
          
          // Add any pending ICE candidates
          while (this.pendingIceCandidates.length > 0) {
            const candidate = this.pendingIceCandidates.shift()!
            try {
              if (this.peerConnection && this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(candidate)
                console.log('Pending ICE candidate added successfully')
              } else {
                console.log('Skipping pending ICE candidate - no remote description')
              }
            } catch (error) {
              console.error('Error adding pending ICE candidate:', error)
              // Continue processing other candidates
            }
          }
          
          const answer = await this.peerConnection!.createAnswer()
          await this.peerConnection!.setLocalDescription(answer)
          console.log('Sending answer')
          this.socket.emit('answer', { answer, roomId: this.callState.callData.roomId })
          
          this.pendingOffer = null
        } catch (error) {
          console.error('Error processing pending offer:', error)
        }
      }

      // Accept the call
      console.log('Sending accept_call signal')
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

    // Reset call state and internal state
    this.callState = {
      isIncoming: false,
      isOutgoing: false,
      isConnected: false,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: true,
      localStream: null,
      remoteStream: null,
      callData: null
    }

    // Reset internal state
    this.pendingIceCandidates = []
    this.isRemoteDescriptionSet = false
    this.pendingOffer = null
    
    // Clear timeout
    if (this.callTimeout) {
      clearTimeout(this.callTimeout)
      this.callTimeout = null
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

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        this.callState.isVideoEnabled = videoTrack.enabled
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