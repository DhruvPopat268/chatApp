"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import WebRTCManager from '@/lib/webrtc'

interface WebRTCDebugProps {
  webrtcManager: WebRTCManager | null
}

export default function WebRTCDebug({ webrtcManager }: WebRTCDebugProps) {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const updateDiagnostics = () => {
    if (webrtcManager) {
      setDiagnostics(webrtcManager.getConnectionDiagnostics())
    }
  }

  const runConnectionTest = async () => {
    if (!webrtcManager) return
    
    setIsTesting(true)
    try {
      const result = await webrtcManager.testConnection()
      setTestResult(result)
    } catch (error) {
      console.error('Test failed:', error)
      setTestResult(false)
    } finally {
      setIsTesting(false)
    }
  }

  useEffect(() => {
    const interval = setInterval(updateDiagnostics, 1000)
    return () => clearInterval(interval)
  }, [webrtcManager])

  if (!webrtcManager) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            WebRTC Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">WebRTC Manager not initialized</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'failed':
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
      case 'disconnected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          WebRTC Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={updateDiagnostics} 
            variant="outline" 
            size="sm"
          >
            Refresh
          </Button>
          <Button 
            onClick={runConnectionTest} 
            variant="outline" 
            size="sm"
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        {testResult !== null && (
          <div className="flex items-center gap-2">
            {testResult ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">
              Connection test: {testResult ? 'PASSED' : 'FAILED'}
            </span>
          </div>
        )}

        {diagnostics && (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {diagnostics.error ? (
                <p className="text-sm text-red-600">{diagnostics.error}</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.connectionState)}
                    <span className="text-sm font-medium">Connection State:</span>
                    <Badge className={getStatusColor(diagnostics.connectionState)}>
                      {diagnostics.connectionState}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.iceConnectionState)}
                    <span className="text-sm font-medium">ICE Connection:</span>
                    <Badge className={getStatusColor(diagnostics.iceConnectionState)}>
                      {diagnostics.iceConnectionState}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">ICE Gathering:</span>
                    <Badge variant="outline">{diagnostics.iceGatheringState}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Signaling State:</span>
                    <Badge variant="outline">{diagnostics.signalingState}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Local Description:</span>
                    <Badge variant="outline">{diagnostics.localDescription}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Remote Description:</span>
                    <Badge variant="outline">{diagnostics.remoteDescription}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Local Stream Tracks:</span>
                    <Badge variant="outline">{diagnostics.localStreamTracks}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Remote Stream Tracks:</span>
                    <Badge variant="outline">{diagnostics.remoteStreamTracks}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Pending ICE Candidates:</span>
                    <Badge variant="outline">{diagnostics.pendingIceCandidates}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Remote Description Set:</span>
                    <Badge variant="outline">{diagnostics.isRemoteDescriptionSet ? 'Yes' : 'No'}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Has Pending Offer:</span>
                    <Badge variant="outline">{diagnostics.hasPendingOffer ? 'Yes' : 'No'}</Badge>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
} 