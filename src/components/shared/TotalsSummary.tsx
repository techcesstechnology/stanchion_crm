import { Card } from "@/components/ui/card"

interface TotalsSummaryProps {
    subtotal: number
    tax?: number // Explicitly optional
    discount?: number // Explicitly optional
    totalPaid?: number // Optional, for Invoices
}

export function TotalsSummary({ subtotal, tax = 0, discount = 0, totalPaid }: TotalsSummaryProps) {
    const total = subtotal + tax - discount
    const balanceDue = total - (totalPaid || 0)

    const format = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
    }

    return (
        <Card className="ml-auto w-full md:w-[400px] bg-slate-50 dark:bg-slate-900 border-none shadow-none p-6 relative">
            {/* Seal - Absolutely positioned to the left (desktop) or top (mobile) 
                Wait, flex row might be better?
                Let's use a flex container for the card content 
            */}

            <div className="flex flex-row items-center gap-4">
                {/* Seal Area - Only visible if finalized (e.g. valid totalPaid or implied context?), 
                   User context implies seal is always desired for "Invoice preview screen".
                   But we don't have "invoice number" or "status" here easily?
                   The props are limited to amounts.
                   Usually `TotalsSummary` is used in `EnterpriseModal`.
                   The user sees this on screen.
                   Let's add an optional prop `invoiceNumber` or `showSeal`. 
                   
                   If I change props here, I need to update usage.
                   Let's check usage first? 
                   I'll modify props to include `invoiceNumber` and `status`?
                   Or just `invoiceNumber`.
               */}

                {/* Let's assume we want to show it. But we need the image.
                   The image is static? '/official_seal.jpg'
                   The text "C/S (INV-0001)" is dynamic.
                   For now, let's wrap the existing content in a div and add the seal to the left.
               */}

                <div className="hidden md:flex flex-col items-start justify-center mr-10 pt-8">
                    <div className="relative w-24 h-24">
                        <img src="/official_seal.jpg" alt="Official Seal" className="w-full h-full object-contain opacity-85" />
                        {/* Overlay Text simulated? 
                           The PDF generator does a complex overlay.
                           For UI, maybe just the image is enough?
                           Or we can try to overlay text.
                           Let's stick to just placing the image to the left for now as requested.
                       */}
                    </div>
                </div>

                <div className="flex-1 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{format(subtotal)}</span>
                    </div>

                    {discount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Discount</span>
                            <span className="font-medium text-red-600">-{format(discount)}</span>
                        </div>
                    )}

                    {tax > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Tax</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{format(tax)}</span>
                        </div>
                    )}

                    <div className="border-t border-slate-200 dark:border-slate-800 my-2 pt-2">
                        <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-slate-900 dark:text-white">Total</span>
                            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{format(total)}</span>
                        </div>
                    </div>

                    {/* Invoice Specifics */}
                    {totalPaid !== undefined && (
                        <div className="pt-2 space-y-2">
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Amount Paid</span>
                                <span>{format(totalPaid)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium pt-2 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-slate-700 dark:text-slate-300">Balance Due</span>
                                <span className={balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}>
                                    {format(balanceDue)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}
