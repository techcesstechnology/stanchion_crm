const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

/**
 * Cloud Function: Generate Approval Letter on Finance Transaction or Job Card Final Approval
 * Triggered by Firestore document update when status becomes APPROVED_FINAL
 */
exports.generateApprovalLetter = functions.firestore
    .document('{collection}/{docId}')
    .onUpdate(async (change, context) => {
        const { collection, docId } = context.params;

        // Only process financeTransactions and jobCards
        if (collection !== 'financeTransactions' && collection !== 'jobCards') {
            return null;
        }

        const newData = change.after.data();
        const oldData = change.before.data();

        // Only trigger when status changes to APPROVED_FINAL
        if (newData.status !== 'APPROVED_FINAL' || oldData.status === 'APPROVED_FINAL') {
            return null;
        }

        // Idempotency: Skip if approval letter already exists
        if (newData.approvalLetter && newData.approvalLetter.storagePath) {
            console.log(`Approval letter already exists for ${collection}/${docId}`);
            return null;
        }

        try {
            const db = admin.firestore();
            const storage = admin.storage().bucket();

            // Generate reference number: APP-YYYYMMDD-TYPE-SHORT_ID
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const typeStr = collection === 'financeTransactions' ? 'FIN' : 'JOB';
            const shortId = docId.slice(0, 8).toUpperCase();
            const refNo = `APP-${dateStr}-${typeStr}-${shortId}`;

            // Create PDF document
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([595, 842]); // A4 size
            const { width, height } = page.getSize();

            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Header
            page.drawText('APPROVAL LETTER', {
                x: 50,
                y: height - 50,
                size: 24,
                font: helveticaBold,
                color: rgb(0, 0.2, 0.4)
            });

            page.drawText(refNo, {
                x: 50,
                y: height - 80,
                size: 12,
                font: helvetica,
                color: rgb(0.3, 0.3, 0.3)
            });

            // Horizontal line
            page.drawLine({
                start: { x: 50, y: height - 95 },
                end: { x: width - 50, y: height - 95 },
                thickness: 1,
                color: rgb(0.7, 0.7, 0.7)
            });

            let yPos = height - 130;

            // Request Details
            page.drawText('Request Details', {
                x: 50,
                y: yPos,
                size: 14,
                font: helveticaBold,
                color: rgb(0, 0.2, 0.4)
            });
            yPos -= 25;

            if (collection === 'financeTransactions') {
                page.drawText(`Type: ${newData.type}`, { x: 70, y: yPos, size: 11, font: helvetica });
                yPos -= 20;
                page.drawText(`Amount: ${newData.currency} ${newData.amount.toFixed(2)}`, { x: 70, y: yPos, size: 11, font: helvetica });
                yPos -= 20;
                if (newData.referenceType) {
                    page.drawText(`Reference: ${newData.referenceType} - ${newData.referenceId || 'N/A'}`, { x: 70, y: yPos, size: 11, font: helvetica });
                    yPos -= 20;
                }
            } else {
                // Job Card
                page.drawText(`Project: ${newData.projectName || 'N/A'}`, { x: 70, y: yPos, size: 11, font: helvetica });
                yPos -= 20;
                page.drawText(`Total Cost: $ ${newData.totalCost ? newData.totalCost.toFixed(2) : '0.00'}`, { x: 70, y: yPos, size: 11, font: helvetica });
                yPos -= 20;
            }

            yPos -= 20;

            // Approval Trail
            page.drawText('Approval Trail', {
                x: 50,
                y: yPos,
                size: 14,
                font: helveticaBold,
                color: rgb(0, 0.2, 0.4)
            });
            yPos -= 25;

            if (newData.approvalTrail && newData.approvalTrail.length > 0) {
                for (const entry of newData.approvalTrail) {
                    if (yPos < 100) break; // Prevent overflow
                    const actionText = `${entry.stage}: ${entry.action} by ${entry.byName}`;
                    page.drawText(actionText, { x: 70, y: yPos, size: 10, font: helvetica });
                    yPos -= 15;

                    const timestamp = entry.at ? (entry.at.toDate ? entry.at.toDate() : new Date(entry.at)) : new Date();
                    page.drawText(`Date: ${timestamp.toLocaleString()}`, { x: 90, y: yPos, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
                    yPos -= 20;
                }
            }

            yPos -= 20;

            // Status
            page.drawText('Status', {
                x: 50,
                y: yPos,
                size: 14,
                font: helveticaBold,
                color: rgb(0, 0.2, 0.4)
            });
            yPos -= 25;
            page.drawText(`Final Status: ${newData.status}`, { x: 70, y: yPos, size: 11, font: helveticaBold, color: rgb(0, 0.5, 0) });

            // Footer
            page.drawText(`Generated on ${now.toLocaleString()}`, {
                x: 50,
                y: 50,
                size: 8,
                font: helvetica,
                color: rgb(0.5, 0.5, 0.5)
            });

            // Save PDF
            const pdfBytes = await pdfDoc.save();

            // Upload to Storage
            const storagePath = `approval_letters/${collection}/${docId}.pdf`;
            const file = storage.file(storagePath);
            await file.save(Buffer.from(pdfBytes), {
                metadata: {
                    contentType: 'application/pdf',
                    metadata: {
                        refNo: refNo,
                        generatedAt: now.toISOString()
                    }
                }
            });

            // Make the file publicly readable
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${storage.name}/${storagePath}`;

            // Update Firestore document
            await db.collection(collection).doc(docId).update({
                approvalLetter: {
                    refNo: refNo,
                    storagePath: storagePath,
                    url: publicUrl,
                    generatedAt: admin.firestore.FieldValue.serverTimestamp()
                },
                pdfGenerated: true
            });

            console.log(`Approval letter generated for ${collection}/${docId}: ${publicUrl}`);
            return { success: true, url: publicUrl };

        } catch (error) {
            console.error(`Error generating approval letter for ${collection}/${docId}:`, error);

            // Mark as failed for retry
            await admin.firestore().collection(collection).doc(docId).update({
                pdfGenerated: false,
                pdfError: error.message
            });

            throw error;
        }
    });
