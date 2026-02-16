import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InvoiceItem, CatalogItem } from "@/types"
import { Trash2, Plus } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { CatalogService } from "@/services/catalogService"

interface LineItemsTableProps {
    items: InvoiceItem[]
    onItemsChange: (items: InvoiceItem[]) => void
}

const CATEGORIES = [
    "Water system",
    "Climate control curtains",
    "Manual feeders",
    "Pan feeders",
    "Labour",
    "Construction",
    "Repairs",
    "Mash-Wire",
    "Site visit",
    "Transport",
    "Product Supply"
];

export function LineItemsTable({ items, onItemsChange }: LineItemsTableProps) {
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [suggestions, setSuggestions] = useState<{ [key: number]: CatalogItem[] }>({});
    const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
    const wrapperRef = useRef<HTMLDivElement>(null);

    const loadCatalog = async () => {
        try {
            const items = await CatalogService.getItems();
            setCatalogItems(items);
        } catch (error) {
            console.error("Failed to load catalog items", error);
        }
    };

    useEffect(() => {
        loadCatalog();

        // Close suggestions when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions({});
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);



    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        onItemsChange(newItems)

        // Filter suggestions if changing description (name)
        if (field === 'description' && typeof value === 'string') {
            if (value.length > 0) {
                const matches = catalogItems.filter(item =>
                    item.name.toLowerCase().includes(value.toLowerCase())
                );
                setSuggestions(prev => ({ ...prev, [index]: matches }));
                setShowSuggestions(prev => ({ ...prev, [index]: true }));
            } else {
                setShowSuggestions(prev => ({ ...prev, [index]: false }));
            }
        }
    }

    const handleSelectSuggestion = (index: number, item: CatalogItem) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            description: item.name,
            longDescription: item.description || '',
            price: item.price
        };
        onItemsChange(newItems);
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) {
            onItemsChange([{ ...items[0], description: '', quantity: 1, price: 0, longDescription: '' }])
            return
        }
        onItemsChange(items.filter((_, i) => i !== index))
    }

    const handleAddItem = () => {
        onItemsChange([
            ...items,
            { id: Date.now().toString() + Math.random(), description: '', longDescription: '', quantity: 1, price: 0 }
        ])
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
    }

    return (
        <div className="space-y-4" ref={wrapperRef}>
            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-lg overflow-visible">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-slate-500 w-[15%]">Installation Category (I.C)</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500 w-[40%]">Installation Service Features (ISF) According to Dimensions/Specs.</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-500 w-[10%]">Qty</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-500 w-[15%]">Service Amount</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-500 w-[15%]">Gross Amount</th>
                            <th className="px-2 py-3 w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((item, index) => (
                            <tr key={index} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                <td className="px-4 py-3 align-top">
                                    <div className="relative">
                                        <select
                                            title="Select Item Category"
                                            value={item.category || ''}
                                            onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium appearance-none"
                                        >
                                            <option value="" disabled>Select Category</option>
                                            {CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </td>
                                <td className="px-4 py-3 align-top space-y-2 relative">
                                    <div className="relative">
                                        <Input
                                            placeholder="Service Features / Specs"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            onFocus={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="h-10 font-medium"
                                            required
                                            autoComplete="off"
                                        />
                                        {/* Suggestions Dropdown */}
                                        {showSuggestions[index] && suggestions[index]?.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {suggestions[index].map(suggestion => (
                                                    <div
                                                        key={suggestion.id}
                                                        className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm"
                                                        onClick={() => handleSelectSuggestion(index, suggestion)}
                                                    >
                                                        <div className="font-medium">{suggestion.name}</div>
                                                        <div className="text-xs text-muted-foreground flex justify-between">
                                                            <span>{suggestion.description?.substring(0, 30)}{suggestion.description && suggestion.description.length > 30 ? '...' : ''}</span>
                                                            <span className="font-mono">${suggestion.price.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Textarea
                                        placeholder="Additional Specs (Optional) - Enter detailed specifications..."
                                        value={item.longDescription || ''}
                                        onChange={(e) => handleItemChange(index, 'longDescription', e.target.value)}
                                        className="min-h-[80px] text-slate-500 resize-y focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                                        rows={3}
                                    />
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="h-10 text-right"
                                        required
                                    />
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                        className="h-10 text-right"
                                        required
                                    />
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300 align-top pt-5">
                                    {formatCurrency(item.quantity * item.price)}
                                </td>
                                <td className="px-2 py-3 text-center align-top pt-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveItem(index)}
                                        className="h-8 w-8 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove Item"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards - Hidden on desktop */}
            <div className="md:hidden space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm bg-white dark:bg-slate-950">
                        {/* Top Section: Item & Description */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor={`item-category-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Installation Category (I.C)</Label>
                                <div className="relative">
                                    <select
                                        title="Select Item Category"
                                        id={`item-category-${index}`}
                                        value={item.category || ''}
                                        onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                                        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium appearance-none"
                                    >
                                        <option value="" disabled>Select Category</option>
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 relative">
                                <Label htmlFor={`item-name-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Installation Service Features (ISF)
                                </Label>
                                <Input
                                    id={`item-name-${index}`}
                                    placeholder="Service Features / Specs"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                    className="h-12 font-medium text-base"
                                    required
                                    autoComplete="off"
                                />
                                {showSuggestions[index] && suggestions[index]?.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {suggestions[index].map(suggestion => (
                                            <div
                                                key={suggestion.id}
                                                className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b last:border-0"
                                                onClick={() => handleSelectSuggestion(index, suggestion)}
                                            >
                                                <div className="font-medium text-sm">{suggestion.name}</div>
                                                <div className="text-xs text-muted-foreground flex justify-between mt-1">
                                                    <span>${suggestion.price.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor={`item-desc-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Additional Specs (Optional)</Label>
                                <Textarea
                                    id={`item-desc-${index}`}
                                    placeholder="Add details..."
                                    value={item.longDescription || ''}
                                    onChange={(e) => handleItemChange(index, 'longDescription', e.target.value)}
                                    className="min-h-[80px] text-base resize-y"
                                />
                            </div>
                        </div>

                        {/* Middle Section: Qty & Price */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="space-y-2">
                                <Label htmlFor={`item-qty-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quantity</Label>
                                <Input
                                    id={`item-qty-${index}`}
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="h-12 text-center text-lg font-medium"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor={`item-price-${index}`} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Service Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                                    <Input
                                        id={`item-price-${index}`}
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                        className="h-12 pl-7 text-right text-lg font-medium"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Amount & Actions */}
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Amount</span>
                                <span className="text-xl font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(item.quantity * item.price)}
                                </span>
                            </div>

                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                className="h-10 w-10 rounded-full"
                                title="Remove Item"
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                type="button"
                variant="outline"
                onClick={handleAddItem}
                className="w-full h-12 gap-2 border-dashed border-2 text-base font-medium hover:border-slate-400 dark:hover:border-slate-600"
            >
                <Plus className="h-5 w-5" />
                Add Line Item
            </Button>
        </div>
    )
}
