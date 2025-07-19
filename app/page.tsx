"use client"

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
  Users,
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
import { getCurrentUser } from "@/lib/clientAuth"
import { useRouter } from "next/navigation"


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

interface FriendRequest {
  id: string
  name: string
  avatar: string
  mutualFriends: number
}

interface User {
  id: string
  name: string
  avatar: string
  online: boolean
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

const friendRequests: FriendRequest[] = [
  {
    id: "fr1",
    name: "Emma Wilson",
    avatar: "/placeholder.svg?height=40&width=40",
    mutualFriends: 3,
  },
  {
    id: "fr2",
    name: "David Brown",
    avatar: "/placeholder.svg?height=40&width=40",
    mutualFriends: 1,
  },
  {
    id: "fr3",
    name: "Sarah Miller",
    avatar: "/placeholder.svg?height=40&width=40",
    mutualFriends: 5,
  },
]

const suggestedUsers: User[] = [
  {
    id: "su1",
    name: "John Doe",
    avatar: "/placeholder.svg?height=40&width=40",
    online: true,
  },
  {
    id: "su2",
    name: "Jane Smith",
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
  },
]

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      router.push("/chat")
    } else {
      router.push("/login")
    }
  }, [router])

  return (
    <div className="flex h-screen bg-gray-50 items-center justify-center">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span>Loading...</span>
      </div>
    </div>
  )
}

function ChatApp() {
  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0])
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isVoiceCall, setIsVoiceCall] = useState(false)
  const [isVideoCall, setIsVideoCall] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [friendSearchQuery, setFriendSearchQuery] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages([...messages, message])
    setNewMessage("")
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

  const startVoiceCall = () => {
    setIsVoiceCall(true)
  }

  const startVideoCall = () => {
    setIsVideoCall(true)
  }

  const endCall = () => {
    setIsVoiceCall(false)
    setIsVideoCall(false)
  }

  const addFriend = (userId: string) => {
    // Simulate adding friend
    console.log("Adding friend:", userId)
    // In real app, this would make an API call
  }

  const deleteHistory = () => {
    setMessages([])
    setShowDeleteConfirm(false)
  }

  const filteredSuggestedUsers = suggestedUsers.filter((user) =>
    user.name.toLowerCase().includes(friendSearchQuery.toLowerCase()),
  )

  const filteredContacts = contacts.filter((contact) => contact.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Messages</h1>
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

                    {/* Friend Requests */}
                    {friendRequests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Friend Requests</h3>
                        <div className="space-y-2">
                          {friendRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-2 rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={request.avatar || "/placeholder.svg"} />
                                  <AvatarFallback>
                                    {request.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{request.name}</p>
                                  <p className="text-xs text-gray-500">{request.mutualFriends} mutual friends</p>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button size="sm" variant="default" onClick={() => addFriend(request.id)}>
                                  Accept
                                </Button>
                                <Button size="sm" variant="outline">
                                  Decline
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Users */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Suggested</h3>
                      <div className="space-y-2">
                        {filteredSuggestedUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar || "/placeholder.svg"} />
                                  <AvatarFallback>
                                    {user.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                {user.online && (
                                  <div className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 border border-white rounded-full"></div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.online ? "Online" : "Offline"}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => addFriend(user.id)}>
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
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
                  <DropdownMenuItem>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Groups
                  </DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
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
                onClick={() => setSelectedContact(contact)}
                className={cn(
                  "flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors",
                  selectedContact.id === contact.id && "bg-blue-50 border border-blue-200",
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
                      <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {contact.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedContact.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {selectedContact.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <h2 className="text-lg font-semibold">{selectedContact.name}</h2>
              <p className="text-sm text-gray-500">{selectedContact.online ? "Online" : "Last seen 2 hours ago"}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={startVoiceCall}>
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={startVideoCall}>
              <Video className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Chat History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.senderId === "me" ? "justify-end" : "justify-start")}>
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
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => handleFileUpload("image")}>
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleFileUpload("file")}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="flex-1 relative">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="pr-20"
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

      {/* Voice Call Modal */}
      {isVoiceCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-80 p-6 text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={selectedContact.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">
                {selectedContact.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold mb-2">{selectedContact.name}</h3>
            <p className="text-gray-500 mb-6">Voice call in progress...</p>
            <div className="flex justify-center space-x-4">
              <Button variant="ghost" size="sm" className="rounded-full p-3">
                <MicOff className="h-5 w-5" />
              </Button>
              <Button variant="destructive" size="sm" className="rounded-full p-3" onClick={endCall}>
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Video Call Modal */}
      {isVideoCall && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative w-full h-full max-w-4xl max-h-3xl">
            {/* Main video */}
            <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <Avatar className="h-32 w-32 mx-auto mb-4">
                  <AvatarImage src={selectedContact.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-4xl">
                    {selectedContact.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-semibold mb-2">{selectedContact.name}</h3>
                <p className="text-gray-300">Video call in progress...</p>
              </div>
            </div>

            {/* Self video */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border-2 border-white">
              <div className="w-full h-full flex items-center justify-center text-white">
                <p>Your video</p>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <Button variant="ghost" size="sm" className="rounded-full p-3 bg-gray-700 text-white hover:bg-gray-600">
                <MicOff className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full p-3 bg-gray-700 text-white hover:bg-gray-600">
                <VideoOff className="h-5 w-5" />
              </Button>
              <Button variant="destructive" size="sm" className="rounded-full p-3" onClick={endCall}>
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete History Confirmation */}
      {showDeleteConfirm && (
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
    </div>
  )
}
