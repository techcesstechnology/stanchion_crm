import CatalogSettings from "@/components/settings/CatalogSettings";

export default function Catalog() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Item Catalog</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your products and services for professional invoicing
                </p>
            </div>

            <CatalogSettings />
        </div>
    );
}
