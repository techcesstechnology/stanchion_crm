import * as React from "react"
import { cn } from "@/lib/cn"
import { ChevronDown } from "lucide-react"

// Simplified Select component mimicking shadcn/ui.
// Re-implemented with proper types to avoid build errors.

interface SelectContextType {
    value: string;
    onValueChange: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextType>({
    value: "",
    onValueChange: () => { },
});

interface SelectProps {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
}

export const Select = ({ children, value, onValueChange }: SelectProps) => {
    const [open, setOpen] = React.useState(false);
    const handleSelect = (newValue: string) => {
        if (onValueChange) onValueChange(newValue);
        setOpen(false);
    }

    return (
        <SelectContext.Provider value={{ value, onValueChange: handleSelect }}>
            <div className="relative">
                {React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return React.cloneElement(child, { open, setOpen } as any);
                    }
                    return child;
                })}
            </div>
        </SelectContext.Provider>
    )
}

interface SelectTriggerProps {
    children: React.ReactNode;
    className?: string;
    open?: boolean;
    setOpen?: (open: boolean) => void;
}

export const SelectTrigger = ({ children, open, setOpen, className }: SelectTriggerProps) => {
    return (
        <button
            type="button"
            onClick={() => setOpen && setOpen(!open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    )
}

interface SelectValueProps {
    placeholder?: string;
}

export const SelectValue = ({ placeholder }: SelectValueProps) => {
    const { value } = React.useContext(SelectContext);
    return <span>{value || placeholder}</span>;
}

interface SelectContentProps {
    children: React.ReactNode;
    open?: boolean;
    className?: string;
}

export const SelectContent = ({ children, open, className }: SelectContentProps) => {
    if (!open) return null;
    return (
        <div className={cn("absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 w-full mt-1", className)}>
            <div className="p-1">
                {children}
            </div>
        </div>
    )
}

interface SelectItemProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export const SelectItem = ({ value, children, className }: SelectItemProps) => {
    const { onValueChange } = React.useContext(SelectContext);
    return (
        <div
            onClick={() => onValueChange(value)}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-slate-100 cursor-pointer",
                className
            )}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {/* Check icon could go here */}
            </span>
            <span className="truncate">{children}</span>
        </div>
    )
}
