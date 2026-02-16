import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ContactService } from "@/services/contactService";
import { InvoiceService } from "@/services/invoiceService";
import { SettingsService } from "@/services/settingsService";
import { Contact } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Plus, Search, MapPin, Phone, Mail, Loader2, Building2, FileText } from "lucide-react";
import { toast } from "sonner";
import { generateStatementPDF } from "@/utils/pdfGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { UserProfile, FinanceSettings } from "@/types";

export default function ContactList() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [financeSettings, setFinanceSettings] = useState<FinanceSettings | undefined>(undefined);
    const { user } = useAuth();

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: ""
    });

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const data = await ContactService.getContacts();
            setContacts(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch contacts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
        if (user) {
            UserService.getUserProfile(user.uid).then(setUserProfile);
            SettingsService.getFinanceSettings().then(setFinanceSettings);
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error("Name is required");
            return;
        }

        setSubmitting(true);
        try {
            await ContactService.addContact({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                company: formData.company,
                address: formData.address,
                status: 'active'
            });
            toast.success("Contact created successfully");
            setIsAddModalOpen(false);
            setFormData({ name: "", email: "", phone: "", company: "", address: "" });
            fetchContacts();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create contact");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateStatement = async (contact: Contact) => {
        try {
            toast.info("Generating statement...");

            // Fetch all invoices for this contact
            const allInvoices = await InvoiceService.getInvoices();
            const clientInvoices = allInvoices.filter(inv => inv.clientId === contact.id);

            if (clientInvoices.length === 0) {
                toast.warning("No invoices found for this client");
                return;
            }

            // Fetch company and finance settings
            const companySettings = await SettingsService.getCompanySettings();

            // Generate the statement
            await generateStatementPDF(contact, clientInvoices, financeSettings, userProfile || undefined, companySettings);
            toast.success("Statement generated successfully");
        } catch (error) {
            console.error("Error generating statement:", error);
            toast.error("Failed to generate statement");
        }
    };

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                    <p className="text-muted-foreground">Manage your customer database</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Contact
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search contacts..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading contacts...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredContacts.map((contact) => (
                        <Card key={contact.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {contact.name.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <Link to={`/contacts/${contact.id}`} className="hover:underline">
                                        <CardTitle className="text-base truncate">{contact.name}</CardTitle>
                                    </Link>
                                    {contact.company && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                                            <Building2 className="h-3 w-3 inline mr-1" />{contact.company}
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span className="truncate">{contact.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span>{contact.phone}</span>
                                </div>
                                {contact.address && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span className="truncate">{contact.address}</span>
                                    </div>
                                )}
                                <div className="mt-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleGenerateStatement(contact)}
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Generate Statement
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {!loading && filteredContacts.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No contacts found.
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New Contact"
                description="Enter the details of the new contact."
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company">Company</Label>
                            <Input id="company" name="company" value={formData.company} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" name="address" value={formData.address} onChange={handleInputChange} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Contact
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
