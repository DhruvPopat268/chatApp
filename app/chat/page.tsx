"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Phone,
  Video,
  Paperclip,
  Send,
  Search,
  MoreVertical,
  Smile,
  Mic,
  ImageIcon,
  File,
  PhoneOff,
  VideoOff,
  MicOff,
  Trash2,
  UserPlus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Camera,
  Edit,
  Save,
  X,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getCurrentUser, authenticatedFetch, logout } from "@/lib/clientAuth"
import socketManager from "@/lib/socket"
import config from "@/lib/config"
import WebRTCManager from "@/lib/webrtc"
import type { CallState } from "@/lib/webrtc"
import { useRouter } from 'next/navigation';

interface Contact {
  id: string
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  online: boolean
  unread: number
}

interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  type: "text" | "image" | "file" | "voice"
  fileName?: string
  fileSize?: string
}

interface ApiUser {
  _id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
}

interface CurrentUser {
  id: string
  username: string
  avatar: string
  email: string
  bio: string
}

const contacts: Contact[] = [
  {
    id: "1",
    name: "Alice Johnson",
    avatar: "/placeholder.svg?height=40&width=40",
    lastMessage: "Hey, how are you doing?",
    timestamp: "2 min ago",
    online: true,
    unread: 2,
  },
  {
    id: "2",
    name: "Bob Smith",
    avatar: "/placeholder.svg?height=40&width=40",
    lastMessage: "Thanks for the files!",
    timestamp: "1 hour ago",
    online: false,
    unread: 0,
  },
  {
    id: "3",
    name: "Carol Davis",
    avatar: "/placeholder.svg?height=40&width=40",
    lastMessage: "See you tomorrow",
    timestamp: "3 hours ago",
    online: true,
    unread: 1,
  },
]

const initialMessages: Message[] = [
  {
    id: "1",
    senderId: "1",
    content: "Hey there! How are you doing today?",
    timestamp: "10:30 AM",
    type: "text",
  },
  {
    id: "2",
    senderId: "me",
    content: "I'm doing great! Just working on some projects.",
    timestamp: "10:32 AM",
    type: "text",
  },
  {
    id: "3",
    senderId: "1",
    content: "That sounds awesome! I sent you some files earlier.",
    timestamp: "10:35 AM",
    type: "text",
  },
  {
    id: "4",
    senderId: "1",
    content: "",
    timestamp: "10:36 AM",
    type: "image",
  },
]

export default function ChatPage() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = getCurrentUser();
      if (!user && window.location.pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [router]);
  // All hooks must be declared before any early return
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [friendSearchQuery, setFriendSearchQuery] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [editedUser, setEditedUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [searchedUsers, setSearchedUsers] = useState<ApiUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [userContacts, setUserContacts] = useState<Contact[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [webrtcManager, setWebrtcManager] = useState<any>(null)
  const [callState, setCallState] = useState<CallState>({
    isIncoming: false,
    isOutgoing: false,
    isConnected: false,
    isMuted: false,
    isSpeakerOn: false,
    isVideoEnabled: true,
    localStream: null,
    remoteStream: null,
    callData: null
  })
  const [incomingCallData, setIncomingCallData] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Add state for image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Add state for typing and online status
  const [isTyping, setIsTyping] = useState(false);
  const [contactStatus, setContactStatus] = useState<{ online: boolean, lastSeen?: number }>({ online: false });
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Push notification setup - always call the hook
  useEffect(() => {
    // Only run if in browser and APIs are available
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!currentUser || !currentUser.id) return;
    async function registerPush() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        // Helper to convert VAPID key
        function urlBase64ToUint8Array(base64String: string) {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }
        const applicationServerKey = urlBase64ToUint8Array('BEBpdM1f4ieLbCS_QAvjBWfIB88PRmUot_pxEkLj9nbykz612Kf91BK0d6b9x5kK7J2mNuDmxOV8VtnsqNw7Bpo');
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
        if (currentUser && currentUser.id) {
          await fetch('http://localhost:7000/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription, userId: currentUser.id })
          });
        }
      } catch (err) {
        if (err instanceof DOMException) {
          console.error('Push registration failed:', err.name, err.message);
        } else {
          console.error('Push registration failed', err);
        }
      }
    }
    registerPush();
  }, [currentUser?.id]);

  // All useEffect hooks must be at the top level of the function component
  useEffect(() => {
    const initializeApp = async () => {
      const user = getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const currentUserData: CurrentUser = {
        id: user.id,
        username: user.username || "Unknown User",
        email: user.email || "",
        avatar: user.avatar || "/placeholder.svg?height=40&width=40",
        bio: "Hey there! I'm using this chat app.",
      }
      
      setCurrentUser(currentUserData)
      setEditedUser(currentUserData)

      // Connect to Socket.IO
      const socket = socketManager.connect()
      
      // Initialize WebRTC manager
      if (socket) {
        const webrtc = new WebRTCManager(socket)
        setWebrtcManager(webrtc)
        
        // Listen for call state changes
        webrtc.onStateChange((state) => {
          setCallState(state)
        })
      }

      // Load contacts
      try {
        const response = await authenticatedFetch(`${config.getBackendUrl()}/api/contacts`)
        if (response.ok) {
          const contacts = await response.json()
          setUserContacts(contacts)
          if (contacts.length > 0 && !selectedContact) {
            const firstContact = contacts[0]
            setSelectedContact(firstContact)
            // Load messages for the first contact
            loadMessages(firstContact.id)
          }
        } else {
          console.error('Failed to load contacts')
        }
      } catch (error) {
        console.error('Error loading contacts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()

    // Cleanup on unmount
    return () => {
      if (webrtcManager) {
        webrtcManager.endCall()
      }
      socketManager.disconnect()
    }
  }, [])

  useEffect(() => {
    if (localAudioRef.current && callState.localStream) {
      localAudioRef.current.srcObject = callState.localStream
      localAudioRef.current.muted = true
      localAudioRef.current.volume = 0
      
      // Delay play to avoid AbortError
      setTimeout(() => {
        if (localAudioRef.current) {
          localAudioRef.current.play().catch(e => console.log('Local audio play failed:', e))
        }
      }, 500)
    }
  }, [callState.localStream])

  useEffect(() => {
    if (remoteAudioRef.current && callState.remoteStream) {
      remoteAudioRef.current.srcObject = callState.remoteStream
      remoteAudioRef.current.muted = false
      remoteAudioRef.current.volume = 1
      
      // Delay play to avoid AbortError
      setTimeout(() => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.play().catch(e => console.log('Remote audio play failed:', e))
        }
      }, 500)
    }
  }, [callState.remoteStream])

  // Typing indicator logic
  useEffect(() => {
    if (!selectedContact || !currentUser) return;
    let typingTimeout: NodeJS.Timeout;
    const handleTyping = () => {
      socketManager.sendTypingStart(selectedContact.id);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socketManager.sendTypingStop(selectedContact.id);
      }, 1500);
    };
    if (messageInputRef.current) {
      messageInputRef.current.addEventListener('input', handleTyping);
    }
    return () => {
      if (messageInputRef.current) {
        messageInputRef.current.removeEventListener('input', handleTyping);
      }
      clearTimeout(typingTimeout);
    };
  }, [selectedContact, currentUser]);

  // Request status when selectedContact changes
  useEffect(() => {
    if (selectedContact && socketManager.getSocket()) {
      socketManager.getSocket()?.emit('request_status', { userId: selectedContact.id });
    }
  }, [selectedContact]);

  // Listen for typing and status events
  useEffect(() => {
    if (!currentUser) return;
    socketManager.onUserTyping((data) => {
      if (selectedContact && data.userId === selectedContact.id) {
        setIsTyping(true);
      }
    });
    socketManager.onUserStoppedTyping((data) => {
      if (selectedContact && data.userId === selectedContact.id) {
        setIsTyping(false);
      }
    });
    // Listen for online/offline status
    if (socketManager.getSocket()) {
      socketManager.getSocket()?.on('user_status', (data) => {
        if (selectedContact && data.userId === selectedContact.id) {
          setContactStatus({ online: data.online, lastSeen: data.lastSeen });
        }
      });
    }
    return () => {
      socketManager.removeAllListeners();
      if (socketManager.getSocket()) {
        socketManager.getSocket()?.off('user_status');
      }
    };
  }, [selectedContact, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    // Listen for new messages
    socketManager.onNewMessage((message) => {
      console.log('New message received:', message)
      
      // Add message to the current conversation if it matches
      if (selectedContact && 
          (message.senderId._id === selectedContact.id || message.receiverId._id === selectedContact.id)) {
        const newMessage: Message = {
          id: message._id,
          senderId: message.senderId._id === currentUser.id ? "me" : message.senderId._id,
          content: message.content,
          timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: message.type,
          fileName: message.fileName,
          fileSize: message.fileSize,
        }
        setMessages(prev => [...prev, newMessage])
      }

      // Update contact's last message
      setUserContacts(prev => prev.map(contact => {
        if (contact.id === message.senderId._id) {
          return {
            ...contact,
            lastMessage: message.content,
            timestamp: "Just now",
            unread: contact.unread + 1
          }
        }
        return contact
      }))
    })

    // Listen for message sent confirmation
    socketManager.onMessageSent((message) => {
      console.log('Message sent successfully:', message)
    })

    // Listen for message errors
    socketManager.onMessageError((error) => {
      console.error('Message error:', error)
    })
    return () => {
      socketManager.removeAllListeners();
    };
  }, [currentUser, selectedContact]);

  useEffect(() => {
    if (selectedContact && currentUser) {
      loadMessages(selectedContact.id)
    }
  }, [selectedContact?.id, currentUser?.id])

  // Handle input focus for mobile
  const handleInputFocus = () => {
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        })
      }
    }, 300) // Delay to allow keyboard animation
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedContact || !currentUser) return

    // Send message via Socket.IO
    socketManager.sendMessage(selectedContact.id, newMessage, "text")

    // Add message to local state immediately for optimistic UI
    const message: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages(prev => [...prev, message])
    setNewMessage("")

    // Update contact's last message
    setUserContacts(prev => prev.map(contact => {
      if (contact.id === selectedContact.id) {
        return {
          ...contact,
          lastMessage: newMessage,
          timestamp: "Just now",
          unread: 0
        }
      }
      return contact
    }))
  }

  const handleFileUpload = (type: "image" | "file") => {
    const message: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: type,
      fileName: type === "file" ? "document.pdf" : undefined,
      fileSize: type === "file" ? "2.4 MB" : undefined,
    }

    setMessages([...messages, message])
  }

  const handleAvatarUpload = () => {
    fileInputRef.current?.click()
  }

  // const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]
  //   if (file && editedUser) {
  //     // In a real app, you would upload the file to a server
  //     // For now, we'll just create a local URL
  //     const imageUrl = URL.createObjectURL(file)
  //     setEditedUser({ ...editedUser, avatar: imageUrl })
  //   }
  // }

  const saveProfile = () => {
    setCurrentUser(editedUser)
    setIsEditingProfile(false)
  }

  const cancelEdit = () => {
    setEditedUser(currentUser)
    setIsEditingProfile(false)
  }

  const addFriend = async (user: ApiUser) => {
    try {
      const response = await authenticatedFetch(`${config.getBackendUrl()}/api/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contactId: user._id }),
      })

      if (response.ok) {
        const data = await response.json()
        const newContact: Contact = {
          id: user._id,
          name: user.username,
          avatar: "/placeholder.svg?height=40&width=40",
          lastMessage: "",
          timestamp: "Just now",
          online: false,
          unread: 0,
        }
        
        setUserContacts(prev => [...prev, newContact])
        setSearchedUsers(prev => prev.filter(u => u._id !== user._id))
        setFriendSearchQuery("")
        
        // Show success feedback
        console.log(`Added ${user.username} to contacts`)
      } else {
        const error = await response.json()
        console.error('Failed to add contact:', error.error)
      }
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }

  // Load messages for a contact
  const loadMessages = async (contactId: string) => {
    setIsLoadingMessages(true)
    try {
      const response = await authenticatedFetch(`${config.getBackendUrl()}/api/messages/${contactId}`)
      if (response.ok) {
        const messagesData = await response.json()
        const formattedMessages: Message[] = messagesData.map((msg: any) => ({
          id: msg._id,
          senderId: msg.senderId._id === currentUser?.id ? "me" : msg.senderId._id,
          content: msg.content,
          timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: msg.type,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
        }))
        setMessages(formattedMessages)
      } else {
        console.error('Failed to load messages')
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const deleteHistory = async () => {
    if (!selectedContact || !currentUser) return;
    try {
      // Call backend API to delete all messages between current user and selected contact
      const token = localStorage.getItem('token');
      await fetch(`${config.getBackendUrl()}/api/messages/${selectedContact.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Failed to delete messages from database', err);
    }
    setMessages([]);
    setShowDeleteConfirm(false);
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const filteredContacts = userContacts.filter((contact) => contact.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Early return for loading state must come after all hooks
  if (isLoading || !currentUser) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // Add Cloudinary upload function
  const uploadImageToCloudinary = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'prayoshaChatApp');
    formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'deqab5u6x');
    // Use /image/upload for images, /raw/upload for everything else
    const isImage = file.type.startsWith('image/');
    const endpoint = isImage ? 'image' : 'raw';
    try {
      setIsUploadingImage(true);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'deqab5u6x'}/${endpoint}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setIsUploadingImage(false);
      return data.secure_url || null;
    } catch (err) {
      setIsUploadingImage(false);
      alert('File upload failed');
      return null;
    }
  };

  const handleImageButtonClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImageToCloudinary(file);
    if (url && selectedContact && currentUser) {
      // Send image message
      socketManager.sendMessage(selectedContact.id, url, "image");
      const message: Message = {
        id: Date.now().toString(),
        senderId: "me",
        content: url,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "image",
      };
      setMessages(prev => [...prev, message]);
      setNewMessage("");
    }
  };

  // Add file upload handler
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImageToCloudinary(file); // Cloudinary supports files too
    if (url && selectedContact && currentUser) {
      socketManager.sendMessage(selectedContact.id, url, "file", file.name, (file.size / 1024 / 1024).toFixed(2) + ' MB');
      const message: Message = {
        id: Date.now().toString(),
        senderId: "me",
        content: url,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "file",
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      };
      setMessages(prev => [...prev, message]);
      setNewMessage("");
    }
  };

  // Remove the old handleFileChange for avatar upload
  // Add a new function for avatar upload
  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && editedUser) {
      // In a real app, you would upload the file to a server
      // For now, we'll just create a local URL
      const imageUrl = URL.createObjectURL(file)
      setEditedUser({ ...editedUser, avatar: imageUrl })
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const enableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotifEnabled(false);
        return;
      }
      setNotifEnabled(true);
      // Register service worker and subscribe
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (!currentUser?.id) return;
      const reg = await navigator.serviceWorker.register('/sw.js');
      function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }
      const applicationServerKey = urlBase64ToUint8Array('BEBpdM1f4ieLbCS_QAvjBWfIB88PRmUot_pxEkLj9nbykz612Kf91BK0d6b9x5kK7J2mNuDmxOV8VtnsqNw7Bpo');
      try {
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
        await fetch('http://localhost:7000/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, userId: currentUser.id })
        });
      } catch (err) {
        if (err instanceof DOMException) {
          console.error('Push registration failed:', err.name, err.message);
        } else {
          console.error('Push registration failed', err);
        }
      }
    } catch (err) {
      console.error('Notification permission error', err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 relative overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-30 md:z-auto relative",
          isSidebarOpen ? "w-80 fixed md:relative inset-y-0 left-0 md:left-auto" : "w-0 md:w-12 overflow-hidden",
        )}
      >
        {/* Sidebar Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            "absolute top-4 z-40 transition-all duration-300 rounded-full h-8 w-8 p-0",
            isSidebarOpen
              ? "right-4 hover:bg-gray-100"
              : "right-2 md:right-1 bg-blue-500 text-white hover:bg-blue-600 shadow-lg",
          )}
        >
          {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {/* Sidebar Content */}
        <div
          className={cn(
            "transition-all duration-300 h-full",
            isSidebarOpen ? "opacity-100" : "opacity-0 md:opacity-100",
          )}
        >
          {isSidebarOpen ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 pt-16">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={currentUser.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {currentUser.username
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <h1 className="text-xl font-semibold">Messages</h1>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Friends</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                                                      <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                placeholder="Search people..."
                                value={friendSearchQuery}
                                onChange={(e) => setFriendSearchQuery(e.target.value)}
                                className="pl-10"
                              />
                            </div>

                                                    {/* Searched Users */}
                          {friendSearchQuery.trim() && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
                              {isSearching ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span className="text-sm text-gray-500">Searching...</span>
                                </div>
                              ) : searchedUsers.length > 0 ? (
                                <div className="space-y-2">
                                  {searchedUsers.map((user) => (
                                    <div key={user._id} className="flex items-center justify-between p-2 rounded-lg border">
                                      <div className="flex items-center space-x-3">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src="/placeholder.svg" />
                                          <AvatarFallback>
                                            {user.username
                                              .split(" ")
                                              .map((n) => n[0])
                                              .join("")}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-sm font-medium">{user.username}</p>
                                          <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                      </div>
                                      <Button size="sm" variant="outline" onClick={() => addFriend(user)}>
                                        <UserPlus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-sm text-gray-500">No users found</p>
                                </div>
                              )}
                            </div>
                          )}


                        </div>
                      </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                          <User className="h-4 w-4 mr-2" />
                          My Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Contacts List */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => {
                        setSelectedContact(contact)
                      }}
                      className={cn(
                        "flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors",
                        selectedContact?.id === contact.id && "bg-blue-50 border border-blue-200",
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                          <AvatarFallback>
                            {contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        {contact.online && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                          <p className="text-xs text-gray-500">{contact.timestamp}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500 truncate">{contact.lastMessage}</p>
                          {contact.unread > 0 && (
                            <Badge
                              variant="default"
                              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                            >
                              {contact.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            // Collapsed sidebar - show only essential buttons
            <div className="hidden md:flex flex-col items-center py-4 space-y-4 pt-16">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSidebarOpen(true)
                  setIsAddFriendOpen(true)
                }}
                className="p-2 rounded-full"
                title="Add Friends"
              >
                <UserPlus className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2 rounded-full" title="Menu">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right">
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        ref={chatContainerRef}
        className={cn("flex-1 flex flex-col relative", isKeyboardVisible && "pb-safe-area-inset-bottom")}
        style={{
          height:
            isKeyboardVisible && typeof window !== "undefined" && window.visualViewport
              ? `${window.visualViewport.height}px`
              : "100vh",
        }}
      >
        {/* Top Bar with Sidebar Toggle */}
        <div className="bg-white border-b border-gray-200 p-3 flex items-center space-x-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Chat</h2>
          </div>
        </div>

        {/* Contact header - Pinned */}
        <div className={cn(
          "bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0 transition-all duration-300",
          isKeyboardVisible ? "fixed top-0 left-0 right-0 z-40 shadow-md" : "relative z-10"
        )}
        style={isKeyboardVisible ? { width: '100vw' } : {}}>
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={selectedContact?.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {selectedContact?.name
                  ? selectedContact.name.split(" ").map((n) => n[0]).join("")
                  : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{selectedContact?.name || "No Contact"}</h3>
              <p className="text-sm text-gray-500">
                {isTyping
                  ? "Typing..."
                  : contactStatus.online
                    ? "Online"
                    : contactStatus.lastSeen
                      ? `Last seen ${Math.round((Date.now() - contactStatus.lastSeen) / 60000)} min ago`
                      : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Voice Call Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={() => {
                if (webrtcManager && selectedContact) {
                  webrtcManager.startVoiceCall(selectedContact.id)
                }
              }}
              disabled={!webrtcManager || !selectedContact || callState.isIncoming || callState.isOutgoing || callState.isConnected}
            >
              <Phone className="h-4 w-4" />
            </Button>
            {/* Video Call Button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={() => {
                if (webrtcManager && selectedContact) {
                  webrtcManager.startVideoCall(selectedContact.id)
                }
              }}
              disabled={!webrtcManager || !selectedContact || callState.isIncoming || callState.isOutgoing || callState.isConnected}
            >
              <Video className="h-4 w-4" />
            </Button>
            

            
            {/* More Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages - Scrollable area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 pb-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-gray-500">No messages yet. Start a conversation!</span>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.senderId === "me" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                        message.senderId === "me" ? "bg-blue-500 text-white" : "bg-white border border-gray-200",
                      )}
                    >
                      {message.type === "text" && <p className="text-sm">{message.content}</p>}
                      {message.type === "image" && message.content && (
                        <div className="space-y-2">
                          <img
                            src={message.content}
                            alt="Shared image"
                            className="rounded-lg max-w-full h-auto cursor-pointer"
                            style={{ maxWidth: 240, maxHeight: 320 }}
                            onClick={() => setPreviewImage(message.content)}
                          />
                        </div>
                      )}
                      {message.type === "file" && message.content && (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                          <File className="h-8 w-8 text-blue-500" />
                          <div>
                            <a href={message.content} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline">
                              {message.fileName || 'Download file'}
                            </a>
                            <p className="text-xs text-gray-500">{message.fileSize}</p>
                          </div>
                        </div>
                      )}
                      <p className="text-xs mt-1 opacity-70">{message.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Message Input - Pinned at bottom, above keyboard */}
        <div
          className={cn(
            "bg-white border-t border-gray-200 p-4 flex-shrink-0 fixed bottom-0 left-0 right-0 z-30",
            isKeyboardVisible && "pb-safe-area-inset-bottom"
          )}
          style={{
            paddingBottom: isKeyboardVisible ? "env(safe-area-inset-bottom, 16px)" : "16px",
          }}
        >
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={handleImageButtonClick} disabled={isUploadingImage}>
              <ImageIcon className="h-4 w-4" />
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button variant="ghost" size="sm" onClick={handleFileButtonClick} disabled={isUploadingImage}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex-1 relative">
              <Input
                ref={messageInputRef}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                onFocus={handleInputFocus}
                className="pr-20"
                style={{
                  fontSize: "16px", // Prevents zoom on iOS
                }}
              />
            </div>
            <Button onClick={sendMessage} size="sm" disabled={isUploadingImage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={isEditingProfile && editedUser ? editedUser.avatar : currentUser.avatar} />
                  <AvatarFallback className="text-2xl">
                    {(isEditingProfile && editedUser ? editedUser.username : currentUser.username)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                {isEditingProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 bg-transparent"
                    onClick={handleAvatarUpload}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {/* Use handleAvatarFileChange for avatar input */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
            </div>

            {/* Profile Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                {isEditingProfile && editedUser ? (
                  <Input
                    id="username"
                    value={editedUser.username}
                    onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-600">{currentUser.username}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                {isEditingProfile && editedUser ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-600">{currentUser.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditingProfile && editedUser ? (
                  <Input
                    id="bio"
                    value={editedUser.bio}
                    onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                    className="mt-1"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-600">{currentUser.bio}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              {isEditingProfile ? (
                <>
                  <Button variant="outline" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={saveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditingProfile(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete History Confirmation */}
      {showDeleteConfirm && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Chat History</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete all messages with {selectedContact.name}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteHistory}>
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Incoming Call Modal */}
      {callState.isIncoming && callState.callData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Incoming Call</h3>
                <p className="text-gray-600">Voice Call</p>
              </div>
              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => webrtcManager?.rejectCall()}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  Decline
                </Button>
                <Button 
                  size="lg"
                  onClick={async () => {
                    if (webrtcManager) {
                      console.log('User clicked accept call')
                      const success = await webrtcManager.acceptCall()
                      console.log('Accept call result:', success)
                    }
                  }}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Accept
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Outgoing Call Modal */}
      {callState.isOutgoing && callState.callData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Calling...</h3>
                <p className="text-gray-600">Voice Call</p>
              </div>
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => webrtcManager?.endCall()}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  End Call
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Active Call Controls */}
      {callState.isConnected && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg p-4 shadow-lg z-40">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => webrtcManager?.toggleMute()}
              className={callState.isMuted ? "bg-red-500 text-white hover:bg-red-600" : "hover:bg-gray-100"}
            >
              {callState.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => webrtcManager?.toggleSpeaker()}
              className={callState.isSpeakerOn ? "bg-blue-500 text-white" : "hover:bg-gray-100"}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => webrtcManager?.endCall()}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Video Call Modal */}
      {callState.isConnected && callState.callData && callState.callData.callType === 'video' && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-4 flex flex-col items-center relative">
            {/* Video Controls - Large, always visible */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-6 z-10">
              <Button
                variant="outline"
                size="lg"
                onClick={() => webrtcManager?.toggleMute()}
                className={callState.isMuted ? "bg-red-500 text-white hover:bg-red-600 border-none" : "bg-white text-gray-800 hover:bg-gray-200 border-none shadow"}
                style={{ width: 56, height: 56, borderRadius: 28, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {callState.isMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => webrtcManager?.endCall()}
                className="bg-red-500 text-white hover:bg-red-600 border-none shadow"
                style={{ width: 56, height: 56, borderRadius: 28, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <PhoneOff className="h-8 w-8" />
              </Button>
            </div>
            <div className="relative w-full flex flex-col items-center">
              {/* Remote Video */}
              <video
                id="remoteVideo"
                autoPlay
                playsInline
                style={{ width: '100%', maxHeight: '60vh', background: '#222', borderRadius: '12px' }}
                ref={node => {
                  if (node && callState.remoteStream) {
                    node.srcObject = callState.remoteStream;
                  }
                }}
              />
              {/* Local Video (small overlay) */}
              <video
                id="localVideo"
                autoPlay
                playsInline
                muted
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  width: '120px',
                  height: '90px',
                  background: '#444',
                  borderRadius: '8px',
                  border: '2px solid #fff',
                  objectFit: 'cover',
                }}
                ref={node => {
                  if (node && callState.localStream) {
                    node.srcObject = callState.localStream;
                  }
                }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
          <div className="relative">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg" />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 bg-white"
              onClick={e => { e.stopPropagation(); setPreviewImage(null); }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Audio Elements for Call Streams - Using refs to prevent re-render issues */}
      <audio
        ref={localAudioRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
      
      

    </div>
  )
}