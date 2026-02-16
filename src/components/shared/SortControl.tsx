import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";

export interface SortOption {
    label: string;
    value: string;
    field: string;
    direction: "asc" | "desc";
}

interface SortControlProps {
    options: SortOption[];
    onSortChange: (option: SortOption) => void;
    defaultValue?: string;
}

export function SortControl({ options, onSortChange, defaultValue }: SortControlProps) {
    const [selected, setSelected] = React.useState(defaultValue || options[0]?.value);

    const handleValueChange = (value: string) => {
        setSelected(value);
        const option = options.find((o) => o.value === value);
        if (option) {
            onSortChange(option);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort by:</Label>
            <Select value={selected} onValueChange={handleValueChange}>
                <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
