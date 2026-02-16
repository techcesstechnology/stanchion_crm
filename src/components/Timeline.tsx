import { useCallback, useEffect, useState } from "react";
import { Activity, ActivityType } from "@/types/activity";
import { ActivityService } from "@/services/activityService";
import { ActivityTypeFilter, activityIcons, activityLabels } from "./ActivityTypeFilter";
import { ActivityForm } from "./ActivityForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Plus, Trash2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TimelineProps {
    contactId?: string;
    leadId?: string;
}

export function Timeline({ contactId, leadId }: TimelineProps) {
    const { user } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);

    const fetchActivities = useCallback(async () => {
        if (!contactId && !leadId) return;

        try {
            setLoading(true);
            const targetId = (contactId || leadId)!;
            const targetType = contactId ? 'contact' : 'lead';
            const { activities: data } = await ActivityService.getActivities(targetId, targetType);
            setActivities(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load activities");
        } finally {
            setLoading(false);
        }
    }, [contactId, leadId]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this activity?")) return;

        try {
            await ActivityService.deleteActivity(id);
            setActivities(prev => prev.filter(a => a.id !== id));
            toast.success("Activity deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete activity");
        }
    };

    const filteredActivities = filterType === 'all'
        ? activities
        : activities.filter(a => a.type === filterType);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold">Activity Timeline</h3>
                <Button size="sm" onClick={() => setIsFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Activity
                </Button>
            </div>

            <ActivityTypeFilter selectedType={filterType} onSelect={setFilterType} />

            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground ml-10">Loading timeline...</div>
                ) : filteredActivities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground ml-10">No activities found.</div>
                ) : (
                    filteredActivities.map((activity) => {
                        const Icon = activityIcons[activity.type];
                        const isAuthor = user?.uid === activity.createdBy.uid;

                        return (
                            <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                {/* Icon */}
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-primary group-[.is-active]:text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors">
                                    <Icon className="h-5 w-5" />
                                </div>

                                {/* Card */}
                                <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">{activity.title}</span>
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                                                {activityLabels[activity.type]}
                                            </span>
                                        </div>
                                        <time className="text-xs font-medium text-slate-500">
                                            {format(activity.eventDate.toDate(), 'MMM d, yyyy h:mm a')}
                                        </time>
                                    </div>

                                    {activity.description && (
                                        <p className="text-slate-600 text-sm mb-2 whitespace-pre-wrap">{activity.description}</p>
                                    )}

                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span>{activity.createdBy.name}</span>
                                        </div>
                                        {isAuthor && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(activity.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        );
                    })
                )}
            </div>

            <ActivityForm
                contactId={contactId}
                leadId={leadId}
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchActivities}
            />
        </div>
    );
}
