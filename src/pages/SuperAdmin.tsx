import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserService } from '@/services/userService';
import { UserProfile } from '@/types';
import { UserPlus, Users, Trash2, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

const SuperAdmin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('USER');
    const [position, setPosition] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [fetchingUsers, setFetchingUsers] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setFetchingUsers(true);
        try {
            const data = await UserService.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setFetchingUsers(false);
        }
    };

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
                firstName,
                lastName,
                position,
                phoneNumber,
            });

            console.log('User creation result:', result.data);
            toast.success(`User ${email} created successfully as ${role}`);

            // Reset form
            setEmail('');
            setPassword('');
            setFirstName('');
            setLastName('');
            setRole('USER');
            setPosition('');
            setPhoneNumber('');

            // Refresh list
            fetchUsers();

        } catch (error) {
            console.error('Error creating user:', error);
            const message = (error as any).message || 'Failed to create user';
            toast.error(`Error: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSuspension = async (userId: string, currentStatus: boolean) => {
        const action = currentStatus ? 'suspend' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const toggleUserSuspension = httpsCallable(functions, 'toggleUserSuspension');
            await toggleUserSuspension({ uid: userId, disabled: currentStatus });
            toast.success(`User ${action}ed successfully`);
            fetchUsers();
        } catch (error) {
            console.error('Error toggling suspension:', error);
            toast.error((error as any).message || `Failed to ${action} user`);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!window.confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE ${userEmail}? This cannot be undone.`)) return;

        try {
            const deleteUser = httpsCallable(functions, 'deleteUser');
            await deleteUser({ uid: userId });
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error((error as any).message || 'Failed to delete user');
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Super Admin Console</h1>
                <Badge variant="outline" className="text-xs uppercase tracking-wider">System Management</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create User Form */}
                <Card className="lg:col-span-1 shadow-md border-t-4 border-t-[#76b900]">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-[#76b900]" />
                            Create New System User
                        </CardTitle>
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
                                        className="h-9"
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
                                        className="h-9"
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
                                    className="h-9"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Phone Number</Label>
                                    <Input
                                        id="phoneNumber"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="+263..."
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="position">Job Position</Label>
                                    <Input
                                        id="position"
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                        placeholder="Project Manager"
                                        className="h-9"
                                    />
                                </div>
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
                                    className="h-9"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger className="h-9">
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

                            <Button type="submit" className="w-full bg-[#76b900] hover:bg-[#67a300] mt-4" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : 'Create User'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* User List Table */}
                <Card className="lg:col-span-2 shadow-md border-t-4 border-t-blue-500">
                    <CardHeader className="pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Manage System Users
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={fetchUsers} disabled={fetchingUsers}>
                            {fetchingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead>User & Position</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fetchingUsers ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <div className="flex items-center justify-center gap-2 text-gray-500">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Loading users...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : users.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                                                No users found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.map((user) => (
                                            <TableRow key={user.uid} className="hover:bg-gray-50 transition-colors">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-blue-700">{user.displayName}</span>
                                                        <span className="text-xs font-semibold text-gray-600">{user.position || 'No Position Set'}</span>
                                                        <span className="text-xs text-gray-500">{user.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-normal text-[10px] uppercase">
                                                        {user.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={user.active !== false ? 'secondary' : 'destructive'}
                                                        className={cn(
                                                            "font-normal text-[10px] uppercase",
                                                            user.active !== false && "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        )}
                                                    >
                                                        {user.active !== false ? 'Active' : 'Suspended'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                            title={user.active !== false ? 'Suspend User' : 'Activate User'}
                                                            onClick={() => handleToggleSuspension(user.uid, user.active !== false)}
                                                        >
                                                            {user.active !== false ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            title="Delete User"
                                                            onClick={() => handleDeleteUser(user.uid, user.email)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SuperAdmin;
