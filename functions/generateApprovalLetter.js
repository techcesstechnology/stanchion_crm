const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { v4: uuidv4 } = require("uuid");

/**
 * Cloud Function: Generate Approval Letter on Finance Transaction or Job Card Final Approval
 * Triggered by Firestore document update when status becomes APPROVED_FINAL
 */
exports.generateApprovalLetter = functions.firestore
    .document('{collection}/{docId}')
    .onUpdate(async (change, context) => {
        const { collection, docId } = context.params;
        const newData = change.after.data();
        const oldData = change.before.data();

        console.log(`Triggered generateApprovalLetter for ${collection}/${docId}. Status: ${oldData.status} -> ${newData.status}`);

        // Only process transactions and jobCards
        if (collection !== 'transactions' && collection !== 'jobCards') {
            return null;
        }

        // Logic: Trigger if status IS APPROVED_FINAL AND (it just changed OR the letter is missing)
        const isApproved = newData.status === 'APPROVED_FINAL';
        const justApproved = isApproved && oldData.status !== 'APPROVED_FINAL';
        const letterMissing = !newData.approvalLetter || !newData.approvalLetter.storagePath;

        if (!isApproved) {
            console.log(`Skipping: Status is ${newData.status}`);
            return null;
        }

        if (!justApproved && !letterMissing) {
            console.log(`Skipping: Already approved and letter exists.`);
            return null;
        }

        console.log(`Proceeding with PDF generation for ${collection}/${docId}. JustApproved: ${justApproved}, LetterMissing: ${letterMissing}`);

        try {
            const db = admin.firestore();
            const storage = admin.storage().bucket();

            // Generate reference number: APP-YYYYMMDD-TYPE-SHORT_ID
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const typeStr = collection === 'transactions' ? 'FIN' : 'JOB';
            const shortId = docId.slice(0, 8).toUpperCase();
            const refNo = `APP-${dateStr}-${typeStr}-${shortId}`;

            console.log(`Generating PDF for RefNo: ${refNo}`);

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

            if (collection === 'transactions') {
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
            console.log(`PDF saved to memory, size: ${pdfBytes.length} bytes`);

            // Upload to Storage
            const storagePath = `approval_letters/${collection}/${docId}.pdf`;
            const file = storage.file(storagePath);

            console.log(`Uploading to: ${storagePath}`);
            await file.save(Buffer.from(pdfBytes), {
                metadata: {
                    contentType: 'application/pdf',
                    metadata: {
                        refNo: refNo,
                        generatedAt: now.toISOString()
                    }
                }
            });
            console.log(`Upload complete.`);

            // Set a download token on the file metadata
            const downloadToken = uuidv4();
            await file.setMetadata({
                metadata: {
                    firebaseStorageDownloadTokens: downloadToken
                }
            });
            console.log(`Download token set.`);

            const bucketName = storage.name;
            const encodedPath = encodeURIComponent(storagePath);
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
            console.log(`Download URL generated: ${publicUrl.substring(0, 80)}...`);

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

            console.log(`Approval letter successfully recorded for ${collection}/${docId}: ${publicUrl}`);
            return { success: true, url: publicUrl };

        } catch (error) {
            console.error(`Error generating approval letter for ${collection}/${docId}:`, error);

            // Mark as failed for retry
            await admin.firestore().collection(collection).doc(docId).update({
                pdfGenerated: false,
                pdfError: error.message,
                pdfErrorAt: admin.firestore.FieldValue.serverTimestamp()
            });

            throw error;
        }
    });
