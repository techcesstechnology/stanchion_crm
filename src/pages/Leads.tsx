import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LeadService } from "@/services/leadService";
import { Lead } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Plus, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export default function Leads() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        value: "",
        source: ""
    });

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const data = await LeadService.getLeads();
            setLeads(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.phone) {
            toast.error("Phone number is required");
            return;
        }

        setSubmitting(true);
        try {
            await LeadService.addLead({
                name: formData.name || "Unnamed Lead",
                email: formData.email,
                phone: formData.phone,
                value: formData.value ? parseFloat(formData.value) : 0,
                source: formData.source,
                status: 'new'
            });
            toast.success("Lead created successfully");
            setIsAddModalOpen(false);
            setFormData({ name: "", email: "", phone: "", value: "", source: "" });
            fetchLeads();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create lead");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: Lead['status']) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'contacted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'qualified': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
            case 'proposal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
            case 'won': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'lost': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground">Track your potential sales</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Lead
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading leads...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {leads.map((lead) => (
                        <Card key={lead.id} className="hover:shadow-md transition-shadow border-t-4" style={{ borderColor: 'var(--primary)' }}>
                            <CardHeader className="flex flex-col gap-1 pb-2">

                                <div className="flex justify-between items-start">
                                    <Link to={`/leads/${lead.id}`} className="hover:underline">
                                        <CardTitle className="text-lg">{lead.name}</CardTitle>
                                    </Link>
                                    <span className={cn("text-xs px-2 py-1 rounded-full font-medium capitalize", getStatusColor(lead.status))}>
                                        {lead.status}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{lead.email}</p>
                            </CardHeader>
                            <CardContent className="grid gap-2 text-sm">
                                {lead.value && (
                                    <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                        <DollarSign className="h-4 w-4" />
                                        <span>{lead.value.toLocaleString()}</span>
                                    </div>
                                )}
                                {lead.source && (
                                    <div className="text-xs text-muted-foreground">
                                        Source: <span className="font-medium">{lead.source}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    {!loading && leads.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No leads found.
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New Lead"
                description="Capture details for a new sales opportunity."
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Lead Name</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="value">Estimated Value</Label>
                            <Input id="value" name="value" type="number" placeholder="0.00" value={formData.value} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="source">Source (e.g. Website, Referral)</Label>
                        <Input id="source" name="source" value={formData.source} onChange={handleInputChange} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Lead
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
