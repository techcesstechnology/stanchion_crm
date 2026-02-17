import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceService } from "@/services/invoiceService";
import { ContactService } from "@/services/contactService";
import { SettingsService } from "@/services/settingsService";
import { UserService } from "@/services/userService";
import { FinanceService } from "@/services/financeService";
import { Invoice, Contact, InvoiceItem, Payment, UserProfile } from "@/types";
import { AccountBalance } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnterpriseModal } from "@/components/ui/EnterpriseModal";
import { LineItemsTable } from "@/components/shared/LineItemsTable";
import { TotalsSummary } from "@/components/shared/TotalsSummary";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { Plus, Download, FileText, Loader2, Pencil, Coins } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useLocation } from "react-router-dom";
import { SortControl, SortOption } from "@/components/shared/SortControl";
import { sortData, SortConfig } from "@/utils/sorting";

export default function Invoices() {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [accounts, setAccounts] = useState<AccountBalance[]>([]);
    const [loading, setLoading] = useState(true);


    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const location = useLocation();

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [clientId, setClientId] = useState("");
    const [items, setItems] = useState<InvoiceItem[]>([{ id: '1', description: '', longDescription: '', quantity: 1, price: 0 }]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');

    // Payment Form State
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNotes, setPaymentNotes] = useState("");
    const [destinationAccountId, setDestinationAccountId] = useState("");
    const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
        const saved = localStorage.getItem('invoices_sort');
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


    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [invoicesData, contactsData, accountsData, profileData] = await Promise.all([
                InvoiceService.getInvoices(),
                ContactService.getContacts(),
                FinanceService.getAccounts(),
                user ? UserService.getUserProfile(user.uid) : Promise.resolve(null)
            ]);

            setInvoices(invoicesData);
            setContacts(contactsData);
            setAccounts(accountsData);
            if (profileData) {
                setUserProfile(profileData);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle incoming quote conversion or edit request
    useEffect(() => {
        if (location.state?.fromQuote) {
            const quote = location.state.fromQuote;
            setClientId(quote.clientId);
            setItems(quote.items.map((item: InvoiceItem) => ({ ...item, id: Date.now().toString() + Math.random() }))); // Regen IDs
            setIsAddModalOpen(true);
            // Clear state so it doesn't reopen on refresh
            window.history.replaceState({}, document.title);
            toast.info("Creating invoice from quote details");
        } else if (location.state?.editId && invoices.length > 0) {
            // Handle Edit Request from Client Profile
            const invoiceToEdit = invoices.find(i => i.id === location.state.editId);
            if (invoiceToEdit) {
                openEditModal(invoiceToEdit);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, invoices]);

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

    const openEditModal = (invoice: Invoice) => {
        setEditingId(invoice.id);
        setClientId(invoice.clientId);
        setItems(invoice.items);

        const safeDate = (date: any) => {
            if (!date) return new Date();
            if (typeof date === 'object' && 'seconds' in date) return new Date(date.seconds * 1000);
            return new Date(date);
        };

        setDate(safeDate(invoice.date).toISOString().split('T')[0]);
        setDueDate(safeDate(invoice.dueDate).toISOString().split('T')[0]);
        setDiscountValue(invoice.discountValue || 0);
        setDiscountType(invoice.discountType || 'percent');
        setIsAddModalOpen(true);
    };

    const openPaymentModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setPaymentAmount(getRemainingBalance(invoice));
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentNotes("");
        setDestinationAccountId("");
        setIsPaymentModalOpen(true);
    };

    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setSelectedInvoice(null);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setClientId("");
        setItems([{ id: '1', description: '', longDescription: '', quantity: 1, price: 0 }]);
        setDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setDiscountValue(0);
        setDiscountType('percent');
    };

    const getRemainingBalance = (invoice: Invoice) => {
        const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        return invoice.total - totalPaid;
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        setSubmitting(true);
        try {
            // Find account to get its type for the method
            const selectedAccount = accounts.find(a => a.id === destinationAccountId);
            const method: Payment['method'] = selectedAccount?.type === 'cash' ? 'cash' : 'transfer';

            const newPayment: Payment = {
                id: Date.now().toString(),
                amount: paymentAmount,
                date: new Date(paymentDate),
                method: method,
                notes: paymentNotes,
                destinationAccountId: destinationAccountId
            };

            const currentPayments = selectedInvoice.payments || [];
            const updatedPayments = [...currentPayments, newPayment];

            const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
            let newStatus: Invoice['status'] = selectedInvoice.status;

            if (totalPaid >= selectedInvoice.total - 0.01) { // Tolerance for float
                newStatus = 'paid';
            } else if (totalPaid > 0) {
                newStatus = 'partial';
            }

            await InvoiceService.updateInvoice(selectedInvoice.id, {
                payments: updatedPayments,
                status: newStatus
            });

            // Also record in the separate payments collection for synchronization
            await InvoiceService.addPayment({
                amount: paymentAmount,
                date: new Date(paymentDate),
                method: selectedAccount?.type === 'cash' ? 'cash' : 'transfer',
                notes: paymentNotes,
                invoiceId: selectedInvoice.id,
                invoiceNumber: selectedInvoice.number,
                clientName: selectedInvoice.clientName,
                clientId: selectedInvoice.clientId,
                destinationAccountId: destinationAccountId,
                recordedBy: userProfile ? {
                    uid: userProfile.uid,
                    name: userProfile.displayName,
                    email: userProfile.email
                } : null
            });

            toast.success("Payment recorded successfully");
            closePaymentModal();
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to record payment");
        } finally {
            setSubmitting(false);
        }
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

            const invoiceData = {
                clientId: client.id,
                clientName: client.name,
                clientEmail: client.email || "",
                items: items,
                total: calculateTotal(),
                status: 'sent' as const,
                date: new Date(date),
                dueDate: new Date(dueDate),
                discountValue: discountValue,
                discountType: discountType
            };

            if (editingId) {
                const updates: Partial<Invoice> = { ...invoiceData };

                // Always update/attach current user profile if available
                if (userProfile) {
                    updates.createdBy = {
                        uid: userProfile.uid,
                        name: userProfile.displayName || `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Internal User',
                        position: userProfile.position || '',
                        email: userProfile.email || '',
                        signatureUrl: userProfile.signatureUrl || ''
                    };
                }

                await InvoiceService.updateInvoice(editingId, updates);
                toast.success("Invoice updated successfully");
            } else {
                await InvoiceService.addInvoice(invoiceData, userProfile);
                toast.success("Invoice created successfully");
            }

            closeModal();
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(editingId ? "Failed to update invoice" : "Failed to create invoice");
        } finally {
            setSubmitting(false);
        }
    };

    const sortedInvoices = sortData(invoices, sortConfig);

    const handleSortChange = (option: SortOption) => {
        const newConfig = { field: option.field, direction: option.direction };
        setSortConfig(newConfig);
        localStorage.setItem('invoices_sort', JSON.stringify(newConfig));
    };

    const getStatusColor = (status: Invoice['status']) => {
        switch (status) {
            case 'paid': return 'text-emerald-500';
            case 'overdue': return 'text-red-500';
            case 'sent': return 'text-blue-500';
            case 'partial': return 'text-amber-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                    <p className="text-muted-foreground">Create and manage invoices</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Create Invoice
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
                <div className="text-center py-10">Loading invoices...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sortedInvoices.map((invoice) => {
                        const balance = getRemainingBalance(invoice);
                        return (
                            <Card key={invoice.id} className="hover:shadow-md transition-shadow group relative">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        #{invoice.number || invoice.id.substring(0, 8).toUpperCase()}
                                    </CardTitle>
                                    <FileText className={cn("h-4 w-4", getStatusColor(invoice.status))} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">${invoice.total.toLocaleString()}</div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <span>Billed to {invoice.clientName}</span>
                                        {invoice.status !== 'paid' && balance > 0 && (
                                            <span className="text-amber-600 font-medium">Due: ${balance.toLocaleString()}</span>
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-between items-center">
                                        <span className={cn("text-xs px-2 py-1 rounded-full border capitalize", getStatusColor(invoice.status), "border-current bg-transparent")}>
                                            {invoice.status}
                                        </span>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditModal(invoice)} title="Edit Invoice">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openPaymentModal(invoice)} title="Record Payment">
                                                <Coins className="h-4 w-4 text-emerald-600" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={async () => {
                                                try {
                                                    const [companySettings, financeSettings] = await Promise.all([
                                                        SettingsService.getCompanySettings(),
                                                        SettingsService.getFinanceSettings()
                                                    ]);
                                                    await generateInvoicePDF(invoice, companySettings, financeSettings, userProfile || undefined);
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
                        );
                    })}
                    {!loading && invoices.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No invoices found. Create one to get started.
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            <EnterpriseModal
                isOpen={isAddModalOpen}
                onClose={closeModal}
                title={editingId ? "Edit Invoice" : "Create New Invoice"}
                description={editingId ? `Update details for Invoice #${invoices.find(i => i.id === editingId)?.number || editingId?.substring(0, 8).toUpperCase()}` : "Create a professional invoice for your client."}
                footer={
                    <>
                        <Button variant="outline" onClick={closeModal} type="button">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting} type="submit" form="invoice-form">
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingId ? "Update Invoice" : "Create Invoice"}
                        </Button>
                    </>
                }
            >
                <form id="invoice-form" onSubmit={handleSubmit} className="space-y-8">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-11" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dueDate">Due Date</Label>
                                    <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="h-11" />
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
                        {/* Line Items Table Component */}
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
                                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        title="Discount Type"
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

            {/* Payment Modal */}
            <EnterpriseModal
                isOpen={isPaymentModalOpen}
                onClose={closePaymentModal}
                title="Record Payment"
                description={`Record a payment for Invoice #${selectedInvoice?.number || selectedInvoice?.id.substring(0, 8).toUpperCase()}`}
                footer={
                    <>
                        <Button variant="outline" onClick={closePaymentModal} type="button">Cancel</Button>
                        <Button onClick={handlePaymentSubmit} disabled={submitting} type="submit" form="payment-form">
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Payment
                        </Button>
                    </>
                }
            >
                <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-6">
                    <div>
                        <div className="text-sm text-muted-foreground mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="flex justify-between mb-1">
                                <span>Total Amount:</span>
                                <span className="font-medium text-foreground">${selectedInvoice?.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Balance Due:</span>
                                <span className="font-medium text-destructive">${selectedInvoice ? getRemainingBalance(selectedInvoice).toFixed(2) : '0.00'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                max={selectedInvoice ? getRemainingBalance(selectedInvoice) : 0}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentDate">Date *</Label>
                            <Input
                                id="paymentDate"
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="destinationAccount">Destination Account *</Label>
                        <select
                            id="destinationAccount"
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Destination Account"
                            value={destinationAccountId}
                            onChange={(e) => setDestinationAccountId(e.target.value)}
                            required
                        >
                            <option value="">Select an account...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Input
                            id="notes"
                            placeholder="Transaction ID, Reference, etc."
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            className="h-11"
                        />
                    </div>
                </form>
            </EnterpriseModal>
        </div>
    );
}
