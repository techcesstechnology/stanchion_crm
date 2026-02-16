import { Card, CardContent } from "@/components/ui/card";
import {
    UserPlus,
    FileText,
    ArrowRightLeft,
    CreditCard,
    ClipboardList,
    CheckCircle2
} from "lucide-react";

export default function HowToGuide() {
    const steps = [
        {
            title: "1. Create a Contact",
            icon: <UserPlus className="h-6 w-6 text-blue-500" />,
            description: "Start by adding a new customer to your database.",
            details: [
                "Go to the 'Contacts' page from the sidebar.",
                "Click the '+ Add Contact' button.",
                "Fill in the customer's name, email, phone, and address.",
                "Click 'Save Contact' to finish."
            ]
        },
        {
            title: "2. Create a Quote",
            icon: <FileText className="h-6 w-6 text-amber-500" />,
            description: "Draft a professional proposal for your contact.",
            details: [
                "Go to the 'Quotes' page.",
                "Click 'Create Quote'.",
                "Select the client you just created.",
                "Add line items (description, quantity, price).",
                "Add a discount if applicable.",
                "Click 'Create Quote' to save it as a draft."
            ]
        },
        {
            title: "3. Convert Quote to Invoice",
            icon: <ArrowRightLeft className="h-6 w-6 text-purple-500" />,
            description: "Turn an accepted quote into a billable invoice.",
            details: [
                "In the 'Quotes' list, find the quote you want to convert.",
                "Click the 'Convert to Invoice' icon (the arrow pointing right).",
                "This will take you to the Invoice creation page with all details pre-filled.",
                "Review the details and click 'Create Invoice'."
            ]
        },
        {
            title: "4. Record a Payment",
            icon: <CreditCard className="h-6 w-6 text-emerald-500" />,
            description: "Log payments received from customers.",
            details: [
                "Go to the 'Invoices' page.",
                "Find the invoice you want to record a payment for.",
                "Click the 'Record Payment' icon (the coins icon).",
                "Enter the payment amount, date, and method.",
                "Click 'Record Payment' to update the invoice status."
            ]
        },
        {
            title: "5. Generate a Statement",
            icon: <ClipboardList className="h-6 w-6 text-slate-500" />,
            description: "Send a summary of all transactions to your customer.",
            details: [
                "Go back to the 'Contacts' page.",
                "Find the customer in the list.",
                "Click the 'Generate Statement' button on their card.",
                "A PDF statement showing all invoices and payments will be generated and downloaded."
            ]
        }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Sales Team Guide
                </h1>
                <p className="text-lg text-muted-foreground">
                    Follow these steps to manage the full sales cycle from lead to closure.
                </p>
            </div>

            <div className="grid gap-6">
                {steps.map((step, index) => (
                    <Card key={index} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                        <div className="flex flex-col md:flex-row">
                            <div className="p-6 md:w-1/3 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-800/50">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                                    {step.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">{step.title}</h3>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                            <CardContent className="p-6 md:w-2/3">
                                <ul className="space-y-3">
                                    {step.details.map((detail, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 text-center space-y-4">
                <h2 className="text-2xl font-bold">Need help with something else?</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    If you encounter any issues or have questions that aren't covered in this guide,
                    please contact your system administrator.
                </p>
            </div>
        </div>
    );
}
