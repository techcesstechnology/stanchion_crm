import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";
import SignaturePad from "@/components/shared/SignaturePad";

export default function UserProfileSettings() {
    const { firebaseUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [signatureTab, setSignatureTab] = useState("draw");

    useEffect(() => {
        if (firebaseUser) {
            loadProfile();
        }
    }, [firebaseUser]);

    const loadProfile = async () => {
        if (!firebaseUser) return;
        setLoading(true);
        try {
            const data = await UserService.getUserProfile(firebaseUser.uid);
            if (data) {
                setProfile(data);
            } else {
                setProfile({
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName || "",
                    email: firebaseUser.email || "",
                    role: "USER",
                    active: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        } catch (error) {
            console.error("Error loading profile:", error);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!firebaseUser || !profile) return;
        setSaving(true);
        try {
            await UserService.updateUserProfile(firebaseUser.uid, profile);
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleSignatureSave = async (dataUrl: string) => {
        if (!firebaseUser) return;
        setSaving(true);
        try {
            const updatedProfile = { ...profile!, signatureUrl: dataUrl };
            setProfile(updatedProfile);
            await UserService.updateUserProfile(firebaseUser.uid, { signatureUrl: dataUrl });
            toast.success("Signature saved successfully");
        } catch (error) {
            console.error("Error saving signature:", error);
            toast.error("Failed to save signature");
        } finally {
            setSaving(false);
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && firebaseUser) {
            if (!file.type.startsWith('image/')) {
                toast.error("Please upload an image file");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                handleSignatureSave(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearSignature = async () => {
        if (!firebaseUser || !profile) return;
        if (confirm("Are you sure you want to remove your signature?")) {
            setSaving(true);
            try {
                const updatedProfile = { ...profile, signatureUrl: undefined };
                setProfile(updatedProfile);
                await UserService.updateUserProfile(firebaseUser.uid, { signatureUrl: undefined as any });
                toast.success("Signature removed");
            } catch (error) {
                console.error("Error clearing signature:", error);
                toast.error("Failed to remove signature");
            } finally {
                setSaving(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details used on documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Full Name</Label>
                        <Input
                            id="displayName"
                            value={profile.displayName}
                            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Role (Read Only)</Label>
                        <Input
                            id="role"
                            value={profile.role}
                            disabled
                            className="bg-slate-100 dark:bg-slate-800"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email (Read Only)</Label>
                        <Input
                            id="email"
                            value={profile.email}
                            disabled
                            className="bg-slate-100 dark:bg-slate-800"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Details
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Digital Signature</CardTitle>
                    <CardDescription>Manage your signature for official documents</CardDescription>
                </CardHeader>
                <CardContent>
                    {profile.signatureUrl ? (
                        <div className="space-y-4">
                            <div className="border p-4 rounded-lg bg-white flex justify-center">
                                <img
                                    src={profile.signatureUrl}
                                    alt="Your Signature"
                                    className="max-h-32 object-contain"
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button variant="destructive" onClick={handleClearSignature} disabled={saving}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove Signature
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Tabs value={signatureTab} onValueChange={setSignatureTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                            </TabsList>
                            <TabsContent value="draw" className="mt-4">
                                <SignaturePad onSave={handleSignatureSave} />
                            </TabsContent>
                            <TabsContent value="upload" className="mt-4">
                                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
                                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG (max 2MB)</p>
                                    </div>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="max-w-xs cursor-pointer"
                                        onChange={handleSignatureUpload}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
