import { useState } from "react";
import { ActivityType, CreateActivityDTO } from "@/types/activity";
import { ActivityService } from "@/services/activityService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { activityLabels } from "./ActivityTypeFilter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ActivityFormProps {
    contactId?: string;
    leadId?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ActivityForm({ contactId, leadId, isOpen, onClose, onSuccess }: ActivityFormProps) {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<Partial<CreateActivityDTO>>({
        type: 'note',
        title: '',
        description: '',
        eventDate: new Date()
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.type || !formData.eventDate) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);
        try {
            await ActivityService.addActivity({
                ...formData as CreateActivityDTO,
                contactId,
                leadId
            });
            toast.success("Activity added successfully");
            onSuccess();
            onClose();
            setFormData({
                type: 'note',
                title: '',
                description: '',
                eventDate: new Date()
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to add activity");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Activity"
            description="Log a new interaction or event."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <select
                            id="type"
                            aria-label="Activity Type"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ActivityType }))}
                        >
                            {Object.entries(activityLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="datetime-local"
                            required
                            value={formData.eventDate ? new Date(formData.eventDate.getTime() - (formData.eventDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                eventDate: new Date(e.target.value)
                            }))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                        id="title"
                        placeholder="Brief summary..."
                        required
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Detailed notes..."
                        className="min-h-[100px]"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Activity
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
