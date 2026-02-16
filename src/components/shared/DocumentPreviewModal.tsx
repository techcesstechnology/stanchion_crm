import { useEffect, useState } from "react";
import { Invoice, Quote, CompanySettings, FinanceSettings } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateInvoicePDF, generateQuotePDF } from "@/utils/pdfGenerator";
import { SettingsService } from "@/services/settingsService";
import { Download, Printer, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { UserProfile } from "@/types";

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: Invoice | Quote | null;
    type: 'invoice' | 'quote';
}

export function DocumentPreviewModal({ isOpen, onClose, document, type }: DocumentPreviewModalProps) {
    const navigate = useNavigate();
    const [companySettings, setCompanySettings] = useState<CompanySettings | undefined>(undefined);
    const [financeSettings, setFinanceSettings] = useState<FinanceSettings | undefined>(undefined);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [generating, setGenerating] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            const fetchSettings = async () => {
                setLoadingSettings(true);
                try {
                    const promises: Promise<any>[] = [
                        SettingsService.getCompanySettings(),
                        SettingsService.getFinanceSettings()
                    ];

                    if (user) {
                        promises.push(UserService.getUserProfile(user.uid));
                    }

                    const [company, finance, profile] = await Promise.all(promises);
                    setCompanySettings(company);
                    setFinanceSettings(finance);
                    if (profile) setUserProfile(profile);
                } catch (error) {
                    console.error("Failed to load settings:", error);
                    toast.error("Failed to load PDF settings");
                } finally {
                    setLoadingSettings(false);
                }
            };
            fetchSettings();
        }
    }, [isOpen]);

    if (!document) return null;

    const formatDate = (date: { seconds: number; nanoseconds: number } | Date | null | undefined) => {
        if (!date) return 'N/A';
        if ('seconds' in date) {
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        return new Date(date).toLocaleDateString();
    };

    const handleDownload = async () => {
        setGenerating(true);
        try {
            if (type === 'invoice') {
                await generateInvoicePDF(document as Invoice, companySettings, financeSettings, userProfile || undefined);
            } else {
                await generateQuotePDF(document as Quote, companySettings, financeSettings, userProfile || undefined);
            }
            toast.success("PDF Downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF");
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = async () => {
        setGenerating(true);
        try {
            // Note: Currently generatePDF saves the file. 
            // Ideally we would want to open it in a new tab.
            // For now, we'll download it and let the user open it.
            // Future improvement: modify generator to return blob URL.
            await handleDownload();
        } finally {
            setGenerating(false);
        }
    };

    const isInvoice = type === 'invoice';
    const subtotal = document.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = document.total - subtotal;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${isInvoice ? 'Invoice' : 'Quote'} #${document.id.slice(0, 8).toUpperCase()}`}
            description={`View details for ${isInvoice ? 'invoice' : 'quote'}`}
            className="max-w-3xl"
        >
            <div className="space-y-6">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 bg-muted/30 p-4 rounded-lg">
                    <div>
                        <h3 className="font-semibold text-lg">{document.clientName}</h3>
                        {document.clientEmail && <p className="text-sm text-muted-foreground">{document.clientEmail}</p>}
                    </div>
                    <div className="text-left sm:text-right space-y-1 w-full sm:w-auto">
                        <div className="text-sm">
                            <span className="font-medium">Date: </span>
                            {formatDate(document.date || document.createdAt)}
                        </div>
                        {isInvoice && (document as Invoice).dueDate && (
                            <div className="text-sm">
                                <span className="font-medium">Due Date: </span>
                                {formatDate((document as Invoice).dueDate)}
                            </div>
                        )}
                        {!isInvoice && (document as Quote).expiryDate && (
                            <div className="text-sm">
                                <span className="font-medium">Expiry: </span>
                                {formatDate((document as Quote).expiryDate)}
                            </div>
                        )}
                        <div className="mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize border ${document.status === 'paid' || document.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' :
                                document.status === 'overdue' ? 'bg-red-100 text-red-800 border-red-200' :
                                    'bg-gray-100 text-gray-800 border-gray-200'
                                }`}>
                                {document.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                {/* Line Items */}
                <div className="border rounded-lg overflow-hidden">
                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="w-[15%] py-4 pl-6 text-slate-700 dark:text-slate-200">Installation Category (I.C)</TableHead>
                                    <TableHead className="w-[40%] py-4 text-slate-700 dark:text-slate-200">Installation Service Features (ISF) According to Dimensions/Specs.</TableHead>
                                    <TableHead className="text-center py-4 w-[10%] text-slate-700 dark:text-slate-200">Qty</TableHead>
                                    <TableHead className="text-right py-4 w-[15%] text-slate-700 dark:text-slate-200">Service Amount</TableHead>
                                    <TableHead className="text-right py-4 pr-6 w-[20%] text-slate-700 dark:text-slate-200">Gross Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {document.items.map((item, index) => (
                                    <TableRow key={index} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <TableCell className="pl-6 py-6 align-top font-medium text-slate-700 dark:text-slate-300">
                                            {item.category || '-'}
                                        </TableCell>
                                        <TableCell className="py-6 align-top">
                                            <div className="font-semibold text-base text-slate-900 dark:text-slate-100 mb-1">
                                                {item.description}
                                            </div>
                                            {item.longDescription && (
                                                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                    {item.longDescription}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center py-6 align-top font-medium tabular-nums text-slate-700 dark:text-slate-300">
                                            {item.quantity}
                                        </TableCell>
                                        <TableCell className="text-right py-6 align-top font-medium tabular-nums text-slate-700 dark:text-slate-300">
                                            ${item.price.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right pr-6 py-6 align-top font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                            ${(item.quantity * item.price).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-border">
                        {document.items.map((item, index) => (
                            <div key={index} className="p-4 space-y-3 bg-card">
                                <div className="space-y-1">
                                    {item.category && (
                                        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                                            {item.category}
                                        </div>
                                    )}
                                    <div className="font-semibold text-base">{item.description}</div>
                                    {item.longDescription && (
                                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.longDescription}</div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="text-muted-foreground">
                                        {item.quantity} x ${item.price.toFixed(2)}
                                    </div>
                                    <div className="font-bold tabular-nums">
                                        ${(item.quantity * item.price).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-1/2 md:w-1/3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {document.discountValue && document.discountValue > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Discount {document.discountType === 'percent' ? `(${document.discountValue}%)` : ''}
                                </span>
                                <span className="text-red-600">
                                    -${(document.discountType === 'percent'
                                        ? subtotal * (document.discountValue / 100)
                                        : document.discountValue
                                    ).toFixed(2)}
                                </span>
                            </div>
                        )}
                        {tax > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax</span>
                                <span>${tax.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                            <span>Total</span>
                            <span>${document.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button variant="outline" onClick={() => {
                        onClose();
                        if (isInvoice) {
                            navigate('/invoices', { state: { editId: document.id } });
                        } else {
                            navigate('/quotes', { state: { editId: document.id } });
                        }
                    }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <Button variant="outline" onClick={handlePrint} disabled={generating || loadingSettings}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button onClick={handleDownload} disabled={generating || loadingSettings}>
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download PDF
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
