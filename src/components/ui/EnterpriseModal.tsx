import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EnterpriseModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    footer?: React.ReactNode
}

export function EnterpriseModal({ isOpen, onClose, title, description, children, footer }: EnterpriseModalProps) {
    // Prevent background scrolling when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-950 sm:rounded-2xl shadow-2xl w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col border-0 sm:border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 sm:px-8 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
                        {description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:px-8">
                    {children}
                </div>

                {/* Sticky Footer */}
                {footer && (
                    <div className="p-6 sm:px-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sm:rounded-b-2xl flex items-center justify-end gap-3 shrink-0 pb-8 sm:pb-6">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
