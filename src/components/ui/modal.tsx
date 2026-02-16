import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/button"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    description?: string
    className?: string
}

export function Modal({ isOpen, onClose, title, children, description, className }: ModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className={cn(
                    "bg-background rounded-lg shadow-lg w-full max-w-lg border border-border animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]",
                    className
                )}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
                        {description && (
                            <p className="text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}
