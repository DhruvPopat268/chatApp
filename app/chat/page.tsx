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
  const [webrtcManager, setWebrtcManager] = useState<any>(null) // Removed WebRTCManager
  const [callState, setCallState] = useState({ // Removed CallState
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
  const [incomingCallData, setIncomingCallData] = useState<any>(null) // Removed CallData
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Initialize user and contacts
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

  // Handle audio streams without causing re-renders
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

  // Handle video streams without causing re-renders
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream
      localVideoRef.current.muted = true
      
      // Delay play to avoid AbortError
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.play().catch(e => console.log('Local video play failed:', e))
        }
      }, 500)
    }
  }, [callState.localStream])

  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream
      remoteVideoRef.current.muted = false
      
      // Delay play to avoid AbortError
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.play().catch(e => console.log('Remote video play failed:', e))
        }
      }, 500)
    }
  }, [callState.remoteStream])

  // Search users from API
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchedUsers([])
      return
    }

    setIsSearching(true)
    try {
      const response = await authenticatedFetch(`${config.getBackendUrl()}/api/auth?search=${encodeURIComponent(query)}`)
      if (response.ok) {
        const users = await response.json()
        // Filter out users who are already contacts
        const filteredUsers = users.filter((user: ApiUser) => 
          !userContacts.some(contact => contact.id === user._id)
        )
        setSearchedUsers(filteredUsers)
      } else {
        console.error('Failed to search users')
        setSearchedUsers([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchedUsers([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(friendSearchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [friendSearchQuery])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Handle virtual keyboard on mobile
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.clientHeight

        // Detect if virtual keyboard is open (significant height difference)
        const keyboardOpen = windowHeight < documentHeight * 0.75
        setIsKeyboardVisible(keyboardOpen)

        // Scroll to bottom when keyboard opens/closes
        if (keyboardOpen) {
          setTimeout(() => {
            scrollToBottom()
            messageInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
          }, 100)
        }
      }
    }

    const handleVisualViewportChange = () => {
      if (typeof window !== "undefined" && window.visualViewport) {
        const viewport = window.visualViewport
        const keyboardOpen = viewport.height < window.innerHeight * 0.75
        setIsKeyboardVisible(keyboardOpen)

        if (keyboardOpen) {
          setTimeout(() => {
            scrollToBottom()
            messageInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
          }, 100)
        }
      }
    }

    // Listen for window resize (fallback for older browsers)
    window.addEventListener("resize", handleResize)

    // Listen for visual viewport changes (modern browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleVisualViewportChange)
    }

    // Initial check
    handleResize()

    return () => {
      window.removeEventListener("resize", handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleVisualViewportChange)
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Socket.IO event listeners
  useEffect(() => {
    if (!currentUser) return

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

    // Listen for typing indicators
    socketManager.onUserTyping((data) => {
      if (selectedContact && data.userId === selectedContact.id) {
        // You can add a typing indicator state here
        console.log('User is typing...')
      }
    })

    socketManager.onUserStoppedTyping((data) => {
      if (selectedContact && data.userId === selectedContact.id) {
        // You can remove typing indicator here
        console.log('User stopped typing')
      }
    })

    return () => {
      socketManager.removeAllListeners()
    }
  }, [currentUser, selectedContact])

  // Load messages when selectedContact changes
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && editedUser) {
      // In a real app, you would upload the file to a server
      // For now, we'll just create a local URL
      const imageUrl = URL.createObjectURL(file)
      setEditedUser({ ...editedUser, avatar: imageUrl })
    }
  }

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

  const deleteHistory = () => {
    setMessages([])
    setShowDeleteConfirm(false)
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const filteredContacts = userContacts.filter((contact) => contact.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Show loading state
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
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={selectedContact.avatar} />
              <AvatarFallback>
                {selectedContact.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{selectedContact.name}</h3>
              <p className="text-sm text-gray-500">
                {selectedContact.online ? "Online" : "Offline"}
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
                      {message.type === "image" && (
                        <div className="space-y-2">
                          <img
                            src="/placeholder.svg?height=200&width=300"
                            alt="Shared image"
                            className="rounded-lg max-w-full h-auto"
                          />
                        </div>
                      )}
                      {message.type === "file" && (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                          <File className="h-8 w-8 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{message.fileName}</p>
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
            "bg-white border-t border-gray-200 p-4 flex-shrink-0 sticky bottom-0 z-10",
            isKeyboardVisible && "pb-safe-area-inset-bottom"
          )}
          style={{
            paddingBottom: isKeyboardVisible ? "env(safe-area-inset-bottom, 16px)" : "16px",
          }}
        >
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => handleFileUpload("image")}>
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFileUpload("file")}>
              <Paperclip className="h-4 w-4" />
            </Button>
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
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <Button variant="ghost" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={sendMessage} size="sm">
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
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
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
                {callState.callData.callType === 'video' ? (
                  <Video className="h-8 w-8 text-white" />
                ) : (
                  <Phone className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">Incoming Call</h3>
                <p className="text-gray-600">
                  {callState.callData.callType === 'voice' ? 'Voice Call' : 'Video Call'}
                </p>
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
                {callState.callData.callType === 'video' ? (
                  <Video className="h-8 w-8 text-white" />
                ) : (
                  <Phone className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">Calling...</h3>
                <p className="text-gray-600">
                  {callState.callData.callType === 'voice' ? 'Voice Call' : 'Video Call'}
                </p>
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
            {callState.callData?.callType === 'video' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => webrtcManager?.toggleVideo()}
                className={!callState.isVideoEnabled ? "bg-red-500 text-white hover:bg-red-600" : "hover:bg-gray-100"}
              >
                {!callState.isVideoEnabled ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => webrtcManager?.toggleSpeaker()}
              className={callState.isSpeakerOn ? "bg-blue-500 text-white" : ""}
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

      {/* Video Call Display */}
      {callState.isConnected && callState.callData?.callType === 'video' && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative w-full h-full max-w-4xl max-h-[80vh] bg-gray-900 rounded-lg overflow-hidden">
            {/* Remote Video (Main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: callState.remoteStream ? 'block' : 'none' }}
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: callState.localStream ? 'block' : 'none' }}
              />
            </div>
            
            {/* Call Info */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg">
              <p className="text-sm">
                {callState.callData?.callType === 'video' ? 'Video Call' : 'Voice Call'}
              </p>
            </div>
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
      
      {/* Video Elements for Call Streams - Using refs to prevent re-render issues */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
    </div>
  )
}