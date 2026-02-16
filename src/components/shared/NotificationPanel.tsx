import { Bell, Info, CheckCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { NotificationService, SystemNotification } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Timestamp as FirestoreTimestamp } from "firebase/firestore";

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = NotificationService.subscribeToNotifications((data) => {
            setNotifications(data);
        });

        return () => unsubscribe();
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = (type: SystemNotification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const handleNotificationClick = async (notif: SystemNotification) => {
        if (user && !notif.readBy.includes(user.uid)) {
            await NotificationService.markAsRead(notif.id, user.uid);
        }
        if (notif.link) {
            navigate(notif.link);
            onClose();
        }
    };

    const isUnread = (notif: SystemNotification) => {
        return user ? !notif.readBy.includes(user.uid) : false;
    };

    const formatDate = (ts: FirestoreTimestamp | { seconds: number; nanoseconds: number } | null) => {
        if (!ts) return '';
        const date = 'toDate' in ts ? ts.toDate() : new Date(ts.seconds * 1000);
        return format(date, 'MMM d, h:mm a');
    };

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className="fixed inset-0 z-[60] bg-black/5 lg:hidden"
                onClick={onClose}
            />

            <div className={cn(
                "fixed top-16 right-4 z-[70] w-80 max-h-[calc(100vh-5rem)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                "lg:absolute lg:top-full lg:mt-2 lg:right-0 lg:z-50"
            )}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <h3 className="font-semibold text-sm">Notifications</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-900">
                            {notifications.map((notification) => {
                                const unread = isUnread(notification);
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer flex gap-3",
                                            unread && "bg-slate-50/50 dark:bg-slate-900/50"
                                        )}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className={cn("text-xs leading-relaxed", unread ? "font-semibold" : "text-muted-foreground font-normal")}>
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium">
                                                {formatDate(notification.createdAt)}
                                            </p>
                                        </div>
                                        {unread && (
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-sm text-muted-foreground">No new notifications</p>
                        </div>
                    )}
                </div>

                <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <Button variant="ghost" size="sm" onClick={() => { navigate('/inquiries'); onClose(); }} className="w-full text-xs font-medium">
                        View all inquiries
                    </Button>
                </div>
            </div>
        </>
    );
}
