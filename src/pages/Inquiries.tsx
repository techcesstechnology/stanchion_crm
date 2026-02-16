import { useEffect, useState } from "react";
import { InquiryService, Inquiry } from "@/services/inquiryService";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, Clock } from "lucide-react";
import { Timestamp as FirestoreTimestamp } from "firebase/firestore";

export default function Inquiries() {
    const { user } = useAuth();
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInquiries = async () => {
        try {
            const data = await InquiryService.getInquiries();
            setInquiries(data);
        } catch (error) {
            console.error("Error fetching inquiries:", error);
            toast.error("Failed to load inquiries");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    const handleAcknowledge = async (id: string) => {
        if (!user) return;

        try {
            const userName = user.displayName || user.email || 'Admin';
            await InquiryService.acknowledgeInquiry(id, userName);
            toast.success("Inquiry marked as received");
            fetchInquiries(); // Refresh list
        } catch (error) {
            console.error("Error acknowledging inquiry:", error);
            toast.error("Failed to acknowledge inquiry");
        }
    };

    const formatDate = (date: Date | FirestoreTimestamp | { seconds: number; nanoseconds: number } | null | undefined) => {
        if (!date) return '';
        if (date instanceof Date) return format(date, 'MMM d, yyyy h:mm a');
        const d = 'toDate' in date ? date.toDate() : new Date(date.seconds * 1000);
        return format(d, 'MMM d, yyyy h:mm a');
    };

    if (loading) {
        return <div className="p-8 text-center">Loading inquiries...</div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Inquiries</h1>
                    <p className="text-muted-foreground">Manage customer inquiries and acknowledgments.</p>
                </div>
            </div>

            <div className="grid gap-4">
                {inquiries.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No inquiries found.
                        </CardContent>
                    </Card>
                ) : (
                    inquiries.map((inquiry) => (
                        <Card key={inquiry.id} className={inquiry.status === 'pending' ? 'border-l-4 border-l-blue-500' : ''}>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-primary" />
                                        <span className="font-bold text-lg">{inquiry.phoneNumber}</span>
                                        {inquiry.status === 'pending' ? (
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 uppercase text-[10px]">Pending</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 uppercase text-[10px]">Received</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(inquiry.createdAt)}
                                    </p>
                                </div>
                                {inquiry.status === 'pending' && (
                                    <Button size="sm" onClick={() => handleAcknowledge(inquiry.id)} className="gap-2">
                                        <CheckCircle className="h-4 w-4" /> Mark as Received
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border italic">
                                    "{inquiry.note}"
                                </p>
                                {inquiry.status === 'received' && (
                                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                            <CheckCircle className="h-3 w-3" />
                                        </div>
                                        <span>Acknowledged by <strong>{inquiry.acknowledgedBy}</strong> on {formatDate(inquiry.acknowledgedAt)}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
