"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import config from '@/lib/config';
import { getCurrentUser } from '@/lib/clientAuth';

// Dynamic import for OneSignal to prevent SSR issues
let OneSignal: any = null;
if (typeof window !== 'undefined') {
  import('react-onesignal').then((module) => {
    OneSignal = module.default;
  });
}

export default function TestPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notificationStatus, setNotificationStatus] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const initializeOneSignal = async () => {
    setLoading(true);
    try {
      // Ensure OneSignal is loaded
      if (!OneSignal) {
        const module = await import('react-onesignal');
        OneSignal = module.default;
      }
      
      console.log('Initializing OneSignal...');
      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
        notifyButton: {
          enable: true,
          prenotify: true,
          showCredit: false,
          text: {
            'tip.state.unsubscribed': 'Subscribe to notifications',
            'tip.state.subscribed': 'You are subscribed to notifications',
            'tip.state.blocked': 'You have blocked notifications',
            'message.prenotify': 'Click to subscribe to notifications',
            'message.action.subscribed': "Thanks for subscribing!",
            'message.action.resubscribed': "You're subscribed to notifications",
            'message.action.unsubscribed': "You won't receive notifications again",
            'message.action.subscribing': 'Subscribing...',
            'dialog.main.title': 'Manage Site Notifications',
            'dialog.main.button.subscribe': 'SUBSCRIBE',
            'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
            'dialog.blocked.title': 'Unblock Notifications',
            'dialog.blocked.message': 'Follow instructions to allow notifications',
          }
        },
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' }
      });
      
      const isSupported = await OneSignal.Notifications.isPushSupported();
      setIsSubscribed(isSupported);
      
      if (isSupported) {
        const permission = await OneSignal.Notifications.permission;
        if (permission === 'granted') {
          const id = await OneSignal.User.getOneSignalId();
          setPlayerId(id);
        }
      }
      
      console.log('OneSignal initialized, supported:', isSupported);
    } catch (error) {
      console.error('OneSignal initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    setLoading(true);
    try {
      // Ensure OneSignal is loaded
      if (!OneSignal) {
        const module = await import('react-onesignal');
        OneSignal = module.default;
      }
      
      console.log('Requesting notification permission...');
      await OneSignal.Notifications.requestPermission();
      
      // Check status after a delay
      setTimeout(async () => {
        const permission = await OneSignal.Notifications.permission;
        const subscribed = permission === 'granted';
        setIsSubscribed(subscribed);
        
        if (subscribed) {
          const id = await OneSignal.User.getOneSignalId();
          setPlayerId(id);
          console.log('Permission granted, playerId:', id);
        }
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error requesting permission:', error);
      setLoading(false);
    }
  };

  const savePlayerId = async () => {
    if (!currentUser?.id || !playerId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${config.getBackendUrl()}/api/save-onesignal-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, userId: currentUser.id })
      });
      
      if (response.ok) {
        console.log('PlayerId saved successfully');
        await checkNotificationStatus();
      } else {
        console.error('Failed to save playerId');
      }
    } catch (error) {
      console.error('Error saving playerId:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationStatus = async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${config.getBackendUrl()}/api/debug/notifications/${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setNotificationStatus(data);
        console.log('Notification status:', data);
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAllUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.getBackendUrl()}/api/debug/onesignal-users`);
      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data);
        console.log('All users with playerIds:', data);
      }
    } catch (error) {
      console.error('Error checking all users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">OneSignal Notification Test</h1>
          <p className="text-gray-600">Debug and test notification setup</p>
        </div>

        {/* Current User Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          {currentUser ? (
            <div className="space-y-2">
              <p><strong>ID:</strong> {currentUser.id}</p>
              <p><strong>Username:</strong> {currentUser.username}</p>
            </div>
          ) : (
            <p className="text-red-500">No user logged in</p>
          )}
        </Card>

        {/* OneSignal Status */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">OneSignal Status</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button onClick={initializeOneSignal} disabled={loading}>
                Initialize OneSignal
              </Button>
              <Button onClick={requestNotificationPermission} disabled={loading}>
                Request Permission
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <span>Subscription Status:</span>
                {isSubscribed === null ? (
                  <Badge variant="secondary">Unknown</Badge>
                ) : isSubscribed ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Subscribed
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Subscribed
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span>Player ID:</span>
                {playerId ? (
                  <Badge className="bg-blue-100 text-blue-800 font-mono text-xs">
                    {playerId.substring(0, 8)}...
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Available</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Backend Status */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Backend Status</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button onClick={savePlayerId} disabled={!playerId || loading}>
                Save Player ID
              </Button>
              <Button onClick={checkNotificationStatus} disabled={loading}>
                Check Status
              </Button>
              <Button onClick={checkAllUsers} disabled={loading}>
                Check All Users
              </Button>
            </div>
            
            {notificationStatus && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">User Notification Status:</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(notificationStatus, null, 2)}
                </pre>
              </div>
            )}
            
            {debugInfo && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">All Users with Player IDs:</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>

        {/* Environment Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
          <div className="space-y-2">
            <p><strong>OneSignal App ID:</strong> {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'Not Set'}</p>
            <p><strong>Backend URL:</strong> {config.getBackendUrl()}</p>
          </div>
        </Card>
      </div>
    </div>
  );
} 