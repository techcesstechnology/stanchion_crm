import { useState, useEffect } from "react";
import {
    Package,
    History,
    ArrowDownLeft,
    ArrowUpRight,
    Search,
    Plus,
    ClipboardList,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { InventoryService } from "@/services/inventoryService";
import { InventoryItem, InventoryMovement, MovementItem } from "@/types/inventory";
import { EnterpriseModal as Modal } from "@/components/ui/EnterpriseModal";
import { cn } from "@/lib/cn";

export default function Inventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showReturnModal, setShowReturnModal] = useState(false);

    // Return Form State
    const [returnItems, setReturnItems] = useState<{ itemId: string, qty: number }[]>([]);
    const [selectedJobCardId, setSelectedJobCardId] = useState("");
    const [returnNote, setReturnNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedItems, fetchedMovements] = await Promise.all([
                InventoryService.getInventoryItems(),
                InventoryService.getInventoryMovements()
            ]);
            setItems(fetchedItems);
            setMovements(fetchedMovements);
        } catch (error) {
            console.error("Error loading inventory data:", error);
            toast.error("Failed to load inventory data");
        } finally {
            setLoading(false);
        }
    };

    const handleProcessReturn = async () => {
        if (returnItems.length === 0) {
            toast.error("Please add at least one item to return");
            return;
        }

        setIsSubmitting(true);
        try {
            await InventoryService.processReturn({
                jobCardId: selectedJobCardId,
                items: returnItems as MovementItem[],
                note: returnNote
            });
            toast.success("Return processed successfully");
            setShowReturnModal(false);
            setReturnItems([]);
            setSelectedJobCardId("");
            setReturnNote("");
            loadData();
        } catch (error) {
            console.error("Error processing return:", error);
            toast.error("Failed to process return");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addReturnItem = () => {
        setReturnItems([...returnItems, { itemId: "", qty: 1 }]);
    };

    const removeReturnItem = (index: number) => {
        const newItems = [...returnItems];
        newItems.splice(index, 1);
        setReturnItems(newItems);
    };

    const updateReturnItem = (index: number, field: string, value: any) => {
        const newItems = [...returnItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setReturnItems(newItems);
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 text-slate-900 dark:text-slate-100 p-2 sm:p-0">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight uppercase italic text-slate-800 dark:text-white">
                        Inventory <span className="text-green-600">Stock</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">
                        Warehouse & Returns Management
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => setShowReturnModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-black uppercase italic tracking-widest h-12 px-8 rounded-xl shadow-lg hover:shadow-green-500/20 transition-all border-none"
                    >
                        <ArrowDownLeft className="w-5 h-5 mr-2" />
                        Record Return
                    </Button>
                </div>
            </div>

            {/* Content Tabs/Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Stock Table */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-950 rounded-3xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                                    <Package className="w-5 h-5" />
                                </div>
                                <h3 className="font-black uppercase tracking-widest text-sm italic">Stock Levels</h3>
                            </div>
                            <div className="relative group max-w-sm w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                                <Input
                                    placeholder="SEARCH SKU OR PRODUCT NAME..."
                                    className="pl-12 h-11 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-[10px] font-bold uppercase tracking-widest"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">SKU</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Product Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">On Hand</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading items...</td>
                                        </tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No items found</td>
                                        </tr>
                                    ) : filteredItems.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                                            <td className="px-6 py-4 font-black text-xs text-green-600 tracking-tighter tabular-nums">{item.sku}</td>
                                            <td className="px-6 py-4 font-bold text-sm">{item.name}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{item.unit || "Unit"}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-lg font-black text-sm tracking-tighter tabular-nums inline-block",
                                                    item.onHandQty <= 5 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-600"
                                                )}>
                                                    {item.onHandQty}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Recent Movements */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-950 rounded-3xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden h-full min-h-[600px] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <History className="w-5 h-5" />
                            </div>
                            <h3 className="font-black uppercase tracking-widest text-sm italic">Recent Movements</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="space-y-2">
                                {loading ? (
                                    <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading history...</div>
                                ) : movements.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No movement history</div>
                                ) : movements.map(move => (
                                    <div key={move.id} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {move.type === 'ISSUE' && <ArrowUpRight className="w-3 h-3 text-red-500" />}
                                                    {move.type === 'RETURN' && <ArrowDownLeft className="w-3 h-3 text-green-600" />}
                                                    {move.type === 'RECEIPT' && <Plus className="w-3 h-3 text-blue-500" />}
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        move.type === 'ISSUE' ? "text-red-500" :
                                                            move.type === 'RETURN' ? "text-green-600" : "text-blue-500"
                                                    )}>
                                                        {move.type}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold leading-relaxed">
                                                    {move.items.length} item(s) {move.type.toLowerCase()}d
                                                </p>
                                                {move.jobCardId && (
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <ClipboardList className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Job Card: {move.jobCardId.substring(0, 8)}...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    {move.createdAt ? format(move.createdAt instanceof Date ? move.createdAt : (move.createdAt as any).toDate?.() || new Date(), "MMM dd") : "Just now"}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{move.createdBy?.name || "System"}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Record Return Modal */}
            <Modal
                isOpen={showReturnModal}
                onClose={() => setShowReturnModal(false)}
                title="Record Inventory Return"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Items to Return</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addReturnItem}
                                className="h-8 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Item
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {returnItems.map((item, index) => (
                                <div key={index} className="flex gap-3 items-end bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-[9px] font-bold uppercase text-slate-400">Product</Label>
                                        <select
                                            title="Select Product to Return"
                                            className="w-full h-10 bg-white dark:bg-slate-950 rounded-lg px-3 text-xs font-bold border-none ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-green-600 transition-all outline-none"
                                            value={item.itemId}
                                            onChange={(e) => updateReturnItem(index, 'itemId', e.target.value)}
                                        >
                                            <option value="">Select Item...</option>
                                            {items.map(libItem => (
                                                <option key={libItem.id} value={libItem.id}>{libItem.sku} - {libItem.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24 space-y-2">
                                        <Label className="text-[9px] font-bold uppercase text-slate-400">Qty</Label>
                                        <Input
                                            type="number"
                                            value={item.qty}
                                            onChange={(e) => updateReturnItem(index, 'qty', parseInt(e.target.value))}
                                            className="h-10 text-xs font-bold"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeReturnItem(index)}
                                        className="h-10 w-10 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-slate-500">Related Job Card ID (Optional)</Label>
                            <Input
                                placeholder="PASTE JOB CARD ID HERE..."
                                value={selectedJobCardId}
                                onChange={(e) => setSelectedJobCardId(e.target.value)}
                                className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold uppercase tracking-widest"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Return Notes</Label>
                            <Input
                                placeholder="REASON FOR RETURN, CONDITION, ETC..."
                                value={returnNote}
                                onChange={(e) => setReturnNote(e.target.value)}
                                className="h-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold uppercase tracking-widest"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <Button
                            className="flex-1 h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase italic tracking-widest transition-all"
                            onClick={handleProcessReturn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "PROCESSING..." : "CONFIRM RETURN"}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-14 h-14 rounded-2xl flex items-center justify-center border-slate-200 dark:border-slate-800"
                            onClick={() => setShowReturnModal(false)}
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
