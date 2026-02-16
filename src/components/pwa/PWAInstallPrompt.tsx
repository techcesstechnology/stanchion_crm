import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Share, PlusSquare, Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Detect iOS (calculated once on mount, no need for state if used during render)
    const isIOS = React.useMemo(() => {
        if (typeof window === 'undefined') return false;
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
    }, []);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // Check if dismissed recently (only show every 7 days if dismissed)
        const lastDismissed = localStorage.getItem('pwa_prompt_dismissed_at');
        if (lastDismissed) {
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - parseInt(lastDismissed) < sevenDaysInMs) {
                return;
            }
        }

        if (isIOS) {
            setIsVisible(true);
        } else {
            const handler = (e: Event) => {
                e.preventDefault();
                setDeferredPrompt(e as BeforeInstallPromptEvent);
                setIsVisible(true);
            };

            window.addEventListener('beforeinstallprompt', handler);

            return () => {
                window.removeEventListener('beforeinstallprompt', handler);
            };
        }
    }, [isIOS]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
    };

    return (
        <Modal
            isOpen={isVisible}
            onClose={handleDismiss}
            title="Install Incaptta CRM"
            description="Install our app to your home screen for quick access, offline support, and a faster experience."
            className="sm:max-w-[420px]"
        >
            <div className="space-y-6 pt-2 pb-4">
                <div className="flex justify-center flex-col items-center gap-4 text-center">
                    <div className="h-24 w-24 bg-primary/5 p-4 rounded-2xl border border-primary/10 shadow-sm">
                        <img src="/pwa-192x192.png" alt="App Icon" className="w-full h-full object-contain" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-xl">The best way to manage</h4>
                        <p className="text-muted-foreground text-sm max-w-[280px]">
                            Get the native experience on your {isIOS ? 'iPhone' : 'Android'} device.
                        </p>
                    </div>
                </div>

                {isIOS ? (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-border space-y-3">
                        <p className="text-sm font-medium flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
                            Tap the <Share className="h-4 w-4 text-primary" /> <strong>Share</strong> button.
                        </p>
                        <p className="text-sm font-medium flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                            Tap <PlusSquare className="h-4 w-4 text-primary" /> <strong>Add to Home Screen</strong>.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 pt-2">
                        <Button size="lg" className="w-full gap-2 h-12 text-md" onClick={handleInstallClick}>
                            <Download className="h-4 w-4" /> Install Now
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleDismiss}>
                            Maybe Later
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
