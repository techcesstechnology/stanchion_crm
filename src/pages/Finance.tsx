import { useState, useEffect } from "react";
import {
    AccountBalance,
    Transaction,
    AccountType,
    TransactionType
} from "@/types/finance";
import { FinanceService } from "@/services/financeService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Wallet,
    TrendingUp,
    ArrowUpRight,
    ArrowDownLeft,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    Building2,
    Banknote,
    Smartphone,
    History,
    Search,
    Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/cn";

export default function Finance() {
    const [accounts, setAccounts] = useState<AccountBalance[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State for new transaction
    const [formData, setFormData] = useState({
        accountId: "",
        amount: "",
        type: "expense" as TransactionType,
        category: "",
        description: "",
    });

    useEffect(() => {
        loadFinanceData();
    }, []);

    const loadFinanceData = async () => {
        setLoading(true);
        try {
            const [accs, txs] = await Promise.all([
                FinanceService.getAccounts(),
                FinanceService.getRecentTransactions(20)
            ]);
            setAccounts(accs);
            setTransactions(txs);

            // Set default account for form
            if (accs.length > 0 && !formData.accountId) {
                setFormData(prev => ({ ...prev, accountId: accs[0].id }));
            }
        } catch (error) {
            console.error("Error loading finance data:", error);
            toast.error("Failed to load financial records");
        } finally {
            setLoading(false);
        }
    };

    const handleRecordTransaction = async () => {
        if (!formData.accountId || !formData.amount || !formData.description) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSaving(true);
        try {
            await FinanceService.addTransaction({
                accountId: formData.accountId,
                amount: parseFloat(formData.amount),
                type: formData.type,
                category: formData.category || (formData.type === 'income' ? 'Revenue' : 'General Expense'),
                description: formData.description,
            });
            toast.success("Transaction recorded and pending approval");
            setShowRecordModal(false);
            setFormData({
                accountId: accounts[0]?.id || "",
                amount: "",
                type: "expense",
                category: "",
                description: ""
            });
            loadFinanceData();
        } catch (error) {
            console.error("Error recording transaction:", error);
            toast.error("Failed to record transaction");
        } finally {
            setIsSaving(false);
        }
    };

    const handleApproveTransaction = async (id: string) => {
        setLoading(true);
        try {
            await FinanceService.approveTransaction(id);
            toast.success("Transaction approved and balance updated");
            loadFinanceData();
        } catch (error) {
            console.error("Error approving transaction:", error);
            toast.error("Failed to approve transaction");
        } finally {
            setLoading(false);
        }
    };

    const getAccountIcon = (type: AccountType) => {
        switch (type) {
            case "bank": return <Building2 className="w-5 h-5" />;
            case "ecocash": return <Smartphone className="w-5 h-5" />;
            case "cash": return <Banknote className="w-5 h-5" />;
            default: return <Wallet className="w-5 h-5" />;
        }
    };

    const getStatusBadge = (status: Transaction["status"]) => {
        switch (status) {
            case "approved": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
            case "pending": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
            case "rejected": return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            default: return null;
        }
    };

    const filteredTransactions = transactions.filter(tx =>
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <div className="space-y-8 text-slate-900 dark:text-slate-100 p-2 sm:p-0">
            {/* Header section with Total Balance Overview */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black flex items-center gap-3 tracking-tighter uppercase italic">
                        <Wallet className="h-10 w-10 text-green-600" />
                        Treasury Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium tracking-wide">Liquidity overview, accounts, and automated transaction trails.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 px-8 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none flex items-center gap-8 group">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Combined Net Value</p>
                        <p className="text-4xl font-black text-green-600 tracking-tighter group-hover:scale-105 transition-transform origin-left">
                            ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                </div>
            </div>

            {/* Account Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {accounts.map(acc => (
                    <Card key={acc.id} className="relative overflow-hidden border-2 border-slate-100 dark:border-slate-800 group hover:border-green-500/30 transition-all duration-300 bg-white dark:bg-slate-950">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            {getAccountIcon(acc.type)}
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:text-green-600 transition-colors">
                                    {getAccountIcon(acc.type)}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{acc.type} account</span>
                            </div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">{acc.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                                ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center justify-between mt-6">
                                <span className="text-[10px] font-bold text-slate-400">
                                    Last updated {format(acc.updatedAt instanceof Date ? acc.updatedAt : (acc.updatedAt as any).toDate(), "HH:mm")}
                                </span>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest text-green-600 hover:text-green-700 hover:bg-green-50 dark:bg-slate-900">
                                    Details
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Transactions Section */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Transaction List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <History className="w-6 h-6 text-green-600" />
                            Recent Operations
                        </h2>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search tx reference..."
                                className="pl-9 h-9 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden min-h-[400px]">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center p-20 animate-pulse">
                                <Loader2 className="h-10 w-10 animate-spin text-green-600 mb-4" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fetching audit trail...</p>
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 text-center opacity-50 grayscale">
                                <History className="h-16 w-16 text-slate-200 mb-6" />
                                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">No transactions recorded</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-900">
                                {filteredTransactions.map(tx => (
                                    <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group cursor-pointer">
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                                                tx.type === "income"
                                                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 group-hover:scale-110"
                                                    : "bg-red-50 dark:bg-red-900/20 text-red-600 group-hover:scale-110"
                                            )}>
                                                {tx.type === "income" ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight group-hover:text-green-600 transition-colors">{tx.description}</p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.category}</span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {format(tx.date instanceof Date ? tx.date : (tx.date as any).toDate(), "MMM dd, HH:mm")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <p className={cn(
                                                "text-lg font-black tracking-tighter",
                                                tx.type === "income" ? "text-green-600" : "text-red-500"
                                            )}>
                                                {tx.type === "income" ? "+" : "-"}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(tx.status)}
                                                {tx.status === "pending" && (
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApproveTransaction(tx.id);
                                                        }}
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-7 text-[10px] px-3 rounded-full"
                                                    >
                                                        Approve
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Action Panel */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <Plus className="w-6 h-6 text-green-600" />
                        Quick Actions
                    </h2>

                    <Card
                        onClick={() => setShowRecordModal(true)}
                        className="border-2 border-slate-100 dark:border-slate-800 bg-green-600 text-white overflow-hidden relative group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                        <CardHeader className="relative">
                            <Plus className="w-10 h-10 mb-4 text-green-200" />
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Record Transaction</CardTitle>
                            <CardDescription className="text-green-100 font-medium tracking-wide">Manual logging for petty cash or external bank fees.</CardDescription>
                        </CardHeader>
                    </Card>

                    <Card className="border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden relative group cursor-pointer hover:border-slate-300 transition-all duration-200">
                        <CardHeader>
                            <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-500 mb-4">
                                <ArrowUpRight className="w-6 h-6 text-slate-400" />
                            </div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Inter-Account Transfer</CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Move funds between EcoCash and Bank accounts.</CardDescription>
                        </CardHeader>
                    </Card>

                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">30-Day Velocity</h4>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600">
                                        <ArrowDownLeft className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Inflow</span>
                                </div>
                                <span className="text-sm font-black text-green-600">+$2,450.00</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                        <ArrowUpRight className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Outflow</span>
                                </div>
                                <span className="text-sm font-black text-red-500">-$1,120.00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Record Transaction Modal */}
            {showRecordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 border-green-500/20 bg-white dark:bg-slate-950 overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-black uppercase tracking-tighter">Record Operation</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setShowRecordModal(false)} className="rounded-full">
                                    <Plus className="rotate-45 h-6 w-6" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Operation Type</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={formData.type === "expense" ? "default" : "outline"}
                                            onClick={() => setFormData({ ...formData, type: "expense" })}
                                            className={cn("flex-1 text-xs font-bold uppercase", formData.type === "expense" ? "bg-red-500 hover:bg-red-600" : "")}
                                        >
                                            Expense
                                        </Button>
                                        <Button
                                            variant={formData.type === "income" ? "default" : "outline"}
                                            onClick={() => setFormData({ ...formData, type: "income" })}
                                            className={cn("flex-1 text-xs font-bold uppercase", formData.type === "income" ? "bg-green-600 hover:bg-green-700" : "")}
                                        >
                                            Income
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Value (USD)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="font-black text-lg border-2"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Target Account</Label>
                                <select
                                    className="w-full p-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 font-bold text-sm outline-none focus:border-green-500 transition-all appearance-none"
                                    value={formData.accountId}
                                    onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Reference / Description</Label>
                                <Input
                                    placeholder="e.g. Office Stationery, Fuel, Consulting Fee"
                                    className="font-bold border-2"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Category (Optional)</Label>
                                <Input
                                    placeholder="e.g. Utilities, Logistics, Services"
                                    className="font-bold border-2"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                        </CardContent>

                        <div className="p-6 border-t bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
                            <Button variant="ghost" className="flex-1 font-bold uppercase tracking-widest text-xs" onClick={() => setShowRecordModal(false)}>Cancel</Button>
                            <Button
                                className="flex-1 bg-slate-900 dark:bg-green-600 hover:bg-black dark:hover:bg-green-700 font-black uppercase tracking-widest text-xs"
                                onClick={handleRecordTransaction}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Commit Ledger
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
