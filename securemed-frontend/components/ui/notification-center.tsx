"use client"

import { useState } from "react"
import { Bell, Check, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

// Type definition for a notification
export type Notification = {
    id: string
    title: string
    message: string
    timestamp: string
    read: boolean
    type: 'info' | 'success' | 'warning' | 'error'
}

// Mock data for demonstration
const INITIAL_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        title: 'Appointment Confirmed',
        message: 'Your appointment with Dr. Sarah is confirmed for tomorrow at 10:00 AM.',
        timestamp: '2 hours ago',
        read: false,
        type: 'success'
    },
    {
        id: '2',
        title: 'New Lab Result',
        message: 'Blood test results are now available in your records.',
        timestamp: '5 hours ago',
        read: false,
        type: 'info'
    },
    {
        id: '3',
        title: 'System Maintenance',
        message: 'Scheduled maintenance on Saturday 12 AM - 4 AM.',
        timestamp: '1 day ago',
        read: true,
        type: 'warning'
    }
]

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
    const [isOpen, setIsOpen] = useState(false)

    const unreadCount = notifications.filter(n => !n.read).length

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const clearAll = () => {
        setNotifications([])
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h4 className="font-semibold leading-none">Notifications</h4>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
                    )}
                </div>

                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-muted/30' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 space-y-1">
                                            <p className={`text-sm font-medium leading-none ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/70 pt-1">
                                                {notification.timestamp}
                                            </p>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notification.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-primary"
                                                    onClick={() => markAsRead(notification.id)}
                                                    title="Mark as read"
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => deleteNotification(notification.id)}
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {notifications.length > 0 && (
                    <div className="flex items-center justify-between p-2 border-t border-border bg-muted/20">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Mark all read
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 text-destructive hover:text-destructive"
                            onClick={clearAll}
                        >
                            Clear all
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
