import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceService } from "@/services/invoiceService";
import { ContactService } from "@/services/contactService";
import { SettingsService } from "@/services/settingsService";
import { UserService } from "@/services/userService";
import { Quote, Contact, InvoiceItem, UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnterpriseModal } from "@/components/ui/EnterpriseModal";
import { LineItemsTable } from "@/components/shared/LineItemsTable";
import { TotalsSummary } from "@/components/shared/TotalsSummary";
import { generateQuotePDF } from "@/utils/pdfGenerator";
import { Plus, Download, FileText, Loader2, Pencil, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useNavigate, useLocation } from "react-router-dom";
import { SortControl, SortOption } from "@/components/shared/SortControl";
import { sortData, SortConfig } from "@/utils/sorting";

export default function Quotes() {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [clientId, setClientId] = useState("");
    const [items, setItems] = useState<InvoiceItem[]>([{ id: '1', description: '', longDescription: '', quantity: 1, price: 0 }]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
        const saved = localStorage.getItem('quotes_sort');
        return saved ? JSON.parse(saved) : { field: 'date', direction: 'desc' };
    });

    const sortOptions: SortOption[] = [
        { label: 'Newest First', value: 'date_desc', field: 'date', direction: 'desc' },
        { label: 'Oldest First', value: 'date_asc', field: 'date', direction: 'asc' },
        { label: 'Client Name A → Z', value: 'name_asc', field: 'clientName', direction: 'asc' },
        { label: 'Client Name Z → A', value: 'name_desc', field: 'clientName', direction: 'desc' },
        { label: 'Highest Amount', value: 'amount_desc', field: 'total', direction: 'desc' },
        { label: 'Lowest Amount', value: 'amount_asc', field: 'total', direction: 'asc' },
        { label: 'Status A → Z', value: 'status_asc', field: 'status', direction: 'asc' },
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const promises: Promise<any>[] = [
                InvoiceService.getQuotes(),
                ContactService.getContacts()
            ];

            if (user) {
                promises.push(UserService.getUserProfile(user.uid));
            }

            const results = await Promise.all(promises);
            setQuotes(results[0]);
            setContacts(results[1]);
            if (results[2]) {
                setUserProfile(results[2]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    // Handle Edit Request from Client Profile
    useEffect(() => {
        if (location.state?.editId && quotes.length > 0) {
            const quoteToEdit = quotes.find(q => q.id === location.state.editId);
            if (quoteToEdit) {
                openEditModal(quoteToEdit);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, quotes]);




    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const calculateDiscountAmount = (subtotal: number) => {
        if (discountType === 'percent') {
            return subtotal * (discountValue / 100);
        }
        return discountValue;
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const discountAmount = calculateDiscountAmount(subtotal);
        return subtotal - discountAmount;
    };

    const openEditModal = (quote: Quote) => {
        setEditingId(quote.id);
        setClientId(quote.clientId);
        setItems(quote.items);

        const safeDate = (date: any) => {
            if (!date) return new Date();
            if (date.seconds) return new Date(date.seconds * 1000);
            return new Date(date);
        };

        setDate(safeDate(quote.date).toISOString().split('T')[0]);
        setExpiryDate(safeDate(quote.expiryDate).toISOString().split('T')[0]);
        setDiscountValue(quote.discountValue || 0);
        setDiscountType(quote.discountType || 'percent');
        setIsAddModalOpen(true);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setClientId("");
        setItems([{ id: '1', description: '', longDescription: '', quantity: 1, price: 0 }]);
        setDate(new Date().toISOString().split('T')[0]);
        setExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setDiscountValue(0);
        setDiscountType('percent');
    };

    const handleConvertToInvoice = (quote: Quote) => {
        navigate('/invoices', { state: { fromQuote: quote } });
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) {
            toast.error("Please select a client");
            return;
        }

        const client = contacts.find(c => c.id === clientId);
        if (!client) return;

        setSubmitting(true);
        try {

            const quoteData = {
                clientId: client.id,
                clientName: client.name,
                clientEmail: client.email || "",
                items: items,
                total: calculateTotal(),
                status: 'draft' as const,
                date: new Date(date),
                expiryDate: new Date(expiryDate),
                discountValue: discountValue,
                discountType: discountType
            };

            if (editingId) {
                const updates = { ...quoteData } as any;

                // Always update/attach current user profile if available
                if (userProfile) {
                    updates.createdBy = {
                        uid: userProfile.uid,
                        name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Internal User',
                        position: userProfile.position || '',
                        email: userProfile.email || '',
                        signatureUrl: userProfile.signatureUrl || ''
                    };
                }

                await InvoiceService.updateQuote(editingId, updates);
                toast.success("Quote updated successfully");
            } else {
                await InvoiceService.addQuote(quoteData, userProfile);
                toast.success("Quote created successfully");
            }

            closeModal();
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(editingId ? "Failed to update quote" : "Failed to create quote");
        } finally {
            setSubmitting(false);
        }
    };

    const sortedQuotes = sortData(quotes, sortConfig);

    const handleSortChange = (option: SortOption) => {
        const newConfig = { field: option.field, direction: option.direction };
        setSortConfig(newConfig);
        localStorage.setItem('quotes_sort', JSON.stringify(newConfig));
    };

    const getStatusColor = (status: Quote['status']) => {
        switch (status) {
            case 'accepted': return 'text-emerald-500';
            case 'rejected': return 'text-red-500';
            case 'sent': return 'text-blue-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
                    <p className="text-muted-foreground">Manage sales proposals</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Quote
                </Button>
            </div>

            <div className="flex justify-end">
                <SortControl
                    options={sortOptions}
                    onSortChange={handleSortChange}
                    defaultValue={sortOptions.find(o => o.field === sortConfig.field && o.direction === sortConfig.direction)?.value}
                />
            </div>

            {loading ? (
                <div className="text-center py-10">Loading quotes...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sortedQuotes.map((quote) => (
                        <Card key={quote.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    #{quote.number || quote.id.substring(0, 8).toUpperCase()}
                                </CardTitle>
                                <FileText className={cn("h-4 w-4", getStatusColor(quote.status))} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">${quote.total.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">
                                    For {quote.clientName}
                                </p>
                                <div className="mt-4 flex justify-between items-center">
                                    <span className={cn("text-xs px-2 py-1 rounded-full border capitalize", getStatusColor(quote.status), "border-current bg-transparent")}>
                                        {quote.status}
                                    </span>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditModal(quote)} title="Edit Quote">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleConvertToInvoice(quote)} title="Convert to Invoice">
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={async () => {
                                            try {
                                                const [companySettings, financeSettings] = await Promise.all([
                                                    SettingsService.getCompanySettings(),
                                                    SettingsService.getFinanceSettings()
                                                ]);
                                                await generateQuotePDF(quote, companySettings, financeSettings, userProfile || undefined);
                                                toast.success("PDF generated successfully");
                                            } catch (error) {
                                                console.error("Error generating PDF:", error);
                                                toast.error("Failed to generate PDF");
                                            }
                                        }}>
                                            <Download className="h-4 w-4 mr-1" /> PDF
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {!loading && quotes.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No quotes found.
                        </div>
                    )}
                </div>
            )}

            <EnterpriseModal
                isOpen={isAddModalOpen}
                onClose={closeModal}
                title={editingId ? "Edit Quote" : "Create New Quote"}
                description={editingId ? `Update details for Quote #${quotes.find(q => q.id === editingId)?.number || editingId?.substring(0, 8).toUpperCase()}` : "Draft a professional proposal for your client."}
                footer={
                    <>
                        <Button variant="outline" onClick={closeModal} type="button">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting} type="submit" form="quote-form">
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingId ? "Update Quote" : "Create Quote"}
                        </Button>
                    </>
                }
            >
                <form id="quote-form" onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Client & Dates */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>Client & Dates</span>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2 lg:col-span-1">
                                <Label htmlFor="client" className="text-base">Client</Label>
                                <select
                                    id="client"
                                    title="Select Client"
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    required
                                >
                                    <option value="">Select a client...</option>
                                    {contacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.company || 'No Company'})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-11" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expiryDate">Valid Until</Label>
                                    <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required className="h-11" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Line Items */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>Line Items</span>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                        </h3>
                        <LineItemsTable items={items} onItemsChange={setItems} />
                    </div>

                    {/* Section 3: Discount & Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end pt-4">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span>Discount</span>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                            </h3>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="discountValue">Value</Label>
                                    <Input
                                        id="discountValue"
                                        type="number"
                                        step="0.01"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                        className="h-11"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="discountType">Type</Label>
                                    <select
                                        id="discountType"
                                        title="Discount Type"
                                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                                    >
                                        <option value="percent">Percent (%)</option>
                                        <option value="amount">Amount ($)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <TotalsSummary
                                subtotal={calculateSubtotal()}
                                discount={calculateDiscountAmount(calculateSubtotal())}
                            />
                        </div>
                    </div>
                </form>
            </EnterpriseModal>
        </div>
    );
}
