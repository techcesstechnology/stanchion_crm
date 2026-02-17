import { useState, useEffect } from "react";
import { CatalogService } from "@/services/catalogService";
import { CatalogItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

export default function CatalogSettings() {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: 0,
        stock: 0,
        category: "",
        unit: ""
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await CatalogService.getItems();
            setItems(data);
        } catch (error) {
            console.error("Error loading catalog items:", error);
            toast.error("Failed to load items");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAddNew = () => {
        setEditingItem(null);
        setFormData({ name: "", description: "", price: 0, stock: 0, category: "", unit: "" });
        setIsModalOpen(true);
    };

    const handleEdit = (item: CatalogItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description || "",
            price: item.price,
            stock: item.stock || 0,
            category: item.category || "",
            unit: item.unit || ""
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            await CatalogService.deleteItem(id);
            setItems(items.filter(item => item.id !== id));
            toast.success("Item deleted successfully");
        } catch (error) {
            console.error("Error deleting item:", error);
            toast.error("Failed to delete item");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingItem) {
                await CatalogService.updateItem(editingItem.id, {
                    name: formData.name,
                    description: formData.description,
                    price: Number(formData.price),
                    stock: Number(formData.stock),
                    category: formData.category,
                    unit: formData.unit
                });
                toast.success("Item updated successfully");
            } else {
                await CatalogService.addItem({
                    name: formData.name,
                    description: formData.description,
                    price: Number(formData.price),
                    stock: Number(formData.stock),
                    category: formData.category,
                    unit: formData.unit
                });
                toast.success("Item added successfully");
            }
            setIsModalOpen(false);
            loadItems();
        } catch (error) {
            console.error("Error saving item:", error);
            toast.error("Failed to save item");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Items Catalog
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage products and services for quick invoicing
                        </p>
                    </div>
                    <Button onClick={handleAddNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Item
                    </Button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search items..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No items found. Click "Add New Item" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            <div>{item.name}</div>
                                            <div className="text-[10px] text-muted-foreground">{item.description}</div>
                                        </TableCell>
                                        <TableCell>{item.category || "N/A"}</TableCell>
                                        <TableCell className="text-right">
                                            ${item.price.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.stock} {item.unit}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(item)}
                                                >
                                                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? "Edit Item" : "Add New Item"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Item Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Website Design"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Item details..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input
                                id="category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="e.g. Services"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Input
                                id="unit"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="e.g. hour, pcs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Unit Price *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="pl-7"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock">Initial Stock *</Label>
                            <Input
                                id="stock"
                                type="number"
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Item
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
