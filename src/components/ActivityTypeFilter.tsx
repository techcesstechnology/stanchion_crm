import { ActivityType } from "@/types/activity";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
    MessageSquare,
    Phone,
    Users,
    Mail,
    RefreshCw,
    FileText,
    Receipt,
    Paperclip
} from "lucide-react";

interface ActivityTypeFilterProps {
    selectedType: ActivityType | 'all';
    onSelect: (type: ActivityType | 'all') => void;
}

export const activityIcons: Record<ActivityType, React.ElementType> = {
    note: MessageSquare,
    call: Phone,
    meeting: Users,
    email: Mail,
    status_change: RefreshCw,
    quote: FileText,
    invoice: Receipt,
    file: Paperclip
};

export const activityLabels: Record<ActivityType, string> = {
    note: 'Note',
    call: 'Call',
    meeting: 'Meeting',
    email: 'Email',
    status_change: 'Status',
    quote: 'Quote',
    invoice: 'Invoice',
    file: 'File'
};

export function ActivityTypeFilter({ selectedType, onSelect }: ActivityTypeFilterProps) {
    return (
        <div className="flex flex-wrap gap-2 pb-4">
            <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelect('all')}
                className="rounded-full"
            >
                All
            </Button>
            {Object.entries(activityIcons).map(([type, Icon]) => (
                <Button
                    key={type}
                    variant={selectedType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSelect(type as ActivityType)}
                    className={cn(
                        "rounded-full gap-1.5",
                        selectedType !== type && "text-muted-foreground"
                    )}
                >
                    <Icon className="h-3.5 w-3.5" />
                    {activityLabels[type as ActivityType]}
                </Button>
            ))}
        </div>
    );
}
