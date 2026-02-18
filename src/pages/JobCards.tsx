import { useState, useEffect } from "react";
import { Timestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/cn";
import {
    JobCard,
    JobCardMaterial,
    JobCardExpense
} from "@/types/jobCard";
import { AccountBalance } from "@/types/finance";
import { CatalogItem, Contact } from "@/types";
import { JobCardVariation, VariationMaterial } from "@/types/jobCardVariation";
import { JobCardService } from "@/services/jobCardService";
import { CatalogService } from "@/services/catalogService";
import { ContactService } from "@/services/contactService";
import { JobCardVariationService } from "@/services/jobCardVariationService";
import { FinanceService } from "@/services/financeService";
import { WorkflowService } from "@/services/workflowService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EnterpriseModal as Modal } from "@/components/ui/EnterpriseModal";
import {
    Plus,
    Search,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    ClipboardList,
    Loader2,
    ArrowRight,
    ArrowLeft,
    Trash2,
    ShoppingCart,
    User,
    Package,
    FileDown,
    X,
    Banknote
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function JobCards() {
    const [jobCards, setJobCards] = useState<JobCard[]>([]);
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const { profile, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [step, setStep] = useState(1); // 1: Details, 2: Materials
    const [isSaving, setIsSaving] = useState(false);
    const [variations, setVariations] = useState<JobCardVariation[]>([]);
    const [showVariationModal, setShowVariationModal] = useState(false);
    const [variationStep, setVariationStep] = useState(1);
    const [accounts, setAccounts] = useState<AccountBalance[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        projectName: "",
        description: "",
        clientName: "",
        clientId: "",
        expenses: [] as JobCardExpense[]
    });

    const [variationData, setVariationData] = useState({
        reason: "",
        notes: "",
        expenseAccountId: "",
        items: [] as VariationMaterial[],
        expenses: [] as JobCardExpense[]
    });
    const [selectedMaterials, setSelectedMaterials] = useState<JobCardMaterial[]>([]);

    // Detail Modal State
    const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        loadData();
        loadFinanceAccounts();
    }, []);

    const loadFinanceAccounts = async () => {
        try {
            const accs = await FinanceService.getAccounts();
            setAccounts(accs);
            if (accs.length > 0 && !variationData.expenseAccountId) {
                setVariationData(prev => ({ ...prev, expenseAccountId: accs[0].id }));
            }
        } catch (error) {
            console.error("Error loading accounts:", error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [cards, items, contactList] = await Promise.all([
                JobCardService.getJobCards(),
                CatalogService.getItems(),
                ContactService.getContacts()
            ]);
            setJobCards(cards);
            setCatalogItems(items);
            setContacts(contactList);
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load project data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = (item: CatalogItem) => {
        const existing = selectedMaterials.find(m => m.id === item.id);
        if (existing) {
            setSelectedMaterials(selectedMaterials.map(m =>
                m.id === item.id ? { ...m, quantity: m.quantity + 1, totalCost: (m.quantity + 1) * m.unitCost } : m
            ));
        } else {
            setSelectedMaterials([...selectedMaterials, {
                id: item.id,
                name: item.name,
                quantity: 1,
                unitCost: item.price,
                totalCost: item.price,
                units: item.unit || "pcs"
            }]);
        }
        toast.info(`Added ${item.name} `);
    };

    const handleRemoveMaterial = (id: string) => {
        setSelectedMaterials(selectedMaterials.filter(m => m.id !== id));
    };

    const handleUpdateQuantity = (id: string, qty: number) => {
        if (qty < 1) return;
        setSelectedMaterials(selectedMaterials.map(m =>
            m.id === id ? { ...m, quantity: qty, totalCost: qty * m.unitCost } : m
        ));
    };

    const calculateTotal = () => {
        const materialTotal = selectedMaterials.reduce((sum, m) => sum + m.totalCost, 0);
        const expenseTotal = formData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        return materialTotal + expenseTotal;
    };

    const handleAddExpense = () => {
        setFormData({
            ...formData,
            expenses: [
                ...formData.expenses,
                { id: Math.random().toString(36).substr(2, 9), label: "", amount: 0, category: "" }
            ]
        });
    };

    const handleRemoveExpense = (id: string) => {
        setFormData({
            ...formData,
            expenses: formData.expenses.filter(e => e.id !== id)
        });
    };

    const handleUpdateExpense = (id: string, updates: Partial<JobCardExpense>) => {
        setFormData({
            ...formData,
            expenses: formData.expenses.map(e => e.id === id ? { ...e, ...updates } : e)
        });
    };

    const EXPENSE_CATEGORIES = [
        "Fuel", "Transport", "Labor", "Rent (office)", "Payroll",
        "Asset acquisition", "Marketing and advertising",
        "Internet Subscription", "Phone Airtime", "Other"
    ];

    const handleCreateJobCard = async () => {
        if (!profile) return;
        setIsSaving(true);
        try {
            await JobCardService.addJobCard({
                ...formData,
                expenses: formData.expenses,
                materials: selectedMaterials,
            }, profile);

            toast.success("Job Card created successfully");
            setShowCreateModal(false);
            handleCloseModal();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create job card");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateVariation = async () => {
        if (!profile || !selectedJobCard) return;
        if (!variationData.reason) {
            toast.error("Please provide a reason for this variation");
            return;
        }

        setIsSaving(true);
        try {
            const inventoryTotal = variationData.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
            const expensesTotal = variationData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

            await JobCardVariationService.addVariation({
                jobCardId: selectedJobCard.id,
                jobCardNumber: selectedJobCard.id.substring(0, 5).toUpperCase(), // Or use a proper number if available
                reason: variationData.reason,
                notes: variationData.notes,
                expenseAccountId: variationData.expenseAccountId,
                items: variationData.items,
                expenses: variationData.expenses,
                totals: {
                    inventoryTotal,
                    expensesTotal,
                    grandTotal: inventoryTotal + expensesTotal
                }
            }, profile);

            toast.success("Variation submitted successfully");
            setShowVariationModal(false);
            setVariationData({
                reason: "",
                notes: "",
                expenseAccountId: "",
                items: [],
                expenses: []
            });
            setVariationStep(1);
            // Refresh variations
            const vars = await JobCardVariationService.getVariationsForJobCard(selectedJobCard.id);
            setVariations(vars);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to submit variation");
        } finally {
            setIsSaving(false);
        }
    };

    const handleApproveJobCard = async (id: string, stage: 'ACCOUNTANT' | 'MANAGER') => {
        if (!profile) return;
        setLoading(true);
        try {
            if (stage === 'ACCOUNTANT') {
                await JobCardService.approveAsAccountant(id, profile, "Approved by Accountant");
            } else {
                await JobCardService.approveAsManager(id, profile, "Approved by Manager");
            }
            toast.success("Job Card approved");
            loadData();
        } catch (error) {
            console.error("Error approving job card:", error);
            toast.error("Failed to approve job card");
        } finally {
            setLoading(false);
        }
    };

    const handleRejectJobCard = async (id: string, stage: 'ACCOUNTANT' | 'MANAGER') => {
        if (!profile) return;
        const note = prompt("Please enter a reason for rejection:");
        if (note === null) return;

        setLoading(true);
        try {
            if (stage === 'ACCOUNTANT') {
                await JobCardService.rejectAsAccountant(id, profile, note);
            } else {
                await JobCardService.rejectAsManager(id, profile, note);
            }
            toast.success("Job Card rejected");
            loadData();
        } catch (error) {
            console.error("Error rejecting job card:", error);
            toast.error("Failed to reject job card");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveVariation = async (variationId: string, stage: 'ACCOUNTANT' | 'MANAGER') => {
        if (!profile || !selectedJobCard) return;
        setLoading(true);
        try {
            const varRef = doc(db, "jobCardVariations", variationId);
            if (stage === 'ACCOUNTANT') {
                await WorkflowService.approveAsAccountant(varRef, profile, "Variation approved by Accountant");
            } else {
                await WorkflowService.approveAsManager(varRef, profile, "Variation approved by Manager");
            }
            toast.success("Variation approved");
            // Refresh variations
            const vars = await JobCardVariationService.getVariationsForJobCard(selectedJobCard.id);
            setVariations(vars);
        } catch (error) {
            console.error("Error approving variation:", error);
            toast.error("Failed to approve variation");
        } finally {
            setLoading(false);
        }
    };

    const handleRejectVariation = async (variationId: string, stage: 'ACCOUNTANT' | 'MANAGER') => {
        if (!profile || !selectedJobCard) return;
        const note = prompt("Please enter a reason for rejection:");
        if (note === null) return;

        setLoading(true);
        try {
            const varRef = doc(db, "jobCardVariations", variationId);
            if (stage === 'ACCOUNTANT') {
                await WorkflowService.rejectAsAccountant(varRef, profile, note);
            } else {
                await WorkflowService.rejectAsManager(varRef, profile, note);
            }
            toast.success("Variation rejected");
            // Refresh variations
            const vars = await JobCardVariationService.getVariationsForJobCard(selectedJobCard.id);
            setVariations(vars);
        } catch (error) {
            console.error("Error rejecting variation:", error);
            toast.error("Failed to reject variation");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setStep(1);
        setFormData({
            projectName: "",
            description: "",
            clientName: "",
            clientId: "",
            expenses: []
        });
        setSelectedMaterials([]);
    };

    const getStatusBadge = (status: JobCard['status']) => {
        switch (status) {
            case "APPROVED_FINAL": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
            case "SUBMITTED": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending (Acc)</Badge>;
            case "APPROVED_BY_ACCOUNTANT": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><Clock className="w-3 h-3 mr-1" /> Pending (Mgr)</Badge>;
            case "REJECTED_BY_ACCOUNTANT":
            case "REJECTED_BY_MANAGER": return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            case "DRAFT": return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" /> Draft</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredCards = jobCards.filter(card =>
        card.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 text-slate-900 dark:text-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-green-600" />
                        Job Cards
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage projects, synchronization with inventory, and approvals</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4" />
                    New Job Card
                </Button>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <CardContent className="p-4 bg-white dark:bg-slate-950">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search job cards by project or client..."
                            className="pl-9 border-slate-200 dark:border-slate-800"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Loader2 className="h-10 w-10 animate-spin text-green-600 mb-4" />
                    <p className="text-slate-500 font-medium">Synchronizing project data...</p>
                </div>
            ) : filteredCards.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <ClipboardList className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">No job cards found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm italic">Create your first job card to start tracking projects and inventory usage.</p>
                    <Button onClick={() => setShowCreateModal(true)} variant="outline" className="mt-6 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all">
                        Create First Job Card
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCards.map((card) => (
                        <Card
                            key={card.id}
                            onClick={() => {
                                setSelectedJobCard(card);
                                setShowDetailsModal(true);
                            }}
                            className="group hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 border-l-4 border-l-green-500 flex flex-col cursor-pointer"
                        >
                            <CardHeader className="pb-3 bg-slate-50/30 dark:bg-slate-800/20">
                                <div className="flex justify-between items-start mb-2">
                                    {getStatusBadge(card.status)}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                                        REF: {card.id.substring(0, 8).toUpperCase()}
                                    </span>
                                </div>
                                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-green-600 transition-colors uppercase tracking-tight">{card.projectName}</CardTitle>
                                <div className="flex items-center gap-2 text-sm font-semibold text-green-600 mt-1">
                                    <User className="w-3.5 h-3.5" />
                                    {card.clientName}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 flex-1">
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 h-12 leading-relaxed italic border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                                    "{card.description || "No project description provided."}"
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm py-2 px-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">Estimated Budget:</span>
                                        <span className="font-bold text-green-700 dark:text-green-500 text-xl">
                                            ${card.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">
                                        {card.materials?.length || 0} Materials Allocated
                                    </div>

                                    {card.status === 'APPROVED_FINAL' && card.approvalLetter?.url && (
                                        <div className="pt-2">
                                            <Button
                                                variant="outline"
                                                className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/10 text-xs font-bold"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(card.approvalLetter?.url, '_blank');
                                                }}
                                            >
                                                <FileDown className="w-3.5 h-3.5" />
                                                Download Approval Letter
                                            </Button>
                                        </div>
                                    )}

                                    {(card.status === 'SUBMITTED' && role === 'ACCOUNTANT') && (
                                        <div className="pt-2 flex gap-2">
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleApproveJobCard(card.id, 'ACCOUNTANT');
                                                }}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-all shadow-md text-xs"
                                            >
                                                Acc Approve
                                            </Button>
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRejectJobCard(card.id, 'ACCOUNTANT');
                                                }}
                                                variant="outline"
                                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                            >
                                                Acc Reject
                                            </Button>
                                        </div>
                                    )}

                                    {(card.status === 'APPROVED_BY_ACCOUNTANT' && role === 'MANAGER') && (
                                        <div className="pt-2 flex gap-2">
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleApproveJobCard(card.id, 'MANAGER');
                                                }}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-all shadow-md text-xs"
                                            >
                                                Mgr Approve
                                            </Button>
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRejectJobCard(card.id, 'MANAGER');
                                                }}
                                                variant="outline"
                                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                            >
                                                Mgr Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Job Card Multi-Step Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <Card className="w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 border-green-500/20 dark:border-green-500/20 max-h-[90vh] flex flex-col bg-white dark:bg-slate-950 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800">
                            <div
                                className="h-full bg-green-600 transition-all duration-500 ease-in-out"
                                style={{ width: step === 1 ? '50%' : '100%' }}
                            />
                        </div>

                        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50 pt-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">New Job Card</CardTitle>
                                    <CardDescription className="font-medium text-green-600 uppercase text-[10px] tracking-[0.2em] mt-1">
                                        Step {step} of 2: {step === 1 ? "Project Fundamentals" : "Inventory Synchronization"}
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={handleCloseModal} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                                    <Plus className="rotate-45 h-6 w-6" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 overflow-auto p-8">
                            {step === 1 ? (
                                <div className="grid gap-8 max-w-2xl mx-auto">
                                    <div className="grid gap-3">
                                        <Label htmlFor="projectName" className="text-xs font-bold uppercase tracking-widest text-slate-500">Project Identification *</Label>
                                        <Input
                                            id="projectName"
                                            placeholder="e.g. Warehouse Structural Repair"
                                            className="text-xl py-7 font-bold border-2 border-slate-100 focus:border-green-500 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl"
                                            value={formData.projectName}
                                            onChange={e => setFormData({ ...formData, projectName: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="clientName" className="text-xs font-bold uppercase tracking-widest text-slate-500">Client / Counterparty *</Label>
                                        <div className="relative group">
                                            <Input
                                                id="clientName"
                                                placeholder="Select or enter client name"
                                                className="py-6 border-2 border-slate-100 focus:border-green-500 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl pl-11"
                                                value={formData.clientName}
                                                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                                list="contacts-list"
                                            />
                                            <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                                            <datalist id="contacts-list">
                                                {contacts.map(c => <option key={c.id} value={c.name} />)}
                                            </datalist>
                                        </div>
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-slate-500">Statement of Work</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Clearly define project milestones and material requirements..."
                                            rows={6}
                                            className="border-2 border-slate-100 focus:border-green-500 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl italic leading-relaxed"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-widest">
                                            Note: Material requirements and job expenses are added in the next step.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid lg:grid-cols-2 gap-12 h-full">
                                    {/* Inventory Selection */}
                                    <div className="space-y-6 flex flex-col">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3 uppercase tracking-tight">
                                                <Package className="w-5 h-5 text-green-600" />
                                                Available Resources
                                            </h4>
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] font-black uppercase">{catalogItems.length} SKUs</Badge>
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                                            <Input placeholder="Filter materials..." className="pl-12 py-6 border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl font-medium" />
                                        </div>
                                        <div className="flex-1 border-2 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/20 dark:bg-slate-900/10 overflow-auto border-slate-100 dark:border-slate-800">
                                            {catalogItems.map(item => (
                                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-all group cursor-pointer" onClick={() => handleAddMaterial(item)}>
                                                    <div>
                                                        <p className="font-black text-sm text-slate-800 dark:text-slate-200 group-hover:text-green-600 transition-colors">{item.name}</p>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">${item.price.toFixed(2)} / {item.unit || 'pcs'}</p>
                                                    </div>
                                                    <div className="h-10 w-10 rounded-full border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-green-600 group-hover:border-green-600 group-hover:text-white transition-all">
                                                        <Plus className="w-6 h-6" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Allocated Materials */}
                                    <div className="space-y-6 flex flex-col">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3 uppercase tracking-tight">
                                            <ShoppingCart className="w-5 h-5 text-green-600" />
                                            Allocated Inventory
                                        </h4>
                                        <div className="flex-1 border-2 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 overflow-auto relative">
                                            {selectedMaterials.length === 0 ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-slate-300 dark:text-slate-700 text-center">
                                                    <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                                                    <p className="text-sm font-bold uppercase tracking-widest">No Selection</p>
                                                </div>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                                                        <tr className="text-left text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                                                            <th className="p-4">Material Description</th>
                                                            <th className="p-4 text-center">Quantity</th>
                                                            <th className="p-4 text-right">Extended</th>
                                                            <th className="p-4 w-12"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {selectedMaterials.map(m => (
                                                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 group transition-colors">
                                                                <td className="p-4">
                                                                    <p className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px]">{m.name}</p>
                                                                    <p className="text-[9px] text-slate-400 mt-0.5">${m.unitCost.toFixed(2)}/unit</p>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <Input
                                                                            type="number"
                                                                            className="h-8 w-16 p-1 text-center font-black border-2 border-slate-100 dark:border-slate-800 rounded-lg text-lg"
                                                                            value={m.quantity}
                                                                            onChange={(e) => handleUpdateQuantity(m.id, parseInt(e.target.value))}
                                                                        />
                                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{m.units}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right font-black text-green-700 dark:text-green-500 text-base">
                                                                    ${m.totalCost.toFixed(2)}
                                                                </td>
                                                                <td className="p-4">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-10 w-10 rounded-full text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                                        onClick={() => handleRemoveMaterial(m.id)}
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                        <div className="bg-slate-900 dark:bg-green-600 text-white p-6 rounded-2xl flex items-center justify-between shadow-2xl shadow-green-200/50 dark:shadow-none border-b-8 border-green-600 dark:border-green-700 group">
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-green-400 dark:text-green-100">Estimated Project Valuation</p>
                                                <p className="text-4xl font-black mt-1 tracking-tight group-hover:scale-105 transition-transform origin-left">${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                <div className="flex gap-4 mt-3 pt-3 border-t border-white/10">
                                                    <div>
                                                        <p className="text-[8px] font-bold uppercase text-white/50 tracking-widest">Inventory</p>
                                                        <p className="text-sm font-black">${selectedMaterials.reduce((sum, m) => sum + m.totalCost, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-bold uppercase text-white/50 tracking-widest">Job Expenses</p>
                                                        <p className="text-sm font-black">${formData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right self-start">
                                                <Badge className="bg-white/10 text-white border-0 py-1.5 px-3 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                    {selectedMaterials.length} Asset Types
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Dynamic Job Expenses Section */}
                                        <div className="space-y-6 flex flex-col pt-6 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3 uppercase tracking-tight">
                                                    <Banknote className="w-5 h-5 text-green-600" />
                                                    Job Expenses
                                                </h4>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleAddExpense}
                                                    className="h-8 text-[10px] font-black uppercase border-2 border-slate-100 dark:border-slate-800 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Add Expense
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {formData.expenses.length === 0 ? (
                                                    <div className="p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 bg-slate-50/20">
                                                        <Banknote className="w-10 h-10 mb-2 opacity-20" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-center">No additional expenses registered</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-3">
                                                        {formData.expenses.map((expense) => (
                                                            <div key={expense.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border-2 border-slate-100 dark:border-slate-800 grid grid-cols-[1fr,120px,40px] gap-3 items-end group animate-in slide-in-from-top-2">
                                                                <div className="space-y-2">
                                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Description / Category</Label>
                                                                    <div className="flex gap-2">
                                                                        <select
                                                                            title="Category"
                                                                            value={EXPENSE_CATEGORIES.includes(expense.label) ? expense.label : (expense.label ? "Other" : "")}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val === "Other") {
                                                                                    handleUpdateExpense(expense.id, { label: "" });
                                                                                } else {
                                                                                    handleUpdateExpense(expense.id, { label: val, category: val });
                                                                                }
                                                                            }}
                                                                            className="h-10 px-3 rounded-lg border-2 bg-white dark:bg-slate-950 text-sm font-bold shadow-sm focus:border-green-500 outline-none"
                                                                        >
                                                                            <option value="">Select Category</option>
                                                                            {EXPENSE_CATEGORIES.filter(c => c !== "Other").map(c => <option key={c} value={c}>{c}</option>)}
                                                                            <option value="Other">Other (Custom)</option>
                                                                        </select>
                                                                        <Input
                                                                            placeholder="Specify expense..."
                                                                            className="h-10 font-bold border-2"
                                                                            value={expense.label}
                                                                            onChange={(e) => handleUpdateExpense(expense.id, { label: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-[9px] font-black uppercase text-slate-400">Amount (USD)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="0.00"
                                                                        className="h-10 font-black border-2"
                                                                        value={expense.amount || ""}
                                                                        onChange={(e) => handleUpdateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                                                                    />
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveExpense(expense.id)}
                                                                    className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="border-t p-8 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between gap-6">
                            <Button variant="ghost" onClick={handleCloseModal} className="text-slate-400 hover:text-red-500 font-bold uppercase tracking-widest text-xs">
                                Terminate Process
                            </Button>
                            <div className="flex gap-4">
                                {step === 2 && (
                                    <Button variant="outline" onClick={() => setStep(1)} className="gap-2 px-6 border-2 font-bold uppercase tracking-widest text-xs py-6">
                                        <ArrowLeft className="w-4 h-4" />
                                        Previous
                                    </Button>
                                )}
                                {step === 1 ? (
                                    <Button
                                        onClick={() => setStep(2)}
                                        disabled={!formData.projectName || !formData.clientName}
                                        className="gap-2 bg-slate-900 dark:bg-green-600 hover:bg-black dark:hover:bg-green-700 px-8 py-6 font-black uppercase tracking-widest text-xs transition-all shadow-xl"
                                    >
                                        Proceed to Inventory
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleCreateJobCard}
                                        disabled={isSaving || selectedMaterials.length === 0}
                                        className="gap-3 bg-green-600 hover:bg-green-700 px-12 py-7 font-black uppercase tracking-[0.15em] text-sm animate-pulse-subtle shadow-2xl shadow-green-400/40"
                                    >
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                        Submit for Final approval
                                    </Button>
                                )}
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            )}


            {/* Job Card Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="Job Card Identification"
            >
                {selectedJobCard && (
                    <div className="space-y-8">
                        <div className="flex items-start justify-between bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    {getStatusBadge(selectedJobCard.status)}
                                    <span className="text-[9px] font-bold text-slate-400">
                                        {format(selectedJobCard.createdAt instanceof Date ? selectedJobCard.createdAt : (selectedJobCard.createdAt as Timestamp).toDate(), "MMM dd, yyyy")}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
                                    {selectedJobCard.projectName}
                                </h3>
                                <div className="flex items-center gap-2 text-green-600 font-bold mt-3 text-sm">
                                    <User className="w-4 h-4 text-green-600" />
                                    {selectedJobCard.clientName}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Recorded</p>
                                <p className="font-bold text-slate-800 dark:text-white mt-1">
                                    {format(selectedJobCard.createdAt instanceof Date ? selectedJobCard.createdAt : (selectedJobCard.createdAt as Timestamp).toDate(), "MMM dd, yyyy")}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Statement of Work</Label>
                            <div className="p-5 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 italic text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                "{selectedJobCard.description || "No project description provided."}"
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Allocated Inventory & Resources</Label>
                                <div className="h-6 px-3 bg-green-500/10 text-green-600 rounded-full flex items-center gap-2 border border-green-500/20">
                                    <Package className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase">{selectedJobCard.materials?.length || 0} ITEMS</span>
                                </div>
                            </div>
                            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-5 py-4 font-black uppercase tracking-widest text-slate-400 text-[9px]">Material Description</th>
                                            <th className="px-5 py-4 font-black uppercase tracking-widest text-slate-400 text-[9px] text-center">Qty</th>
                                            <th className="px-5 py-4 font-black uppercase tracking-widest text-slate-400 text-[9px] text-right">Unit Cost</th>
                                            <th className="px-5 py-4 font-black uppercase tracking-widest text-slate-400 text-[9px] text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                                        {selectedJobCard.materials.map((mat, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300 uppercase">{mat.name}</td>
                                                <td className="px-5 py-4 font-black text-center text-slate-500 uppercase">{mat.quantity} <span className="text-[10px] text-slate-400 opacity-50">{mat.units || 'pcs'}</span></td>
                                                <td className="px-5 py-4 text-right font-bold text-slate-500 tabular-nums">${mat.unitCost.toFixed(2)}</td>
                                                <td className="px-5 py-4 text-right font-black text-slate-900 dark:text-white tabular-nums">${mat.totalCost.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50/30 dark:bg-slate-900/30">
                                        {/* Dynamic Expenses */}
                                        {selectedJobCard.expenses && selectedJobCard.expenses.length > 0 && (
                                            <>
                                                {selectedJobCard.expenses.map((expense) => (
                                                    <tr key={expense.id} className="border-t border-slate-100 dark:border-slate-800">
                                                        <td colSpan={3} className="px-5 py-2 text-right font-medium text-[10px] uppercase tracking-widest text-slate-400">
                                                            {expense.label || expense.category || 'Other Expense'}:
                                                        </td>
                                                        <td className="px-5 py-2 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                                            ${expense.amount.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        )}

                                        {/* Legacy Expenses Fallback */}
                                        {(!selectedJobCard.expenses || selectedJobCard.expenses.length === 0) && (
                                            <>
                                                {selectedJobCard.laborCost && selectedJobCard.laborCost > 0 && (
                                                    <tr className="border-t border-slate-100 dark:border-slate-800">
                                                        <td colSpan={3} className="px-5 py-2 text-right font-medium text-[10px] uppercase tracking-widest text-slate-400">Labor Costs:</td>
                                                        <td className="px-5 py-2 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">${selectedJobCard.laborCost.toFixed(2)}</td>
                                                    </tr>
                                                )}
                                                {selectedJobCard.equipmentRental && selectedJobCard.equipmentRental > 0 && (
                                                    <tr className="border-t border-slate-100 dark:border-slate-800">
                                                        <td colSpan={3} className="px-5 py-2 text-right font-medium text-[10px] uppercase tracking-widest text-slate-400">Equipment Rental:</td>
                                                        <td className="px-5 py-2 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">${selectedJobCard.equipmentRental.toFixed(2)}</td>
                                                    </tr>
                                                )}
                                                {selectedJobCard.miscExpenses && selectedJobCard.miscExpenses > 0 && (
                                                    <tr className="border-t border-slate-100 dark:border-slate-800">
                                                        <td colSpan={3} className="px-5 py-2 text-right font-medium text-[10px] uppercase tracking-widest text-slate-400">Misc Expenses:</td>
                                                        <td className="px-5 py-2 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">${selectedJobCard.miscExpenses.toFixed(2)}</td>
                                                    </tr>
                                                )}
                                            </>
                                        )}

                                        {/* Original Totals */}
                                        <tr className="border-t border-slate-200 dark:border-slate-700">
                                            <td colSpan={3} className="px-5 py-3 text-right font-bold text-[10px] uppercase tracking-widest text-slate-400">Base Project Total:</td>
                                            <td className="px-5 py-3 text-right font-black text-sm text-slate-600 tabular-nums">
                                                ${selectedJobCard.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>

                                        {/* Approved Variations */}
                                        {variations.filter(v => v.status === 'APPROVED_FINAL').length > 0 && (
                                            <>
                                                {variations.filter(v => v.status === 'APPROVED_FINAL').map((v) => (
                                                    <tr key={v.id} className="border-t border-slate-100 dark:border-slate-800 bg-blue-50/20">
                                                        <td colSpan={3} className="px-5 py-2 text-right font-medium text-[10px] uppercase tracking-widest text-blue-500">
                                                            Variation #{v.variationNumber}:
                                                        </td>
                                                        <td className="px-5 py-2 text-right font-bold text-blue-600 tabular-nums">
                                                            +${v.totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                                    <td colSpan={3} className="px-5 py-5 text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Grand Total (Incl. Variations):</td>
                                                    <td className="px-5 py-5 text-right font-black text-xl text-green-600 tabular-nums italic">
                                                        ${(selectedJobCard.totalCost + variations.filter(v => v.status === 'APPROVED_FINAL').reduce((acc, v) => acc + v.totals.grandTotal, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </>
                                        )}

                                        {variations.filter(v => v.status === 'APPROVED_FINAL').length === 0 && (
                                            <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                                <td colSpan={3} className="px-5 py-5 text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Project Budget Total:</td>
                                                <td className="px-5 py-5 text-right font-black text-xl text-green-600 tabular-nums italic">
                                                    ${selectedJobCard.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Variations List Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Job Variations (Change Orders)</Label>
                                {selectedJobCard.status === 'APPROVED_FINAL' && (
                                    <Button
                                        size="sm"
                                        onClick={() => setShowVariationModal(true)}
                                        className="h-8 text-[10px] font-black uppercase bg-slate-900 hover:bg-black text-white rounded-lg px-4"
                                    >
                                        <Plus className="w-3 h-3 mr-2" />
                                        Add Variation
                                    </Button>
                                )}
                            </div>

                            {variations.length === 0 ? (
                                <div className="p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                                    <ClipboardList className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No variations requested yet</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {variations.map((v) => (
                                        <div key={v.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-blue-200 transition-all shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                    #{v.variationNumber}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">Variation #{v.variationNumber}</p>
                                                        {getStatusBadge(v.status)}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        Reason: {v.reason.length > 40 ? v.reason.substring(0, 40) + "..." : v.reason}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Impact</p>
                                                    <p className="font-black text-slate-800 dark:text-white tabular-nums">${v.totals.grandTotal.toLocaleString()}</p>
                                                </div>

                                                {/* Action Buttons for Approvers */}
                                                <div className="flex gap-2">
                                                    {v.status === 'SUBMITTED' && (profile?.role === 'ACCOUNTANT' || profile?.role === 'ADMIN') && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase rounded-lg"
                                                                onClick={(e) => { e.stopPropagation(); handleApproveVariation(v.id, 'ACCOUNTANT'); }}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-8 px-3 text-[10px] font-bold uppercase rounded-lg"
                                                                onClick={(e) => { e.stopPropagation(); handleRejectVariation(v.id, 'ACCOUNTANT'); }}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {v.status === 'APPROVED_BY_ACCOUNTANT' && (profile?.role === 'MANAGER' || profile?.role === 'ADMIN') && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase rounded-lg"
                                                                onClick={(e) => { e.stopPropagation(); handleApproveVariation(v.id, 'MANAGER'); }}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-8 px-3 text-[10px] font-bold uppercase rounded-lg"
                                                                onClick={(e) => { e.stopPropagation(); handleRejectVariation(v.id, 'MANAGER'); }}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>

                                                <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Approval Trail */}
                        {selectedJobCard.approvalTrail && selectedJobCard.approvalTrail.length > 0 && (
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Workflow Execution History</Label>
                                <div className="space-y-3">
                                    {selectedJobCard.approvalTrail.map((trail, i) => (
                                        <div key={i} className="flex gap-4 items-start p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                                trail.action === 'APPROVE' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                                            )}>
                                                {trail.action === 'APPROVE' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-[10px] font-black uppercase tracking-tight italic">
                                                        {trail.action}D BY {trail.stage}
                                                    </p>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighterTabular">
                                                        {format(trail.at instanceof Date ? trail.at : (trail.at as Timestamp).toDate(), "MMM dd, HH:mm")}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{trail.byName}</p>
                                                {trail.note && (
                                                    <p className="text-xs text-slate-500 mt-2 italic border-l-4 border-slate-200 dark:border-slate-800 pl-3 leading-relaxed">
                                                        "{trail.note}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {selectedJobCard.status === 'APPROVED_FINAL' && selectedJobCard.approvalLetter?.url && (
                                <Button
                                    className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic tracking-widest rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                                    onClick={() => window.open(selectedJobCard.approvalLetter?.url, '_blank')}
                                >
                                    <FileDown className="w-5 h-5 mr-3" />
                                    Download Certification
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                className="h-14 px-8 border-2 border-slate-100 dark:border-slate-800 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                CLOSE
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Variation Creation Modal */}
            <Modal
                title={`ADD VARIATION: ${selectedJobCard?.projectName}`}
                isOpen={showVariationModal}
                onClose={() => setShowVariationModal(false)}
            >
                <div className="space-y-8 py-2">
                    {/* Stepper */}
                    <div className="flex items-center justify-between px-2 mb-8">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center group cursor-pointer" onClick={() => variationStep > s && setVariationStep(s)}>
                                <div className={cn(
                                    "h-10 w-10 rounded-2xl flex items-center justify-center font-black transition-all duration-300 shadow-sm",
                                    variationStep === s ? "bg-slate-900 text-white scale-110 shadow-lg" :
                                        variationStep > s ? "bg-green-600 text-white" : "bg-slate-100 text-slate-400"
                                )}>
                                    {variationStep > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                                </div>
                                {s < 3 && <div className={cn("w-16 h-1 mx-3 rounded-full transition-colors duration-500", variationStep > s ? "bg-green-600" : "bg-slate-100")} />}
                            </div>
                        ))}
                    </div>

                    {variationStep === 1 ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Context for Change (Reason)</Label>
                                    <Input
                                        placeholder="e.g. Scope expansion requested by client..."
                                        className="h-12 font-bold border-2"
                                        value={variationData.reason}
                                        onChange={e => setVariationData({ ...variationData, reason: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Internal Notes (Optional)</Label>
                                    <Textarea
                                        placeholder="Add any technical details or notes..."
                                        className="min-h-[100px] font-bold border-2"
                                        value={variationData.notes}
                                        onChange={e => setVariationData({ ...variationData, notes: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Treasury Account (for expenses)</Label>
                                    <select
                                        title="Account"
                                        className="w-full h-12 px-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 font-bold text-sm outline-none focus:border-green-500 transition-all appearance-none"
                                        value={variationData.expenseAccountId}
                                        onChange={e => setVariationData({ ...variationData, expenseAccountId: e.target.value })}
                                    >
                                        <option value="">Select account...</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toLocaleString()})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : variationStep === 2 ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Material Requirement Delta</Label>
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-2">Post-Approval Additions</Badge>
                            </div>

                            <div className="grid grid-cols-[1fr,120px,40px] gap-3 mb-6">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-slate-400">Inventory Item</Label>
                                    <select
                                        title="Material"
                                        className="h-10 w-full px-3 rounded-lg border-2 bg-white dark:bg-slate-950 text-sm font-bold shadow-sm focus:border-green-500 outline-none"
                                        onChange={(e) => {
                                            const item = catalogItems.find(i => i.id === e.target.value);
                                            if (item) {
                                                const existing = variationData.items.find(i => i.itemId === item.id);
                                                if (existing) {
                                                    setVariationData({
                                                        ...variationData,
                                                        items: variationData.items.map(i => i.itemId === item.id ? { ...i, qty: i.qty + 1 } : i)
                                                    });
                                                } else {
                                                    setVariationData({
                                                        ...variationData,
                                                        items: [...variationData.items, {
                                                            itemId: item.id,
                                                            name: item.name,
                                                            unit: item.unit || 'pcs',
                                                            qty: 1,
                                                            unitPrice: item.price || 0,
                                                            lineTotal: item.price || 0
                                                        }]
                                                    });
                                                }
                                            }
                                        }}
                                    >
                                        <option value="">Select inventory to add...</option>
                                        {catalogItems.map(item => (
                                            <option key={item.id} value={item.id}>{item.name} (${item.price?.toFixed(2)})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {variationData.items.map((item, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border-2 border-slate-100 dark:border-slate-800 grid grid-cols-[1fr,80px,80px,40px] gap-3 items-center group">
                                        <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{item.name}</p>
                                        <Input
                                            type="number"
                                            className="h-8 font-black text-center"
                                            value={item.qty}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setVariationData({
                                                    ...variationData,
                                                    items: variationData.items.map((it, i) => i === idx ? { ...it, qty: val, lineTotal: val * it.unitPrice } : it)
                                                });
                                            }}
                                        />
                                        <p className="text-xs font-black text-right">${(item.qty * item.unitPrice).toFixed(2)}</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setVariationData({ ...variationData, items: variationData.items.filter((_, i) => i !== idx) })}
                                            className="text-slate-300 hover:text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {variationData.items.length === 0 && (
                                    <div className="p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 bg-slate-50/20">
                                        <Package className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center">No materials added to variation</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Additional Job Expenses</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setVariationData({
                                        ...variationData,
                                        expenses: [...variationData.expenses, { id: Math.random().toString(36).substr(2, 9), label: "", amount: 0, category: "" }]
                                    })}
                                    className="h-8 text-[9px] font-black uppercase border-2 shadow-sm"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add Expense
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {variationData.expenses.map((expense) => (
                                    <div key={expense.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border-2 border-slate-100 dark:border-slate-800 grid grid-cols-[1fr,100px,40px] gap-3 items-end animate-in fade-in zoom-in-95">
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase text-slate-400">Expense Detail / Category</Label>
                                            <div className="flex gap-2">
                                                <select
                                                    title="Category"
                                                    value={EXPENSE_CATEGORIES.includes(expense.label) ? expense.label : (expense.label ? "Other" : "")}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setVariationData({
                                                            ...variationData,
                                                            expenses: variationData.expenses.map(ex => ex.id === expense.id ? { ...ex, label: val === "Other" ? "" : val, category: val === "Other" ? "" : val } : ex)
                                                        });
                                                    }}
                                                    className="h-10 px-3 rounded-lg border-2 bg-white dark:bg-slate-950 text-sm font-bold shadow-sm focus:border-green-500 outline-none"
                                                >
                                                    <option value="">Select Category</option>
                                                    {EXPENSE_CATEGORIES.filter(c => c !== "Other").map(c => <option key={c} value={c}>{c}</option>)}
                                                    <option value="Other">Other</option>
                                                </select>
                                                <Input
                                                    placeholder="Specify..."
                                                    className="h-10 font-bold border-2"
                                                    value={expense.label}
                                                    onChange={(e) => setVariationData({
                                                        ...variationData,
                                                        expenses: variationData.expenses.map(ex => ex.id === expense.id ? { ...ex, label: e.target.value } : ex)
                                                    })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase text-slate-400">Amount</Label>
                                            <Input
                                                type="number"
                                                className="h-10 font-black border-2"
                                                value={expense.amount || ""}
                                                onChange={(e) => setVariationData({
                                                    ...variationData,
                                                    expenses: variationData.expenses.map(ex => ex.id === expense.id ? { ...ex, amount: parseFloat(e.target.value) || 0 } : ex)
                                                })}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setVariationData({ ...variationData, expenses: variationData.expenses.filter(ex => ex.id !== expense.id) })}
                                            className="text-slate-300 hover:text-red-500"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                ))}
                                {variationData.expenses.length === 0 && (
                                    <div className="p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 bg-slate-50/20">
                                        <Banknote className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center">No extra expenses in this variation</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                        {variationStep > 1 && (
                            <Button
                                variant="outline"
                                className="h-14 flex-1 border-2 font-black uppercase rounded-2xl"
                                onClick={() => setVariationStep(variationStep - 1)}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                        )}
                        {variationStep < 3 ? (
                            <Button
                                className="h-14 flex-[2] bg-slate-900 text-white font-black uppercase italic tracking-widest rounded-2xl shadow-xl shadow-slate-200/50"
                                onClick={() => setVariationStep(variationStep + 1)}
                            >
                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                className="h-14 flex-[2] bg-green-600 hover:bg-green-700 text-white font-black uppercase italic tracking-widest rounded-2xl shadow-xl shadow-green-200/50"
                                disabled={isSaving}
                                onClick={handleCreateVariation}
                            >
                                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : "SUBMIT VARIATION"}
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
