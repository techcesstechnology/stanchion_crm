import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Quote, CompanySettings, FinanceSettings, Contact, UserProfile } from "@/types";
import { INCAPTTA_LOGO } from "./incapttaLogo";
import { OFFICIAL_SEAL } from "./officialSeal";
import { DEJAVU_REGULAR, DEJAVU_BOLD } from "@/assets/fonts";

// --- Constants & Config ---
const PRIMARY_COLOR = [118, 185, 0] as [number, number, number]; // Lime Green #76b900
const TABLE_HEADER_COLOR = [220, 220, 220] as [number, number, number]; // Light Gray
const SECONDARY_TEXT_COLOR = [38, 38, 38] as [number, number, number]; // Black Text 1, Lighter 15%
const BACKGROUND_COLOR = [237, 229, 225] as [number, number, number]; // #ede5e1 (Beige)


// --- Helpers ---
const drawBackground = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(BACKGROUND_COLOR[0], BACKGROUND_COLOR[1], BACKGROUND_COLOR[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
};

const drawWatermarkOnAllPages = (doc: jsPDF, sealImg: HTMLImageElement) => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawSealBackground(doc, sealImg);
    }
};


const removeWhiteBackground = async (imgSrc: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imgSrc;
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(imgSrc);
                    return;
                }
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Simple white removal algorithm: 
                // If pixel is very close to white, make it transparent
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    // Threshold 240+ for white detection
                    if (r > 240 && g > 240 && b > 240) {
                        data[i + 3] = 0; // Alpha channel to 0
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            } catch (e) {
                console.warn("Error processing image in removeWhiteBackground (potentially CORS):", e);
                // Fallback to original image if processing fails (e.g., due to CORS security restriction on canvas)
                resolve(imgSrc);
            }
        };
        img.onerror = () => {
            console.warn("Failed to load image for white background removal:", imgSrc);
            resolve(imgSrc);
        };
    });
};

export const setupFonts = async (doc: jsPDF): Promise<void> => {
    try {
        doc.addFileToVFS("DejaVuSansCondensed.ttf", DEJAVU_REGULAR);
        doc.addFont("DejaVuSansCondensed.ttf", "DejaVuSansCondensed", "normal");
        if (DEJAVU_BOLD) {
            doc.addFileToVFS("DejaVuSansCondensed-Bold.ttf", DEJAVU_BOLD);
            doc.addFont("DejaVuSansCondensed-Bold.ttf", "DejaVuSansCondensed", "bold");
        }
        doc.setFont("DejaVuSansCondensed", "normal");
    } catch {
        console.warn("Could not load custom fonts, falling back to Helvetica:");
        doc.setFont("helvetica", "normal");
    }
};

const toFormattedDate = (dateValue: Date | string | number | { seconds: number } | any): string => {
    try {
        if (!dateValue) return "N/A";
        if (dateValue.seconds) return new Date(dateValue.seconds * 1000).toLocaleDateString();
        if (dateValue instanceof Date) return dateValue.toLocaleDateString();
        const parsed = new Date(dateValue);
        return !isNaN(parsed.getTime()) ? parsed.toLocaleDateString() : "N/A";
    } catch {
        return "N/A";
    }
};

// --- Rendering Sub-functions ---

const drawHeader = async (doc: jsPDF, companySettings?: CompanySettings): Promise<number> => {
    const pageWidth = doc.internal.pageSize.width;

    // ═══════════════════════════════════════════════════════════════
    // CONSTANTS & CONFIG
    // ═══════════════════════════════════════════════════════════════
    const headerTopY = 12;
    const logoWidth = 45;
    const qrFixedSize = 26;
    const addressBlockX = pageWidth - 14;
    const minHeaderHeight = 35;

    // ═══════════════════════════════════════════════════════════════
    // 1. PRE-LOAD LOGO (To get exact height)
    // ═══════════════════════════════════════════════════════════════
    let logoHeight = 25; // Default fallback
    let logoImgElement: HTMLImageElement | null = null;

    try {
        const logoUrl = companySettings?.logoUrl || INCAPTTA_LOGO;
        const transparentLogo = await removeWhiteBackground(logoUrl);

        await new Promise<void>((resolve) => {
            const loadWithFallback = (useCrossOrigin: boolean) => {
                const img = new Image();
                if (useCrossOrigin) img.crossOrigin = "anonymous";
                img.src = transparentLogo;

                img.onload = () => {
                    logoImgElement = img;
                    const aspect = img.width / img.height;
                    logoHeight = logoWidth / aspect;
                    resolve();
                };

                img.onerror = () => {
                    if (useCrossOrigin) {
                        loadWithFallback(false);
                    } else {
                        console.warn("Logo load fail after both attempts");
                        resolve();
                    }
                };
            };
            loadWithFallback(true);
        });
    } catch (e) { console.warn("Logo load fail", e); }

    // THE BASELINE: Everything aligns to this Y value
    const headerBottomY = Math.max(headerTopY + logoHeight, headerTopY + minHeaderHeight);

    // ═══════════════════════════════════════════════════════════════
    // 2. DRAW LOGO (Left - Top Aligned)
    // ═══════════════════════════════════════════════════════════════
    if (logoImgElement) {
        try {
            doc.addImage(logoImgElement, "PNG", 14, headerTopY, logoWidth, logoHeight);
        } catch (err) {
            console.error("jsPDF error adding logo:", err);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. DRAW QR CODE (Center - Bottom Aligned)
    // ═══════════════════════════════════════════════════════════════
    // Calculate Height: Image (26) + Gap (4) + Text Line (~3) = 33
    const qrBlockTotalHeight = qrFixedSize + 7;

    // Position: Baseline - Height
    let qrY = headerBottomY - qrBlockTotalHeight;

    // Safety: Don't go higher than the top margin
    if (qrY < headerTopY) qrY = headerTopY;

    const qrX = (pageWidth / 2) - (qrFixedSize / 2);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://incaptta.co.zw/')}`;

    try {
        const qrImg = new Image();
        qrImg.crossOrigin = "anonymous";
        qrImg.src = qrCodeUrl;
        await new Promise((resolve) => {
            qrImg.onload = () => {
                try {
                    doc.addImage(qrImg, "PNG", qrX, qrY, qrFixedSize, qrFixedSize);
                } catch (err) {
                    console.error("jsPDF error adding QR:", err);
                }
                resolve(null);
            };
            qrImg.onerror = () => resolve(null);
        });
    } catch { /* ignore */ }

    // "Scan here" text - Pushed to the very bottom
    const scanTextY = qrY + qrFixedSize + 4;
    doc.setFontSize(7);
    doc.setFont("DejaVuSansCondensed", "bold");
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text("Scan here to view our works", pageWidth / 2, scanTextY, { align: "center" });

    // ═══════════════════════════════════════════════════════════════
    // 4. DRAW ADDRESS BLOCK (Right - Bottom Aligned)
    // ═══════════════════════════════════════════════════════════════
    const companyName = (companySettings?.companyName || "INCAPTTA PRIVATE LIMITED ZIMBABWE").toUpperCase();
    const address = companySettings?.address || "No. 46 Northampton Crescent Eastlea Harare";
    const email = companySettings?.email || "sales@incaptta.co.zw";
    const phone = companySettings?.phone || "0774937250";
    const secondaryPhone = companySettings?.secondaryPhone;

    // --- Calculate Content Height ---
    doc.setFont("DejaVuSansCondensed", "bold");
    doc.setFontSize(9);
    const nameLines = doc.splitTextToSize(companyName, 75);

    doc.setFont("DejaVuSansCondensed", "normal");
    doc.setFontSize(8);
    const addressLines = doc.splitTextToSize(address, 55);

    const lineSpacing = 3.5;
    // Name lines * 4 + 2 (gap)
    const h1 = (nameLines.length * 4) + 2;
    // Address lines * 3.5
    const h2 = addressLines.length * lineSpacing;
    // Phone + Email + Website (3 lines) + Secondary Phone (optional)
    const fixedLinesCount = 3 + (secondaryPhone ? 1 : 0);
    const h3 = fixedLinesCount * lineSpacing;

    const totalAddrHeight = h1 + h2 + h3;

    // Position: Baseline - Height
    let addrY = headerBottomY - totalAddrHeight;
    // Fine-tune: Lift it 1 unit so baseline isn't crushed against the green bar zone
    addrY -= 1;

    if (addrY < headerTopY) addrY = headerTopY;

    // --- Render Text ---
    doc.setTextColor(0, 0, 0);
    doc.setFont("DejaVuSansCondensed", "bold");
    doc.setFontSize(9);

    nameLines.forEach((line: string) => {
        doc.text(line, addressBlockX, addrY, { align: "right" });
        addrY += 4;
    });
    addrY += 2; // Gap

    doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
    doc.setFont("DejaVuSansCondensed", "normal");
    doc.setFontSize(8);

    addressLines.forEach((line: string) => {
        doc.text(line, addressBlockX, addrY, { align: "right" });
        addrY += lineSpacing;
    });

    doc.text(phone, addressBlockX, addrY, { align: "right" });
    addrY += lineSpacing;

    if (secondaryPhone) {
        const formattedSecondary = secondaryPhone.startsWith('/') ? secondaryPhone : `/${secondaryPhone}`;
        doc.text(formattedSecondary, addressBlockX, addrY, { align: "right" });
        addrY += lineSpacing;
    }

    doc.text(email, addressBlockX, addrY, { align: "right" });
    addrY += lineSpacing;

    const website = email.includes('@') ? `www.${email.split('@')[1]}` : "www.incaptta.co.zw";
    doc.text(website, addressBlockX, addrY, { align: "right" });

    return headerBottomY;
};


const drawGreenBar = (doc: jsPDF, y: number) => {
    const pageWidth = doc.internal.pageSize.width;
    doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.rect(14, y, pageWidth - 28, 8, "F");
};

const drawClientInfo = (doc: jsPDF, data: Invoice | Quote, y: number, isQuote = false) => {
    const pageWidth = doc.internal.pageSize.width;

    // CHANGE 1: Reduced from y + 15 to y + 5 to remove the large gap
    let currentY = y + 5;
    // Col 1: Bill To
    doc.setFont("DejaVuSansCondensed", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("BILL ADDRESSED TO", 14, currentY);
    currentY += 5;
    doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
    doc.setFont("DejaVuSansCondensed", "normal");
    doc.text(data.clientName, 14, currentY);
    if (data.clientEmail) {
        doc.text(data.clientEmail, 14, currentY + 4);
    }
    // Col 2: Advice
    const col2X = 80;
    // Reset Y for the next column (using the new tighter starting Y)
    let col2Y = y + 5;
    doc.setTextColor(0, 0, 0);
    doc.setFont("DejaVuSansCondensed", "bold");
    doc.text("PLEASE BE ADVISED THAT", col2X, col2Y);
    col2Y += 5;
    doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
    doc.setFont("DejaVuSansCondensed", "normal");
    doc.setFontSize(8);

    const adviceText = "For all onsite Installation services: Please note that you will provide transport (for the workforce ,material (herein stated in this invoice) and equipment committed to you from our premises and from your farm after service delivery.";
    const adviceLines = doc.splitTextToSize(adviceText, 80);
    doc.text(adviceLines, col2X, col2Y);
    // Col 3: Estimate/Invoice Info
    const col3X = pageWidth - 14;
    let col3Y = y + 5;
    doc.setFont("DejaVuSansCondensed", "bold");
    doc.setFontSize(14);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    const title = isQuote ? "ESTIMATE" : "INVOICE";
    doc.text(title, col3X, col3Y, { align: "right" });
    col3Y += 7;
    doc.setFontSize(14);
    doc.text(`#${data.number || data.id.substring(0, 6)}`, col3X, col3Y, { align: "right" });
    col3Y += 8;
    doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
    doc.setFontSize(9);
    doc.text(`Date: ${toFormattedDate(data.date)}`, col3X, col3Y, { align: "right" });
    col3Y += 5;
    if (isQuote) {
        doc.text(`Due Date: ${toFormattedDate((data as Quote).expiryDate)}`, col3X, col3Y, { align: "right" });
    } else {
        doc.text(`Due Date: ${toFormattedDate((data as Invoice).dueDate)}`, col3X, col3Y, { align: "right" });
    }
    // Return the lowest Y coordinate to continue drawing below
    const lowestY = Math.max(
        currentY + 5,
        col2Y + (adviceLines.length * 3.5),
        col3Y
    );
    return lowestY + 10;
};

const drawInvoiceTable = (doc: jsPDF, data: Invoice | Quote, y: number) => {
    const tableColumn = [
        "Installation\nCategory (I.C)",
        "Installation Service Features (ISF) According to\nDimensions/Specs.",
        "Qty",
        "Service\nAmount",
        "Gross\nAmount"
    ];

    const tableRows = data.items.map(item => [
        item.category || '',
        item.description + (item.longDescription ? `\n${item.longDescription}` : ''),
        item.quantity.toString(),
        (item.price).toFixed(2),
        (item.quantity * item.price).toFixed(2)
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: y,
        theme: 'grid',
        styles: {
            font: "DejaVuSansCondensed",
            fontSize: 8,
            overflow: 'linebreak',
            cellPadding: 2,
            lineColor: PRIMARY_COLOR,
            lineWidth: 0.1,
            valign: 'top',
            textColor: SECONDARY_TEXT_COLOR as [number, number, number]
        },
        bodyStyles: {
            fillColor: BACKGROUND_COLOR
        },
        headStyles: {
            fillColor: TABLE_HEADER_COLOR,
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
    });

    // @ts-ignore
    return (doc as any).lastAutoTable.finalY + 2;
};

const drawTotals = (doc: jsPDF, data: Invoice | Quote, y: number) => {
    const pageWidth = doc.internal.pageSize.width;
    let currentY = y;
    const valueX = pageWidth - 14;
    const labelRightAnchor = pageWidth - 45;
    const rowH = 6;

    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const total = data.total;
    const paidAmount = (data as Invoice).payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    // Subtotal
    doc.setFont("DejaVuSansCondensed", "normal");
    doc.setFontSize(9);
    doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
    doc.text("Subtotal", labelRightAnchor, currentY + 4, { align: "right" });
    doc.text(subtotal.toFixed(2), valueX, currentY + 4, { align: "right" });
    currentY += rowH;

    // Discount
    if (data.discountValue && data.discountValue > 0) {
        const discountLabel = data.discountType === 'percent' ? `Discount (${data.discountValue}%)` : "Discount";
        let discountAmount = 0;
        if (data.discountType === 'percent') {
            discountAmount = subtotal * (data.discountValue / 100);
        } else {
            discountAmount = data.discountValue;
        }

        doc.text(discountLabel, labelRightAnchor, currentY + 4, { align: "right" });
        doc.text(`-${discountAmount.toFixed(2)}`, valueX, currentY + 4, { align: "right" });
        currentY += rowH;
    }

    // TOTAL
    doc.setFont("DejaVuSansCondensed", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL", labelRightAnchor, currentY + 4, { align: "right" });
    doc.text(total.toFixed(2), valueX, currentY + 4, { align: "right" });
    currentY += rowH + 2;

    // Payments & Balance (Only show for Invoices or if there is a remaining balance)
    const isQuote = !('payments' in data);
    if (!isQuote) {
        doc.setFillColor(230, 230, 230);
        doc.rect(14, currentY, pageWidth - 28, rowH, "F");
        doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
        doc.setFont("DejaVuSansCondensed", "normal");
        doc.text("Less Payment", labelRightAnchor, currentY + 4.5, { align: "right" });
        doc.text(paidAmount > 0 ? `(${paidAmount.toFixed(2)})` : "0.00", valueX, currentY + 4.5, { align: "right" });
        currentY += rowH;

        doc.setFillColor(200, 200, 200);
        doc.rect(14, currentY, pageWidth - 28, rowH, "F");
        doc.setFont("DejaVuSansCondensed", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Balance Due", labelRightAnchor, currentY + 4.5, { align: "right" });
        doc.text((total - paidAmount).toFixed(2), valueX, currentY + 4.5, { align: "right" });
    }

    return currentY + 15;
};

const drawFooter = async (doc: jsPDF, y: number, companySettings?: CompanySettings, financeSettings?: FinanceSettings, creator?: { name: string; position?: string; signatureUrl?: string }, signerProfile?: UserProfile) => {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    let currentY = y;

    // Ensure we have space, else add page
    if (currentY > 200) {
        doc.addPage();
        drawBackground(doc);
        currentY = 20;
    }

    // --- 1. PREPARE DATA FOR TABLE ---
    // Construct Bank 1 Text
    let bank1Text = "";
    if (financeSettings?.bankName) {
        bank1Text += `BANK: ${financeSettings.bankName}\n`;
        bank1Text += `Account Name: ${financeSettings.accountName}\n`;
        bank1Text += `Account No: ${financeSettings.accountNumber}`;
        if (financeSettings.branchCode) bank1Text += `\nBranch: ${financeSettings.branchCode}`;
    }

    // Construct Bank 2 Text
    let bank2Text = "";
    if (financeSettings?.bankName2) {
        bank2Text += `BANK: ${financeSettings.bankName2}\n`;
        bank2Text += `Account Name: ${financeSettings.accountName2}\n`;
        bank2Text += `Account No: ${financeSettings.accountNumber2}`;
    }

    // Construct Payment Terms Text
    const paymentTermsText = financeSettings?.paymentTerms
        ? `PAYMENT TERMS: ${financeSettings.paymentTerms}`
        : "";

    // --- 2. DRAW BANKING TABLE (AutoTable) ---
    autoTable(doc, {
        startY: currentY,
        head: [[{ content: 'PAYMENT DETAILS', colSpan: 2, styles: { halign: 'center' } }]],
        body: [
            [
                { content: bank1Text, styles: { halign: 'left' } },
                { content: bank2Text, styles: { halign: 'left' } }
            ],
            [{ content: paymentTermsText, colSpan: 2, styles: { fontStyle: 'italic', textColor: [80, 80, 80] } }]
        ],
        theme: 'grid',
        headStyles: {
            fillColor: PRIMARY_COLOR,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: SECONDARY_TEXT_COLOR,
            fontSize: 8,
            cellPadding: 3,
            valign: 'top'
        },
        columnStyles: {
            0: { cellWidth: (pageWidth - (margin * 2)) / 2 },
            1: { cellWidth: (pageWidth - (margin * 2)) / 2 }
        },
        margin: { left: margin, right: margin }
    });

    // Update Y to below the table
    // @ts-ignore
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- 3. HORIZONTAL LAYOUT (Other Info | Terms | Signature) ---
    const availableWidth = pageWidth - (margin * 2);
    const colWidth = (availableWidth / 3) - 4; // 3 columns with small gaps
    const col1X = margin;
    const col2X = margin + colWidth + 6;
    const col3X = margin + (colWidth * 2) + 12;

    // Check page break again for bottom section
    if (currentY > 250) {
        doc.addPage();
        drawBackground(doc);
        currentY = 20;
    }

    doc.setFontSize(8);

    // COLUMN 1: Other Information
    if (financeSettings?.otherInfo) {
        doc.setFont("DejaVuSansCondensed", "bold");
        doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        doc.text("OTHER INFORMATION", col1X, currentY);

        doc.setFont("DejaVuSansCondensed", "normal");
        doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
        const infoLines = doc.splitTextToSize(financeSettings.otherInfo, colWidth);
        doc.text(infoLines, col1X, currentY + 5);
    }

    // COLUMN 2: Terms & Conditions (Technical)
    if (financeSettings?.termsAndConditions) {
        doc.setFont("DejaVuSansCondensed", "bold");
        doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        doc.text("TERMS & CONDITIONS", col2X, currentY);

        doc.setFont("DejaVuSansCondensed", "normal");
        doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
        // Limit lines to prevent overlap
        const termsLines = doc.splitTextToSize(financeSettings.termsAndConditions, colWidth);
        doc.text(termsLines, col2X, currentY + 5);
    }

    // COLUMN 3: Signatory
    const finalSigner = signerProfile ? {
        name: `${signerProfile.firstName || ''} ${signerProfile.lastName || ''}`.trim(),
        position: signerProfile.position,
        signatureUrl: signerProfile.signatureUrl
    } : creator;

    const signerName = finalSigner?.name || "F.A Mfufambisi";
    const signerPos = finalSigner?.position || "TECHNICAL MANAGER";

    doc.setFont("DejaVuSansCondensed", "bold");
    doc.setTextColor(0, 0, 0);
    // Signer Name 
    doc.text(signerName, col3X, currentY);

    // Position (Wrapped) 
    doc.setFont("DejaVuSansCondensed", "normal");
    doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
    const posLines = doc.splitTextToSize(signerPos, colWidth);
    doc.text(posLines, col3X, currentY + 4);

    // Date 
    const dateY = currentY + 4 + (posLines.length * 3.5);
    doc.text(`Date: ${toFormattedDate(new Date())}`, col3X, dateY);

    // Signature Label 
    const sigLabelY = dateY + 6;
    doc.text("Signature:", col3X, sigLabelY);

    // Signature Image
    if (finalSigner?.signatureUrl) {
        try {
            const transparentSig = await removeWhiteBackground(finalSigner.signatureUrl);
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = transparentSig;
            await new Promise((resolve) => {
                img.onload = () => {
                    const aspect = img.width / img.height;
                    doc.addImage(img, "PNG", col3X, sigLabelY + 2, 40, 40 / aspect);
                    resolve(null);
                };
                img.onerror = () => resolve(null);
            });
        } catch { /* ignore */ }
    }

    // Seal Image (Small, bottom right)
    const sealImg = await getSealImage(companySettings);
    if (sealImg) {
        try {
            doc.addImage(sealImg, "PNG", col3X + 15, sigLabelY, 50, 50);
        } catch { /* ignore */ }
    }
};

const drawSealBackground = (doc: jsPDF, sealImg: HTMLImageElement) => {
    const docAny = doc as any;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Increase size by 300% (Original was 30x30, so 30 + 3*30 = 120)
    const sealSize = 120;
    const x = (pageWidth - sealSize) / 2;
    const y = (pageHeight - sealSize) / 2;

    if (docAny.GState) {
        try {
            docAny.saveGraphicsState();
            // 10% opacity per user request for maximum subtleness and readability
            docAny.setGState(new docAny.GState({ opacity: 0.10 }));
            doc.addImage(sealImg, "PNG", x, y, sealSize, sealSize);
            docAny.restoreGraphicsState();
        } catch (e) {
            console.warn("Failed to set GState or addImage for watermark seal:", e);
            try {
                doc.addImage(sealImg, "PNG", x, y, sealSize, sealSize);
            } catch (err) {
                console.error("jsPDF error in addImage (watermark fallback):", err);
            }
        }
    } else {
        // Fallback if GState is not available (no opacity)
        try {
            doc.addImage(sealImg, "PNG", x, y, sealSize, sealSize);
        } catch (err) {
            console.error("jsPDF error in addImage (watermark logic fallback):", err);
        }
    }
};

const setupDoc = (doc: jsPDF) => {
    // Override addPage to automatically draw the background
    const originalAddPage = (doc as any).addPage.bind(doc);
    (doc as any).addPage = function (format?: string | number[], orientation?: "p" | "portrait" | "l" | "landscape") {
        originalAddPage(format, orientation);
        drawBackground(this);
        return this;
    };

    // Draw initial page background
    drawBackground(doc);
};

const getSealImage = async (companySettings?: CompanySettings): Promise<HTMLImageElement | null> => {
    const sealSource = companySettings?.officialSealUrl || OFFICIAL_SEAL;
    if (!sealSource) return null;

    try {
        const transparentSeal = await removeWhiteBackground(sealSource);
        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.src = transparentSeal;

        return await new Promise((resolve) => {
            sealImg.onload = () => resolve(sealImg);
            sealImg.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
};

// --- API ---

export const generateInvoicePDF = async (data: Invoice, companySettings?: CompanySettings, financeSettings?: FinanceSettings, signerProfile?: UserProfile) => {
    const doc = new jsPDF();
    await setupFonts(doc);
    setupDoc(doc);
    const sealImg = await getSealImage(companySettings);
    const h = await drawHeader(doc, companySettings);
    const greenBarY = h + 4;
    drawGreenBar(doc, greenBarY);
    // CHANGE 2: Reduced padding from +5 to +2
    let y = drawClientInfo(doc, data, greenBarY + 8 + 2);
    y = drawInvoiceTable(doc, data, y);
    y = drawTotals(doc, data, y);
    await drawFooter(doc, y, companySettings, financeSettings, data.createdBy, signerProfile);

    if (sealImg) {
        drawWatermarkOnAllPages(doc, sealImg);
    }

    doc.save(`Invoice_${data.number || data.id.substring(0, 8)}.pdf`);
};

export const generateQuotePDF = async (data: Quote, companySettings?: CompanySettings, financeSettings?: FinanceSettings, signerProfile?: UserProfile) => {
    const doc = new jsPDF();
    await setupFonts(doc);
    setupDoc(doc);
    const sealImg = await getSealImage(companySettings);
    const h = await drawHeader(doc, companySettings);
    const greenBarY = h + 4;
    drawGreenBar(doc, greenBarY);
    // CHANGE 2: Reduced padding from +5 to +2
    let y = drawClientInfo(doc, data, greenBarY + 8 + 2, true);
    y = drawInvoiceTable(doc, data, y);
    y = drawTotals(doc, data, y);
    await drawFooter(doc, y, companySettings, financeSettings, data.createdBy, signerProfile);

    if (sealImg) {
        drawWatermarkOnAllPages(doc, sealImg);
    }

    doc.save(`Quote_${data.number || data.id.substring(0, 8)}.pdf`);
};

export const generateStatementPDF = async (contact: Contact, invoices: Invoice[], financeSettings?: FinanceSettings, signerProfile?: UserProfile, companySettings?: CompanySettings) => {
    const doc = new jsPDF();
    await setupFonts(doc);
    setupDoc(doc);
    const sealImg = await getSealImage(companySettings);
    const h = await drawHeader(doc, companySettings);
    const greenBarY = h + 4;
    drawGreenBar(doc, greenBarY);
    // CHANGE 3: Reduced padding from +15 to +5
    let currentY = greenBarY + 8 + 5;
    doc.setFont("DejaVuSansCondensed", "bold");
    doc.setFontSize(14);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text("CLIENT STATEMENT", doc.internal.pageSize.width - 14, currentY, { align: "right" });

    currentY += 10;
    doc.setTextColor(SECONDARY_TEXT_COLOR[0], SECONDARY_TEXT_COLOR[1], SECONDARY_TEXT_COLOR[2]);
    doc.setFontSize(10);
    doc.text(`Client: ${contact.name}`, 14, currentY);
    if (contact.company) { currentY += 5; doc.text(`Company: ${contact.company}`, 14, currentY); }

    currentY += 10;
    autoTable(doc, {
        head: [["Date", "Invoice #", "Status", "Total", "Balance"]],
        body: invoices.map(inv => {
            const paid = inv.payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
            const balance = inv.total - paid;
            return [
                toFormattedDate(inv.date),
                inv.number || inv.id.substring(0, 6),
                inv.status,
                inv.total.toFixed(2),
                balance.toFixed(2)
            ];
        }),
        startY: currentY,
        theme: 'grid',
        styles: { font: "DejaVuSansCondensed", fontSize: 9, textColor: SECONDARY_TEXT_COLOR },
        bodyStyles: { fillColor: BACKGROUND_COLOR },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    // @ts-ignore
    await drawFooter(doc, (doc as any).lastAutoTable.finalY + 10, companySettings, financeSettings, undefined, signerProfile);

    if (sealImg) {
        drawWatermarkOnAllPages(doc, sealImg);
    }

    doc.save(`Statement_${contact.name.replace(/\s+/g, '_')}.pdf`);
};
