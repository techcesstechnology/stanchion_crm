import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LeadService } from "@/services/leadService";
import { Lead } from "@/types";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, DollarSign, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export default function LeadDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLead = async () => {
            if (!id) return;
            try {
                const leads = await LeadService.getLeads();
                const found = leads.find(l => l.id === id);
                if (found) {
                    setLead(found);
                } else {
                    toast.error("Lead not found");
                    navigate("/leads");
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load lead");
            } finally {
                setLoading(false);
            }
        };
        fetchLead();
    }, [id, navigate]);

    if (loading) return <div className="text-center py-10">Loading lead...</div>;
    if (!lead) return null;

    const getStatusColor = (status: Lead['status']) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800';
            case 'contacted': return 'bg-yellow-100 text-yellow-800';
            case 'qualified': return 'bg-purple-100 text-purple-800';
            case 'proposal': return 'bg-orange-100 text-orange-800';
            case 'won': return 'bg-green-100 text-green-800';
            case 'lost': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate("/leads")} className="pl-0 gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Leads
            </Button>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Lead Info */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="border-t-4 border-primary">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={cn("text-xs px-2 py-1 rounded-full font-medium capitalize mb-2 inline-block", getStatusColor(lead.status))}>
                                        {lead.status}
                                    </span>
                                    <CardTitle className="text-xl">{lead.name}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {(lead.value || 0) > 0 && (
                                <div className="flex items-center gap-2 font-semibold text-lg text-emerald-600">
                                    <DollarSign className="h-5 w-5" />
                                    <span>{(lead.value || 0).toLocaleString()}</span>
                                </div>
                            )}

                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                                </div>
                                {lead.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{lead.phone}</span>
                                    </div>
                                )}
                                {lead.source && (
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-muted-foreground" />
                                        <span className="capitalize">Source: {lead.source}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Timeline */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Timeline leadId={lead.id} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
