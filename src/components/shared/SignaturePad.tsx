import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eraser, Save } from "lucide-react";

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
}

export default function SignaturePad({ onSave }: SignaturePadProps) {
    const sigPad = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    const clear = () => {
        sigPad.current?.clear();
        setIsEmpty(true);
    };

    const save = () => {
        if (sigPad.current && !sigPad.current.isEmpty()) {
            const dataUrl = sigPad.current.getCanvas().toDataURL("image/png");
            onSave(dataUrl);
        }
    };

    return (
        <Card className="w-full">
            <CardContent className="p-4 space-y-4">
                <div className="border rounded-md bg-white">
                    <SignatureCanvas
                        ref={sigPad}
                        canvasProps={{
                            className: "w-full h-40 rounded-md",
                        }}
                        onBegin={() => setIsEmpty(false)}
                        backgroundColor="rgba(255, 255, 255, 1)"
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={clear} disabled={isEmpty}>
                        <Eraser className="h-4 w-4 mr-2" />
                        Clear
                    </Button>
                    <Button size="sm" onClick={save} disabled={isEmpty} className="bg-green-600 hover:bg-green-700">
                        <Save className="h-4 w-4 mr-2" />
                        Save Signature
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
