import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ContactService } from "@/services/contactService";
import { InvoiceService } from "@/services/invoiceService";
import { Contact, Invoice, Quote } from "@/types";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, MapPin, Building2, Edit, FileText } from "lucide-react";
import { toast } from "sonner";
import { DocumentPreviewModal } from "@/components/shared/DocumentPreviewModal";
// import { cn } from "@/lib/cn"; // Removed unused import

export default function ContactDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [contact, setContact] = useState<Contact | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedDocument, setSelectedDocument] = useState<Invoice | Quote | null>(null);
    const [previewType, setPreviewType] = useState<'invoice' | 'quote'>('invoice');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                // Fetch Contact
                const contacts = await ContactService.getContacts();
                const found = contacts.find(c => c.id === id);

                if (found) {
                    setContact(found);

                    // Fetch Documents concurrently
                    const [fetchedInvoices, fetchedQuotes] = await Promise.all([
                        InvoiceService.getInvoicesByClient(id),
                        InvoiceService.getQuotesByClient(id)
                    ]);

                    setInvoices(fetchedInvoices);
                    setQuotes(fetchedQuotes);
                } else {
                    toast.error("Contact not found");
                    navigate("/contacts");
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load contact data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, navigate]);

    if (loading) return <div className="text-center py-10">Loading contact...</div>;
    if (!contact) return null;

    const formatDate = (date: { seconds: number; nanoseconds: number } | Date | null | undefined) => {
        if (!date) return 'N/A';
        // Handle Firestore Timestamp
        if ('seconds' in date) {
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        return new Date(date).toLocaleDateString();
    };

    const handleOpenPreview = (doc: Invoice | Quote, type: 'invoice' | 'quote') => {
        setSelectedDocument(doc);
        setPreviewType(type);
        setIsPreviewOpen(true);
    };

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate("/contacts")} className="pl-0 gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Contacts
            </Button>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Contact Info */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                                    {contact.name.charAt(0)}
                                </div>
                                <Button variant="outline" size="icon">
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardTitle className="mt-4 text-xl">{contact.name}</CardTitle>
                            {contact.company && (
                                <p className="text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3 w-3" /> {contact.company}
                                </p>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{contact.phone || 'No phone'}</span>
                            </div>
                            {contact.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <span>{contact.address}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Content with Tabs */}
                <div className="md:col-span-2">
                    <Tabs defaultValue="activity" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="activity">Activity</TabsTrigger>
                            <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
                            <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="activity">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Activity Timeline</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Timeline contactId={contact.id} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="quotes">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Quotes</CardTitle>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/quotes')}>
                                        Create New
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {quotes.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No quotes found for this client.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {quotes.map((quote) => (
                                                <div
                                                    key={quote.id}
                                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => handleOpenPreview(quote, 'quote')}
                                                >
                                                    <div>
                                                        <div className="font-medium">Quote #{quote.id.slice(0, 8).toUpperCase()}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {formatDate(quote.createdAt)} • ${quote.total.toFixed(2)}
                                                        </div>
                                                        <div className="mt-1">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                                quote.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                                    'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {quote.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" title="View details">
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="invoices">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Invoices</CardTitle>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/invoices')}>
                                        Create New
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {invoices.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No invoices found for this client.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {invoices.map((invoice) => (
                                                <div
                                                    key={invoice.id}
                                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => handleOpenPreview(invoice, 'invoice')}
                                                >
                                                    <div>
                                                        <div className="font-medium">Invoice #{invoice.id.slice(0, 8).toUpperCase()}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {formatDate(invoice.createdAt)} • ${invoice.total.toFixed(2)}
                                                        </div>
                                                        <div className="mt-1">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {invoice.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" title="View details">
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <DocumentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                document={selectedDocument}
                type={previewType}
            />
        </div>
    );
}
