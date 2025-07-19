// WebRTC Connection Test Script
// This can be run in the browser console to test WebRTC functionality

export async function testWebRTCConnection() {
  console.log('🧪 Starting WebRTC Connection Test...')
  
  try {
    // Test 1: Check if WebRTC is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('WebRTC not supported in this browser')
    }
    console.log('✅ WebRTC API supported')

    // Test 2: Check if RTCPeerConnection is available
    if (!window.RTCPeerConnection) {
      throw new Error('RTCPeerConnection not available')
    }
    console.log('✅ RTCPeerConnection available')

    // Test 3: Test getUserMedia for audio
    console.log('🎤 Testing audio access...')
    const audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: false 
    })
    console.log('✅ Audio access granted')
    console.log('Audio tracks:', audioStream.getAudioTracks().length)
    audioStream.getTracks().forEach(track => track.stop())

    // Test 4: Test getUserMedia for video
    console.log('📹 Testing video access...')
    const videoStream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    })
    console.log('✅ Video access granted')
    console.log('Video tracks:', videoStream.getVideoTracks().length)
    console.log('Audio tracks:', videoStream.getAudioTracks().length)
    videoStream.getTracks().forEach(track => track.stop())

    // Test 5: Test RTCPeerConnection creation
    console.log('🔗 Testing RTCPeerConnection...')
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })
    console.log('✅ RTCPeerConnection created')
    console.log('Initial state:', {
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState,
      signalingState: pc.signalingState
    })

    // Test 6: Test offer creation
    console.log('📝 Testing offer creation...')
    const offer = await pc.createOffer()
    console.log('✅ Offer created:', offer.type)
    console.log('Offer SDP length:', offer.sdp?.length || 0)

    // Test 7: Test setting local description
    console.log('📋 Testing setLocalDescription...')
    await pc.setLocalDescription(offer)
    console.log('✅ Local description set')
    console.log('Signaling state after setLocalDescription:', pc.signalingState)

    // Test 8: Test ICE candidate gathering
    console.log('🧊 Testing ICE candidate gathering...')
    let iceCandidates = 0
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidates++
        console.log(`ICE candidate ${iceCandidates}:`, event.candidate.type)
      } else {
        console.log('✅ ICE gathering complete')
      }
    }

    // Wait for ICE gathering to complete
    await new Promise<void>((resolve) => {
      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          resolve()
        } else {
          setTimeout(checkState, 100)
        }
      }
      checkState()
    })

    // Cleanup
    pc.close()
    console.log('✅ WebRTC Connection Test PASSED!')
    return true

  } catch (error) {
    console.error('❌ WebRTC Connection Test FAILED:', error)
    return false
  }
}

export function getWebRTCInfo() {
  return {
    userAgent: navigator.userAgent,
    mediaDevices: !!navigator.mediaDevices,
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    RTCPeerConnection: !!window.RTCPeerConnection,
    webkitRTCPeerConnection: !!window.webkitRTCPeerConnection,
    mozRTCPeerConnection: !!window.mozRTCPeerConnection,
    permissions: {
      microphone: navigator.permissions?.query({ name: 'microphone' as PermissionName }),
      camera: navigator.permissions?.query({ name: 'camera' as PermissionName })
    }
  }
}

// Run test when imported
if (typeof window !== 'undefined') {
  console.log('🔧 WebRTC Test utilities loaded')
  console.log('Run testWebRTCConnection() to test WebRTC functionality')
  console.log('Run getWebRTCInfo() to get browser WebRTC support info')
} 