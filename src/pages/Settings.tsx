import { useState, useEffect, ChangeEvent } from "react";
import { toast } from "sonner";
import { SettingsService } from "@/services/settingsService";
import { CompanySettings, FinanceSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Building2, DollarSign, Upload, Loader2, User } from "lucide-react";
import UserProfileSettings from "@/components/settings/UserProfileSettings";

export default function Settings() {
    const [activeTab, setActiveTab] = useState<'company' | 'finance' | 'profile'>('company');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>("");
    const [sealFile, setSealFile] = useState<File | null>(null);
    const [sealPreview, setSealPreview] = useState<string>("");

    const [companySettings, setCompanySettings] = useState<CompanySettings>({
        id: 'company-config',
        companyName: '',
        address: '',
        email: '',
        phone: '',
        secondaryPhone: '',
        logoUrl: '',
        updatedAt: new Date(),
        defaultSignatoryName: '',
        defaultSignatoryPosition: '',
        officialSealUrl: '',
    });

    const [financeSettings, setFinanceSettings] = useState<FinanceSettings>({
        id: 'finance-config',
        bankName: '',
        accountName: '',
        accountNumber: '',
        branchCode: '',
        swiftCode: '',
        termsAndConditions: '',
        paymentTerms: '',
        updatedAt: new Date(),
        bankName2: '',
        accountName2: '',
        accountNumber2: '',
        branchCode2: '',
        swiftCode2: '',
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const [company, finance] = await Promise.all([
                SettingsService.getCompanySettings(),
                SettingsService.getFinanceSettings(),
            ]);
            setCompanySettings(company);
            setFinanceSettings(finance);
            if (company.logoUrl) {
                setLogoPreview(company.logoUrl);
            }
            if (company.officialSealUrl) {
                setSealPreview(company.officialSealUrl);
            }
        } catch (error) {
            console.error("Error loading settings:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error("Please select an image file");
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSealChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error("Please select an image file");
                return;
            }
            setSealFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setSealPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCompany = async () => {
        setSaving(true);
        try {
            let logoUrl = companySettings.logoUrl;
            let officialSealUrl = companySettings.officialSealUrl;

            // Upload logo if a new one was selected
            if (logoFile) {
                logoUrl = await SettingsService.uploadLogo(logoFile);
            }

            // Upload seal if a new one was selected
            if (sealFile) {
                officialSealUrl = await SettingsService.uploadSeal(sealFile);
            }

            await SettingsService.updateCompanySettings({
                ...companySettings,
                logoUrl,
                officialSealUrl,
            });

            toast.success("Company settings saved successfully");
            setLogoFile(null);
            setSealFile(null);
            await loadSettings();
        } catch (error) {
            console.error("Error saving company settings:", error);
            toast.error("Failed to save company settings");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFinance = async () => {
        setSaving(true);
        try {
            await SettingsService.updateFinanceSettings(financeSettings);
            toast.success("Finance settings saved successfully");
            await loadSettings();
        } catch (error) {
            console.error("Error saving finance settings:", error);
            toast.error("Failed to save finance settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your company information and finance details
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab('company')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'company'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Building2 className="h-4 w-4" />
                    Company Details
                </button>
                <button
                    onClick={() => setActiveTab('finance')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'finance'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <DollarSign className="h-4 w-4" />
                    Finance Details
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'profile'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <User className="h-4 w-4" />
                    My Profile
                </button>
            </div>

            {/* User Profile Tab */}
            {activeTab === 'profile' && (
                <UserProfileSettings />
            )}

            {/* Company Settings Tab */}
            {activeTab === 'company' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Company Information</h2>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="companyName">Company Name *</Label>
                                <Input
                                    id="companyName"
                                    value={companySettings.companyName}
                                    onChange={(e) =>
                                        setCompanySettings({ ...companySettings, companyName: e.target.value })
                                    }
                                    placeholder="Enter company name"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="address">Address *</Label>
                                <Textarea
                                    id="address"
                                    value={companySettings.address}
                                    onChange={(e) =>
                                        setCompanySettings({ ...companySettings, address: e.target.value })
                                    }
                                    placeholder="Enter company address"
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={companySettings.email}
                                    onChange={(e) =>
                                        setCompanySettings({ ...companySettings, email: e.target.value })
                                    }
                                    placeholder="company@example.com"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={companySettings.phone}
                                    onChange={(e) =>
                                        setCompanySettings({ ...companySettings, phone: e.target.value })
                                    }
                                    placeholder="+263 123 456 789"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="secondaryPhone">Secondary Phone (Optional)</Label>
                                <Input
                                    id="secondaryPhone"
                                    type="tel"
                                    value={companySettings.secondaryPhone || ''}
                                    onChange={(e) =>
                                        setCompanySettings({ ...companySettings, secondaryPhone: e.target.value })
                                    }
                                    placeholder="+263 987 654 321"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 border-t pt-4 mt-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="defaultSignatoryName">Default Signatory Name</Label>
                                    <Input
                                        id="defaultSignatoryName"
                                        value={companySettings.defaultSignatoryName || ''}
                                        onChange={(e) =>
                                            setCompanySettings({ ...companySettings, defaultSignatoryName: e.target.value })
                                        }
                                        placeholder="e.g. John Doe"
                                    />
                                    <p className="text-xs text-muted-foreground">Used if invoice creator is not specified</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="defaultSignatoryPosition">Default Signatory Position</Label>
                                    <Input
                                        id="defaultSignatoryPosition"
                                        value={companySettings.defaultSignatoryPosition || ''}
                                        onChange={(e) =>
                                            setCompanySettings({ ...companySettings, defaultSignatoryPosition: e.target.value })
                                        }
                                        placeholder="e.g. Director"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Company Logo</h2>
                        <div className="space-y-4">
                            {logoPreview && (
                                <div className="flex justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <img
                                        src={logoPreview}
                                        alt="Company Logo"
                                        className="max-h-32 object-contain"
                                    />
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="logo">Upload New Logo</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="logo"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="cursor-pointer"
                                    />
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Accepted formats: PNG, JPG, SVG (Max 5MB)
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Official Company Seal</h2>
                        <div className="space-y-4">
                            {sealPreview && (
                                <div className="flex justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <img
                                        src={sealPreview}
                                        alt="Company Seal"
                                        className="max-h-32 object-contain"
                                    />
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="seal">Upload New Seal</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="seal"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleSealChange}
                                        className="cursor-pointer"
                                    />
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Accepted formats: PNG, JPG, SVG (Max 5MB) - Transparent background recommended
                                </p>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveCompany} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Company Settings'
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Finance Settings Tab */}
            {activeTab === 'finance' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Banking Details</h2>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="bankName">Bank Name *</Label>
                                <Input
                                    id="bankName"
                                    value={financeSettings.bankName}
                                    onChange={(e) =>
                                        setFinanceSettings({ ...financeSettings, bankName: e.target.value })
                                    }
                                    placeholder="Enter bank name"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="accountName">Account Name *</Label>
                                <Input
                                    id="accountName"
                                    value={financeSettings.accountName}
                                    onChange={(e) =>
                                        setFinanceSettings({ ...financeSettings, accountName: e.target.value })
                                    }
                                    placeholder="Enter account holder name"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="accountNumber">Account No (USD) *</Label>
                                    <Input
                                        id="accountNumber"
                                        value={financeSettings.accountNumber}
                                        onChange={(e) =>
                                            setFinanceSettings({ ...financeSettings, accountNumber: e.target.value })
                                        }
                                        placeholder="Enter USD account number"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="accountNumberZwg">Account No (ZWG)</Label>
                                    <Input
                                        id="accountNumberZwg"
                                        value={financeSettings.accountNumberZwg || ''}
                                        onChange={(e) =>
                                            setFinanceSettings({ ...financeSettings, accountNumberZwg: e.target.value })
                                        }
                                        placeholder="Enter ZWG account number"
                                    />
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="branchCode">Branch Code</Label>
                                    <Input
                                        id="branchCode"
                                        value={financeSettings.branchCode || ''}
                                        onChange={(e) =>
                                            setFinanceSettings({ ...financeSettings, branchCode: e.target.value })
                                        }
                                        placeholder="Branch code"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="swiftCode">SWIFT Code</Label>
                                    <Input
                                        id="swiftCode"
                                        value={financeSettings.swiftCode || ''}
                                        onChange={(e) =>
                                            setFinanceSettings({ ...financeSettings, swiftCode: e.target.value })
                                        }
                                        placeholder="SWIFT/BIC code"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="text-lg font-medium mb-4">Secondary Banking Details (Optional)</h3>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="bankName2">Bank Name</Label>
                                    <Input
                                        id="bankName2"
                                        value={financeSettings.bankName2 || ''}
                                        onChange={(e) =>
                                            setFinanceSettings({ ...financeSettings, bankName2: e.target.value })
                                        }
                                        placeholder="Enter secondary bank name"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="accountName2">Account Name</Label>
                                    <Input
                                        id="accountName2"
                                        value={financeSettings.accountName2 || ''}
                                        onChange={(e) =>
                                            setFinanceSettings({ ...financeSettings, accountName2: e.target.value })
                                        }
                                        placeholder="Enter account holder name"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="accountNumber2">Account No</Label>
                                    <Input
                                        id="accountNumber2"
                                        value={financeSettings.accountNumber2 || ''}
                                        onChange={(e) =>
                                            setFinanceSettings({ ...financeSettings, accountNumber2: e.target.value })
                                        }
                                        placeholder="Enter account number"
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="branchCode2">Branch Code</Label>
                                        <Input
                                            id="branchCode2"
                                            value={financeSettings.branchCode2 || ''}
                                            onChange={(e) =>
                                                setFinanceSettings({ ...financeSettings, branchCode2: e.target.value })
                                            }
                                            placeholder="Branch code"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="swiftCode2">SWIFT Code</Label>
                                        <Input
                                            id="swiftCode2"
                                            value={financeSettings.swiftCode2 || ''}
                                            onChange={(e) =>
                                                setFinanceSettings({ ...financeSettings, swiftCode2: e.target.value })
                                            }
                                            placeholder="SWIFT/BIC code"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>



                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Payment Terms</h2>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="paymentTerms">Default Payment Terms</Label>
                                <Input
                                    id="paymentTerms"
                                    value={financeSettings.paymentTerms || ''}
                                    onChange={(e) =>
                                        setFinanceSettings({ ...financeSettings, paymentTerms: e.target.value })
                                    }
                                    placeholder="e.g., Net 30 days"
                                />
                                <p className="text-sm text-muted-foreground">
                                    This will be displayed on invoices and quotes
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="termsAndConditions">Terms and Conditions *</Label>
                                <Textarea
                                    id="termsAndConditions"
                                    value={financeSettings.termsAndConditions}
                                    onChange={(e) =>
                                        setFinanceSettings({ ...financeSettings, termsAndConditions: e.target.value })
                                    }
                                    placeholder="Enter your terms and conditions here..."
                                    rows={8}
                                />
                                <p className="text-sm text-muted-foreground">
                                    These terms will appear on invoices and quotes
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="otherInfo">Other Information (PDF Footer Section)</Label>
                                <Textarea
                                    id="otherInfo"
                                    value={financeSettings.otherInfo || ''}
                                    onChange={(e) =>
                                        setFinanceSettings({ ...financeSettings, otherInfo: e.target.value })
                                    }
                                    placeholder="Enter additional information or disclaimers for the PDF..."
                                    rows={8}
                                />
                                <p className="text-sm text-muted-foreground">
                                    This content will be displayed in the footer section of generated PDFs.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveFinance} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Finance Settings'
                            )}
                        </Button>
                    </div>
                </div>
            )}
            {/* Version Indicator */}
            <div className="text-center text-xs text-muted-foreground pt-10">
                Stanchion CRM v1.2.1 (Updated)
            </div>
        </div>
    );
}
