import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error: unknown) {
            console.log('SW registration error', error);
        },
    });

    useEffect(() => {
        if (offlineReady) {
            toast.success('App ready to work offline');
            setOfflineReady(false);
        }
    }, [offlineReady, setOfflineReady]);

    return (
        <Modal
            isOpen={needRefresh}
            onClose={() => { }} // Empty to prevent closing by clicking outside or X
            title="App Update Available"
            description="A new version of Incaptta CRM is ready. Please update now to ensure you have the latest features and fixes."
            className="sm:max-w-[400px]"
        >
            <div className="flex flex-col items-center gap-6 py-4 text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 text-primary animate-spin-slow" />
                </div>
                <div className="space-y-4 w-full">
                    <Button
                        size="lg"
                        className="w-full gap-2 text-lg h-14"
                        onClick={() => updateServiceWorker(true)}
                    >
                        <RefreshCw className="h-5 w-5" />
                        Update & Refresh Now
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        This update is mandatory to keep your data in sync.
                    </p>
                </div>
            </div>
        </Modal>
    );
}
