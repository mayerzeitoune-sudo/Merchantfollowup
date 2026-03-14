import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, MessageSquare, ExternalLink, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { notificationsApi, messagesApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const [notifRes, msgRes] = await Promise.all([
        notificationsApi.getAll(),
        messagesApi.getUnread()
      ]);
      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(notifRes.data.unread_count || 0);
      setUnreadMessages(msgRes.data.messages || []);
      setMessageCount(msgRes.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await notificationsApi.markRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkMessageRead = async (messageId, clientId) => {
    try {
      await messagesApi.markRead(messageId);
      setUnreadMessages(prev => prev.filter(m => m.id !== messageId));
      setMessageCount(prev => Math.max(0, prev - 1));
      if (clientId) {
        navigate(`/clients/${clientId}`);
        setOpen(false);
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setLoading(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllMessagesRead = async () => {
    setLoading(true);
    try {
      await messagesApi.markAllRead();
      setUnreadMessages([]);
      setMessageCount(0);
    } catch (error) {
      console.error('Failed to mark all messages as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalUnread = unreadCount + messageCount;

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        data-testid="notification-bell"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
            {totalUnread > 9 ? '9+' : totalUnread}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-background border rounded-lg shadow-lg z-50">
          <Tabs defaultValue="messages" className="w-full">
            <div className="flex items-center justify-between p-3 border-b">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="messages" className="relative">
                  Messages
                  {messageCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 p-0 text-xs bg-orange-500">{messageCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notifications" className="relative">
                  Alerts
                  {unreadCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 p-0 text-xs bg-blue-500">{unreadCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Messages Tab */}
            <TabsContent value="messages" className="m-0">
              <div className="flex items-center justify-between p-2 border-b">
                <span className="text-xs text-muted-foreground">Unread Messages</span>
                {messageCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllMessagesRead} disabled={loading}>
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {unreadMessages.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No unread messages
                  </div>
                ) : (
                  unreadMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 border-b hover:bg-muted cursor-pointer flex items-start gap-3"
                      onClick={() => handleMarkMessageRead(msg.id, msg.client_id)}
                    >
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{msg.client_name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">{msg.client_phone}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {msg.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="m-0">
              <div className="flex items-center justify-between p-2 border-b">
                <span className="text-xs text-muted-foreground">System Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllNotificationsRead} disabled={loading}>
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b hover:bg-muted cursor-pointer flex items-start gap-3 ${
                        !notification.read ? 'bg-muted/50' : ''
                      }`}
                      onClick={() => {
                        handleMarkNotificationRead(notification.id);
                        // Navigate based on notification type or link
                        if (notification.link) {
                          navigate(notification.link);
                          setOpen(false);
                        } else if (notification.client_id) {
                          navigate(`/clients/${notification.client_id}`);
                          setOpen(false);
                        } else if (notification.type === 'message' && notification.data?.client_id) {
                          navigate(`/clients/${notification.data.client_id}`);
                          setOpen(false);
                        }
                      }}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${getTypeColor(notification.type)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{notification.title}</div>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {(notification.link || notification.client_id) && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
