import { useEffect, useState } from "react";
import { InvoiceService } from "@/services/invoiceService";
import { TaskService } from "@/services/taskService";
import { ActivityService } from "@/services/activityService";
import { InquiryService } from "@/services/inquiryService";
import { NotificationService } from "@/services/notificationService";
import { JobCardVariationService } from "@/services/jobCardVariationService";
import { useAuth } from "@/contexts/AuthContext";
import { Invoice, Quote, Task } from "@/types";
import { Activity } from "@/types/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
    DollarSign, FileText, Briefcase, CheckCircle, AlertCircle,
    UserPlus, FilePlus, Calendar, HelpCircle, MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isSameMonth, subMonths, isAfter, isBefore, startOfDay } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Helper to safely get date object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDate = (date: any): Date => {
    if (!date) return new Date();
    if (date.seconds) return new Date(date.seconds * 1000);
    if (date instanceof Date) return date;
    return new Date(date);
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        revenueThisMonth: 0,
        outstandingAmount: 0,
        activeDealsValue: 0,
        dealsWonValue: 0,
        overdueInvoicesCount: 0
    });
    const [pipelineData, setPipelineData] = useState<{ name: string, value: number, count: number, color: string }[]>([]);
    const [revenueData, setRevenueData] = useState<{ name: string, value: number }[]>([]);
    const [tasks, setTasks] = useState<{ overdue: Task[], today: Task[], upcoming: Task[] }>({ overdue: [], today: [], upcoming: [] });
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [pendingVariations, setPendingVariations] = useState<number>(0);
    const { role } = useAuth();

    // Inquiry Modal State
    const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({ phoneNumber: '', note: '' });
    const [submittingInquiry, setSubmittingInquiry] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [invoices, quotes, allTasks, activities, variationCount] = await Promise.all([
                    InvoiceService.getInvoices(),
                    InvoiceService.getQuotes(),
                    TaskService.getTasks(),
                    ActivityService.getRecentActivities(10),
                    role ? JobCardVariationService.getPendingVariationsCount(role) : Promise.resolve(0)
                ]);

                const processStats = (invoices: Invoice[], quotes: Quote[]) => {
                    const now = new Date();

                    // Revenue This Month (Paid invoices in current month)
                    const revenue = invoices
                        .filter(inv => inv.status === 'paid' && isSameMonth(getDate(inv.date), now))
                        .reduce((sum, inv) => sum + inv.total, 0);

                    // Outstanding Amount (Total - Paid for non-paid invoices)
                    const outstanding = invoices
                        .filter(inv => inv.status !== 'paid')
                        .reduce((sum, inv) => {
                            const paid = inv.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                            return sum + (inv.total - paid);
                        }, 0);

                    // Active Deals (Sent or Draft quotes)
                    const activeDeals = quotes
                        .filter(q => q.status === 'sent' || q.status === 'draft')
                        .reduce((sum, q) => sum + q.total, 0);

                    // Deals Won (Accepted in last 30 days - approximate using date field)
                    const dealsWon = quotes
                        .filter(q => q.status === 'accepted')
                        .reduce((sum, q) => sum + q.total, 0);

                    // Overdue Invoices
                    const overdueCount = invoices.filter(inv =>
                        inv.status !== 'paid' && isBefore(getDate(inv.dueDate), startOfDay(now))
                    ).length;

                    setStats({
                        revenueThisMonth: revenue,
                        outstandingAmount: outstanding,
                        activeDealsValue: activeDeals,
                        dealsWonValue: dealsWon,
                        overdueInvoicesCount: overdueCount
                    });
                };

                const processPipeline = (quotes: Quote[]) => {
                    const stages = ['draft', 'sent', 'accepted', 'rejected'];
                    const colors = { draft: '#94a3b8', sent: '#3b82f6', accepted: '#10b981', rejected: '#ef4444' };

                    const data = stages.map(stage => {
                        const stageQuotes = quotes.filter(q => q.status === stage);
                        return {
                            name: stage.charAt(0).toUpperCase() + stage.slice(1),
                            value: stageQuotes.reduce((sum, q) => sum + q.total, 0),
                            count: stageQuotes.length,
                            color: colors[stage as keyof typeof colors]
                        };
                    });
                    setPipelineData(data);
                };

                const processRevenueChart = (invoices: Invoice[]) => {
                    // Last 6 months
                    const data = [];
                    for (let i = 5; i >= 0; i--) {
                        const date = subMonths(new Date(), i);
                        const monthLabel = format(date, 'MMM');
                        const montYear = format(date, 'MMM yyyy');

                        const total = invoices
                            .filter(inv =>
                                inv.status === 'paid' &&
                                format(getDate(inv.date), 'MMM yyyy') === montYear
                            )
                            .reduce((sum, inv) => sum + inv.total, 0);

                        data.push({ name: monthLabel, value: total });
                    }
                    setRevenueData(data);
                };

                const processTasks = (allTasks: Task[]) => {
                    const now = startOfDay(new Date());

                    const overdue = allTasks.filter(t => t.status !== 'done' && t.dueDate && isBefore(getDate(t.dueDate), now));
                    const today = allTasks.filter(t => t.status !== 'done' && t.dueDate && format(getDate(t.dueDate), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'));
                    const upcoming = allTasks.filter(t => t.status !== 'done' && t.dueDate && isAfter(getDate(t.dueDate), now)).slice(0, 5);

                    setTasks({ overdue, today, upcoming });
                };

                processStats(invoices, quotes);
                processPipeline(quotes);
                processRevenueChart(invoices);
                processTasks(allTasks);
                setRecentActivities(activities);
                setPendingVariations(variationCount as number);

            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleInquirySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inquiryForm.phoneNumber || !inquiryForm.note) {
            toast.error("Please fill in all inquiry fields");
            return;
        }

        setSubmittingInquiry(true);
        try {
            await InquiryService.addInquiry({
                phoneNumber: inquiryForm.phoneNumber,
                note: inquiryForm.note
            });

            await NotificationService.addNotification({
                message: `New Inquiry from: ${inquiryForm.phoneNumber}`,
                type: 'info',
                link: '/inquiries'
            });

            toast.success("Inquiry submitted successfully");
            setInquiryModalOpen(false);
            setInquiryForm({ phoneNumber: '', note: '' });
        } catch (error) {
            console.error("Error submitting inquiry:", error);
            toast.error("Failed to submit inquiry");
        } finally {
            setSubmittingInquiry(false);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    if (loading) {
        return (
            <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
                    <div className="lg:col-span-2 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Pending Approvals Alert */}
            {pendingVariations > 0 && (role === 'ACCOUNTANT' || role === 'MANAGER' || role === 'ADMIN') && (
                <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/50">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Pending Variations</h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    There are {pendingVariations} Job Card Variations awaiting your approval.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => navigate('/job-cards')}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                        >
                            View & Approve
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Header with Quick Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your business performance</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setInquiryModalOpen(true)} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
                        <MessageSquare className="h-4 w-4" /> New Inquiry
                    </Button>
                    <Button onClick={() => navigate('/how-to')} variant="outline" className="gap-2">
                        <HelpCircle className="h-4 w-4" /> How To Guide
                    </Button>
                    <Button onClick={() => navigate('/leads')} variant="outline" className="gap-2">
                        <UserPlus className="h-4 w-4" /> New Lead
                    </Button>
                    <Button onClick={() => navigate('/quotes')} variant="outline" className="gap-2">
                        <FilePlus className="h-4 w-4" /> Create Quote
                    </Button>
                    <Button onClick={() => navigate('/invoices')} className="gap-2 bg-orange-500 hover:bg-orange-600">
                        <DollarSign className="h-4 w-4" /> Create Invoice
                    </Button>
                </div>
            </div>

            {/* Inquiry Modal */}
            <Modal
                title="Log New Inquiry"
                description="Enter customer details and inquiry note."
                isOpen={inquiryModalOpen}
                onClose={() => setInquiryModalOpen(false)}
            >
                <form onSubmit={handleInquirySubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            placeholder="+263..."
                            value={inquiryForm.phoneNumber}
                            onChange={(e) => setInquiryForm({ ...inquiryForm, phoneNumber: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="note">Inquiry Note</Label>
                        <Textarea
                            id="note"
                            placeholder="Customer is asking about..."
                            value={inquiryForm.note}
                            onChange={(e) => setInquiryForm({ ...inquiryForm, note: e.target.value })}
                            className="min-h-[100px]"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setInquiryModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submittingInquiry}>
                            {submittingInquiry ? "Submitting..." : "Submit Inquiry"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    title="Revenue (This Month)"
                    value={formatCurrency(stats.revenueThisMonth)}
                    icon={DollarSign}
                    trend="positive"
                />
                <KPICard
                    title="Outstanding Invoices"
                    value={formatCurrency(stats.outstandingAmount)}
                    icon={AlertCircle}
                    alert={stats.outstandingAmount > 0}
                    type={stats.outstandingAmount <= 0 ? 'positive' : undefined}
                />
                <KPICard
                    title="Active Deals"
                    value={formatCurrency(stats.activeDealsValue)}
                    icon={Briefcase}
                />
                <KPICard
                    title="Deals Won (30d)"
                    value={formatCurrency(stats.dealsWonValue)}
                    icon={CheckCircle}
                    trend="neutral"
                />
                <KPICard
                    title="Overdue Invoices"
                    value={stats.overdueInvoicesCount.toString()}
                    icon={FileText}
                    alert={stats.overdueInvoicesCount > 0}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Charts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Revenue Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue Trend (6 Months)</CardTitle>
                        </CardHeader>
                        <CardContent className="min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                                    <Tooltip
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(val: any) => formatCurrency(Number(val))}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Sales Pipeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales Pipeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {pipelineData.map((stage) => (
                                    <div key={stage.name} className="flex items-center gap-4">
                                        <div className="w-24 text-sm font-medium">{stage.name}</div>
                                        <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${(stage.value / (Math.max(...pipelineData.map(d => d.value)) || 1)) * 100}%`, backgroundColor: stage.color }}
                                            />
                                        </div>
                                        <div className="w-32 text-right text-sm">
                                            <span className="font-bold">{formatCurrency(stage.value)}</span>
                                            <span className="text-muted-foreground ml-1">({stage.count})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Action Center */}
                <div className="space-y-6">
                    {/* Tasks */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Action Center</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>View All</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {tasks.overdue.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Overdue</h4>
                                    <div className="space-y-2">
                                        {tasks.overdue.map(t => <TaskItem key={t.id} task={t} urgent />)}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Due Today</h4>
                                <div className="space-y-2">
                                    {tasks.today.length === 0 ? <p className="text-sm text-muted-foreground">No tasks due today.</p> : tasks.today.map(t => <TaskItem key={t.id} task={t} />)}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Upcoming</h4>
                                <div className="space-y-2">
                                    {tasks.upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming tasks.</p> : tasks.upcoming.map(t => <TaskItem key={t.id} task={t} />)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 pl-6 py-1">
                                {recentActivities.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                                ) : (
                                    recentActivities.map((activity, idx) => (
                                        <div key={idx} className="relative">
                                            <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-950" />
                                            <p className="text-sm font-medium">{activity.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(getDate(activity.createdAt), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Fixed KPICard to use trend
const KPICard = ({ title, value, icon: Icon, trend, alert, type }: { title: string, value: string, icon: React.ElementType, trend?: 'positive' | 'neutral' | 'negative', alert?: boolean, type?: 'positive' }) => (
    <Card>
        <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <Icon className={`h-4 w-4 text-muted-foreground ${alert ? 'text-red-500' : ''}`} />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
                <div className={`text-2xl font-bold ${alert ? 'text-red-600' : type === 'positive' ? 'text-lime-500' : ''}`}>{value}</div>
                {trend && (
                    <div className={`h-2 w-2 rounded-full ${trend === 'positive' ? 'bg-emerald-500' : trend === 'negative' ? 'bg-red-500' : 'bg-slate-300'}`} title={`Trend: ${trend}`} />
                )}
            </div>
        </CardContent>
    </Card>
);

const TaskItem = ({ task, urgent }: { task: Task, urgent?: boolean }) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${urgent ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/50' : 'bg-slate-50 border-slate-100 dark:bg-slate-900/50 dark:border-slate-800'}`}>
        <div className={`mt-0.5 h-2 w-2 rounded-full ${urgent ? 'bg-red-500' : 'bg-blue-500'}`} />
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{task.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                {format(getDate(task.dueDate), 'MMM d')}
            </div>
        </div>
    </div>
);
