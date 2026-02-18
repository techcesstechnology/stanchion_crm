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
        unit: "",
        purchasePrice: 0,
        freightAndDuty: 0,
        markupPercent: 0,
        twidMarkupPercent: 0
    });
    const [saving, setSaving] = useState(false);

    // Auto-calculate prices
    useEffect(() => {
        const purchasePrice = Number(formData.purchasePrice) || 0;
        const freightAndDuty = Number(formData.freightAndDuty) || 0;
        const markupPercent = Number(formData.markupPercent) || 0;

        const totalCost = purchasePrice + freightAndDuty;
        const sellingPrice = totalCost * (1 + markupPercent / 100);

        // Update the main price field which is used for backward compatibility and display
        if (formData.price !== sellingPrice) {
            setFormData(prev => ({ ...prev, price: sellingPrice }));
        }
    }, [formData.purchasePrice, formData.freightAndDuty, formData.markupPercent]);

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
        setFormData({
            name: "",
            description: "",
            price: 0,
            stock: 0,
            category: "",
            unit: "",
            purchasePrice: 0,
            freightAndDuty: 0,
            markupPercent: 0,
            twidMarkupPercent: 0
        });
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
            unit: item.unit || "",
            purchasePrice: item.pricing?.purchasePrice || 0,
            freightAndDuty: item.pricing?.freightAndDuty || 0,
            markupPercent: item.pricing?.markupPercent || 0,
            twidMarkupPercent: item.pricing?.twidMarkupPercent || 0
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

        const pricingData = {
            purchasePrice: Number(formData.purchasePrice),
            freightAndDuty: Number(formData.freightAndDuty),
            totalCost: Number(formData.purchasePrice) + Number(formData.freightAndDuty),
            markupPercent: Number(formData.markupPercent),
            sellingPrice: Number(formData.price),
            twidMarkupPercent: Number(formData.twidMarkupPercent)
        };

        const itemData = {
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            stock: Number(formData.stock),
            category: formData.category,
            unit: formData.unit,
            pricing: pricingData
        };

        try {
            if (editingItem) {
                await CatalogService.updateItem(editingItem.id, itemData);
                toast.success("Item updated successfully");
            } else {
                await CatalogService.addItem(itemData);
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
                className="max-w-4xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-1">
                            <Label htmlFor="name" className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Item Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Website Design"
                                required
                                className="h-9"
                            />
                        </div>
                        <div className="col-span-3 space-y-1">
                            <Label htmlFor="category" className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Category</Label>
                            <Input
                                id="category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Services"
                                className="h-9"
                            />
                        </div>
                        <div className="col-span-3 space-y-1">
                            <Label htmlFor="unit" className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Unit</Label>
                            <Input
                                id="unit"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="pcs, hour"
                                className="h-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="description" className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Item details..."
                            rows={1}
                            className="min-h-[40px] resize-none"
                        />
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Pricing & Stock</h3>

                        <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="purchasePrice" className="text-[9px] font-bold uppercase text-slate-500">Purchase Price *</Label>
                                <div className="relative">
                                    <span className="absolute left-2 top-2 text-muted-foreground text-xs">$</span>
                                    <Input
                                        id="purchasePrice"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="pl-5 h-8 text-xs font-bold"
                                        value={formData.purchasePrice}
                                        onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="freightAndDuty" className="text-[9px] font-bold uppercase text-slate-500">Freight & Duty</Label>
                                <div className="relative">
                                    <span className="absolute left-2 top-2 text-muted-foreground text-xs">$</span>
                                    <Input
                                        id="freightAndDuty"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="pl-5 h-8 text-xs font-medium text-slate-600"
                                        value={formData.freightAndDuty}
                                        onChange={(e) => setFormData({ ...formData, freightAndDuty: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="markupPercent" className="text-[9px] font-bold uppercase text-slate-500">Markup %</Label>
                                <Input
                                    id="markupPercent"
                                    type="number"
                                    min="0"
                                    className="h-8 text-xs font-bold text-green-600"
                                    value={formData.markupPercent}
                                    onChange={(e) => setFormData({ ...formData, markupPercent: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="twidMarkupPercent" className="text-[9px] font-bold uppercase text-slate-500">TWID Markup %</Label>
                                <Input
                                    id="twidMarkupPercent"
                                    type="number"
                                    min="0"
                                    className="h-8 text-xs font-medium text-slate-600"
                                    value={formData.twidMarkupPercent}
                                    onChange={(e) => setFormData({ ...formData, twidMarkupPercent: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-3 space-y-1">
                                <Label htmlFor="totalCost" className="text-[9px] font-bold uppercase text-slate-400">Total Cost</Label>
                                <div className="relative">
                                    <span className="absolute left-2 top-2 text-slate-400 text-xs">$</span>
                                    <Input
                                        id="totalCost"
                                        type="number"
                                        className="pl-5 h-8 bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-500 font-bold"
                                        value={((Number(formData.purchasePrice) || 0) + (Number(formData.freightAndDuty) || 0)).toFixed(2)}
                                        readOnly
                                    />
                                </div>
                            </div>
                            <div className="col-span-3 space-y-1">
                                <Label htmlFor="price" className="text-[9px] font-black text-primary uppercase">Selling Price (IRD)</Label>
                                <div className="relative">
                                    <span className="absolute left-2 top-2 text-primary/70 text-xs">$</span>
                                    <Input
                                        id="price"
                                        type="number"
                                        className="pl-5 h-8 bg-primary/5 dark:bg-primary/10 border-primary/20 font-black text-primary text-xs"
                                        value={formData.price.toFixed(2)}
                                        readOnly
                                    />
                                </div>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label htmlFor="stock" className="text-[9px] font-bold uppercase text-slate-500">Stock *</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    min="0"
                                    className="h-8 text-xs font-bold"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                            <div className="col-span-4 flex justify-end gap-2 pb-0">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-8 text-[10px] uppercase font-bold">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving} className="h-8 text-[10px] uppercase font-bold bg-green-600 hover:bg-green-700">
                                    {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    Save Item
                                </Button>
                            </div>
                        </div>
                    </div>




                </form>
            </Modal>
        </div>
    );
}
