import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const SuperAdmin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('USER');
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return false;
        }
        if (!email.includes('@')) {
            toast.error('Please enter a valid email address');
            return false;
        }
        return true;
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            const createAdminUser = httpsCallable(functions, 'createAdminUser');

            const result = await createAdminUser({
                email,
                password,
                role,
                displayName: `${firstName} ${lastName}`,
            });

            console.log('User creation result:', result.data);
            toast.success(`User ${email} created successfully as ${role}`);

            // Reset form
            setEmail('');
            setPassword('');
            setFirstName('');
            setLastName('');
            setRole('USER');

        } catch (error: any) {
            console.error('Error creating user:', error);
            const message = error.message || 'Failed to create user';
            toast.error(`Error: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Super Admin Console</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Create New System User</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="john.doe@willard.pro"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Temporary Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Administrator</SelectItem>
                                    <SelectItem value="ACCOUNTANT">Accountant / Finance</SelectItem>
                                    <SelectItem value="MANAGER">Manager / Projects</SelectItem>
                                    <SelectItem value="STORES_APPROVER">Stores / Inventory</SelectItem>
                                    <SelectItem value="USER">Standard User</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button type="submit" className="w-full bg-[#76b900] hover:bg-[#67a300]" disabled={loading}>
                            {loading ? 'Creating...' : 'Create User'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default SuperAdmin;
