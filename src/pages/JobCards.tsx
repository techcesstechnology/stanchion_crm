import { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/cn";
import { JobCard, JobCardMaterial } from "@/types/jobCard";
import { CatalogItem, Contact } from "@/types";
import { JobCardService } from "@/services/jobCardService";
import { CatalogService } from "@/services/catalogService";
import { ContactService } from "@/services/contactService";
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
    X
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

    // Form State
    const [formData, setFormData] = useState({
        projectName: "",
        description: "",
        clientName: "",
        clientId: ""
    });
    const [selectedMaterials, setSelectedMaterials] = useState<JobCardMaterial[]>([]);

    // Detail Modal State
    const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

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
        toast.info(`Added ${item.name}`);
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

    const calculateTotal = () => selectedMaterials.reduce((sum, m) => sum + m.totalCost, 0);

    const handleCreateJobCard = async () => {
        if (!profile) return;
        setIsSaving(true);
        try {
            const id = await JobCardService.addJobCard({
                ...formData,
                materials: selectedMaterials,
            }, profile);

            await JobCardService.submitJobCard(id, profile);

            toast.success("Job Card submitted for Accountant approval");
            handleCloseModal();
            loadData();
        } catch (error) {
            console.error("Error creating job card:", error);
            toast.error("Failed to create job card");
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

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setStep(1);
        setFormData({ projectName: "", description: "", clientName: "", clientId: "" });
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
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-green-400 dark:text-green-100">Estimated Project Valuation</p>
                                                <p className="text-4xl font-black mt-1 tracking-tight group-hover:scale-105 transition-transform origin-left">${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="text-right">
                                                <Badge className="bg-white/10 text-white border-0 py-1.5 px-3 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                    {selectedMaterials.length} Asset Types
                                                </Badge>
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
                                        <tr>
                                            <td colSpan={3} className="px-5 py-5 text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Project Budget Total:</td>
                                            <td className="px-5 py-5 text-right font-black text-xl text-green-600 tabular-nums italic">
                                                ${selectedJobCard.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
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
        </div>
    );
}
