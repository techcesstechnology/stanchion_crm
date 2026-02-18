import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { SettingsService } from "@/services/settingsService";
import {
    LayoutDashboard,
    Users,
    Target,
    CheckSquare,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    ShieldAlert,
    Package,
    Sun,
    Moon,
    HelpCircle,
    Bell,
    MessageSquare,
    ClipboardList,
    Wallet
} from "lucide-react";
import { NotificationPanel } from "./shared/NotificationPanel";
import { cn } from "@/lib/cn";

export default function Layout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [companyName, setCompanyName] = useState<string>("Incaptta CRM");
    const location = useLocation();
    const navigate = useNavigate();
    const { firebaseUser, role, profile } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await SettingsService.getCompanySettings();
                if (settings.logoUrl) setLogoUrl(settings.logoUrl);
                if (settings.companyName) setCompanyName(settings.companyName);
            } catch (error) {
                console.error("Failed to load layout settings", error);
            }
        };
        loadSettings();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    const navItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Job Cards", href: "/job-cards", icon: ClipboardList },
        { name: "Finance", href: "/finance", icon: Wallet },
        { name: "Contacts", href: "/contacts", icon: Users },
        { name: "Leads", href: "/leads", icon: Target },
        { name: "Tasks", href: "/tasks", icon: CheckSquare },
        { name: "Quotes", href: "/quotes", icon: FileText },
        { name: "Invoices", href: "/invoices", icon: FileText },
        { name: "Inquiries", href: "/inquiries", icon: MessageSquare },
        { name: "Item Catalog", href: "/catalog", icon: Package },
        { name: "Inventory", href: "/inventory", icon: Package },
        { name: "How To Guide", href: "/how-to", icon: HelpCircle },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    if (role === 'ADMIN') {
        navItems.push({ name: 'Super Admin', href: '/super-admin', icon: ShieldAlert });
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out lg:transform-none",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex justify-center items-center h-20">
                            {logoUrl ? (
                                <img src={logoUrl} alt={companyName} className="max-h-full max-w-full block object-contain" />
                            ) : (
                                <div className="flex items-center gap-2 text-xl font-bold text-primary h-full">
                                    <img src="/app-logo.png" alt={companyName} className="max-h-full max-w-full block object-contain" />
                                </div>
                            )}
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    location.pathname === item.href
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-foreground"
                                )}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-3 px-3">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {profile?.displayName?.charAt(0).toUpperCase() || firebaseUser?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-sm font-medium truncate">{profile?.displayName || firebaseUser?.displayName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{firebaseUser?.email}</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            Log out
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-4 justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 lg:hidden"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                        <div className="h-8 flex items-center">
                            {logoUrl ? (
                                <img src={logoUrl} alt={companyName} className="max-h-full max-w-full block object-contain" />
                            ) : (
                                <div className="h-full flex items-center gap-2">
                                    <img src="/app-logo.png" alt={companyName} className="h-full w-auto object-contain" />
                                    <span className="font-bold text-lg truncate hidden sm:inline">{companyName}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className="relative h-10 w-10 text-muted-foreground hover:text-foreground"
                                title="Notifications"
                            >
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-slate-950" />
                            </Button>
                            <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="h-10 w-10 text-muted-foreground hover:text-foreground"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>
                    </div>
                </header>
                <div className="flex-1 p-4 lg:p-8 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
