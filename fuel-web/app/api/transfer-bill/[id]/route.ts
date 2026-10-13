import { prisma } from "@/prisma";

import { NextRequest } from "next/server";

import PDFDocument from "pdfkit";

import path from "path";
import fs from "fs";

import { paiseToRupees, formatDate } from "@/app/utils/helper";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id: transferId } = await params;

  // =====================================================
  // TRANSFER
  // =====================================================

  const transfer = await prisma.membershipTransfer.findUnique({
    where: {
      id: transferId,
    },

    include: {
      fromMember: true,
      toMember: true,
      transferredBy: true,

      subscription: true,

      toSubscription: {
        include: {
          branch: true,
        },
      },

      transferInvoice: {
        include: {
          branch: true,
          payments: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!transfer) {
    return new Response("Transfer bill not found", {
      status: 404,
    });
  }

  // =====================================================
  // DERIVED DATA (everything in PAISE)
  // =====================================================

  const branch =
    transfer.toSubscription?.branch ?? transfer.transferInvoice?.branch ?? null;

  const branchName =
    transfer.toSubscription?.branchName ??
    transfer.transferInvoice?.branchName ??
    branch?.name ??
    "-";

  const serviceName =
    transfer.toSubscription?.serviceName ??
    transfer.subscription.serviceName;

  const packageName =
    transfer.toSubscription?.packageName ??
    transfer.subscription.packageName;

  // ---- GST from the snapshot stored on the transfer ----

  const totalPaise = Math.max(transfer.transferFee || 0, 0);

  const hasTaxSplit =
    transfer.cgstAmount !== null &&
    transfer.cgstAmount !== undefined &&
    transfer.sgstAmount !== null &&
    transfer.sgstAmount !== undefined;

  const taxPaise = hasTaxSplit
    ? Math.round(transfer.cgstAmount ?? 0) + Math.round(transfer.sgstAmount ?? 0)
    : Math.max(totalPaise - (transfer.baseTransferFee || 0), 0);

  const cgstPaise = hasTaxSplit
    ? Math.round(transfer.cgstAmount ?? 0)
    : Math.round(taxPaise / 2);

  const sgstPaise = hasTaxSplit
    ? Math.round(transfer.sgstAmount ?? 0)
    : taxPaise - cgstPaise;

  const basePaise = Math.max(totalPaise - taxPaise, 0);

  const cgstPercentage = transfer.cgstPercentage ?? 0;
  const sgstPercentage = transfer.sgstPercentage ?? 0;

  // ---- Paid / balance ----

  const invoicePayments = transfer.transferInvoice?.payments ?? [];

  const paidPaise = invoicePayments.length
    ? invoicePayments.reduce(
        (t, p) => (p.status === "PAID" ? t + p.amount : t),
        0
      )
    : transfer.amountCollected ?? 0;

  const balancePaise = Math.max(totalPaise - paidPaise, 0);

  const paymentMode =
    transfer.paymentMode ||
    invoicePayments.find((p) => p.status === "PAID")?.paymentMode ||
    "-";

  const billNumber =
    transfer.transferInvoice?.invoiceNumber ??
    `TRF-${transfer.id.slice(-8).toUpperCase()}`;

  const billDate = transfer.transferInvoice?.createdAt ?? transfer.createdAt;

  const paymentStatus =
    totalPaise === 0
      ? "NO FEE"
      : paidPaise >= totalPaise
        ? "PAID"
        : paidPaise > 0
          ? "PARTIALLY PAID"
          : "PENDING";

  // =====================================================
  // ASSETS
  // =====================================================

  const fontPath = path.join(
    process.cwd(),
    "app/fonts/Roboto-VariableFont_wdth,wght.ttf"
  );

  const logoPath = path.join(process.cwd(), "public/Fuel Main Logo.jpg");

  const watermarkPath = path.join(process.cwd(), "public/fuelnamebg.png");

  // =====================================================
  // PDF
  // =====================================================

  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
    font: fontPath,
    bufferPages: false,
  });

  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => {
    chunks.push(chunk);
  });

  return new Promise<Response>((resolve) => {
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);

      resolve(
        new Response(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",

            "Content-Disposition": `attachment; filename=${billNumber}.pdf`,
          },
        })
      );
    });

    // =====================================================
    // WATERMARK
    // =====================================================

    if (fs.existsSync(watermarkPath)) {
      const pageWidth = 595.28;
      const pageHeight = 841.89;

      const watermarkWidth = 480;
      const watermarkHeight = 480;

      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2 + 80;

      doc.save();

      doc.translate(centerX, centerY);

      doc.rotate(-30);

      doc.image(
        watermarkPath,
        -watermarkWidth / 2,
        -watermarkHeight / 2,
        {
          width: 560,
        }
      );

      doc.opacity(1);

      doc.restore();
    }

    // =====================================================
    // HEADER
    // =====================================================

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, {
        width: 90,
      });
    }

    doc
      .fontSize(18)
      .font(fontPath)
      .fillColor("black")
      .text("TRANSFER BILL", 0, 50, {
        align: "center",
      });

    doc
      .fontSize(8)
      .fillColor("#525252")
      .text("Membership Transfer Fee - Tax Invoice", 0, 72, {
        align: "center",
      });

    // =====================================================
    // COMPANY
    // =====================================================

    const rightX = 400;

    let rightY = 52;

    doc
      .fontSize(10)
      .fillColor("black")
      .text("FUEL GYM PRIVATE LIMITED", rightX, rightY, {
        width: 170,
        align: "right",
      });

    rightY += 16;

    doc.fontSize(9).text(`Branch : ${branchName}`, rightX, rightY, {
      width: 170,
      align: "right",
    });

    rightY += 14;

    doc.text(`GSTIN : ${branch?.gstNumber || "-"}`, rightX, rightY, {
      width: 170,
      align: "right",
    });

    rightY += 14;

    doc.text(branch?.address || "-", rightX, rightY, {
      width: 170,
      align: "right",
    });

    // =====================================================
    // DIVIDER
    // =====================================================

    doc.moveTo(40, 120).lineTo(555, 120).strokeColor("#d4d4d4").stroke();

    // =====================================================
    // BILLED TO (the member who received the membership)
    // =====================================================

    doc.fontSize(9).fillColor("black");

    doc.text(`Billed To : ${transfer.toMember.name}`, 40, 130);

    doc.text(`Phone : ${transfer.toMember.phone}`, 40, 143);

    doc.text(`Email : ${transfer.toMember.email || "-"}`, 40, 156);

    doc.text(`Address : ${transfer.toMember.address || "-"}`, 40, 169, {
      width: 240,
      height: 24,
    });

    // RIGHT

    doc.text(`Bill No : ${billNumber}`, 360, 130);

    doc.text(`Bill Date : ${formatDate(billDate)}`, 360, 143);

    doc.text(
      `Handled By : ${transfer.transferredBy?.name || "-"}`,
      360,
      156
    );

    doc.text(`Status : ${paymentStatus}`, 360, 169);

    // =====================================================
    // SERVICE TABLE
    // =====================================================

    const tableTop = 205;

    doc.rect(40, tableTop, 515, 20).fill("#e5e5e5");

    doc
      .fillColor("black")
      .fontSize(9)
      .text("DESCRIPTION", 50, tableTop + 6)
      .text("AMOUNT", 470, tableTop + 6);

    // =====================================================
    // DESCRIPTION
    // =====================================================

    const rowY = tableTop + 28;

    const periodStart = transfer.toSubscription?.startDate
      ? formatDate(transfer.toSubscription.startDate)
      : "-";

    const periodEnd = transfer.toSubscription?.endDate
      ? formatDate(transfer.toSubscription.endDate)
      : "-";

    const description = [
      `Membership Transfer Fee`,
      `${serviceName} - ${packageName}`,
      `Transferred from : ${transfer.fromMember.name}`,
      `Remaining validity : ${
        transfer.remainingDays !== null && transfer.remainingDays !== undefined
          ? `${transfer.remainingDays} days`
          : "-"
      }`,
      `Fee slab : ${transfer.feeSlabLabel || "-"}`,
      `Period : ${periodStart} To ${periodEnd}`,
    ].join("\n");

    doc.fontSize(8.5).fillColor("black").text(description, 50, rowY, {
      width: 300,
      lineGap: 2,
    });

    // =====================================================
    // GST BREAKDOWN IN AMOUNT COLUMN
    // =====================================================

    doc
      .fontSize(8)
      .text(`Base Fee: ₹${paiseToRupees(basePaise)}`, 440, rowY, {
        width: 110,
        lineGap: 1,
      })
      .text(
        `CGST(${cgstPercentage}%): ₹${paiseToRupees(cgstPaise)}`,
        440,
        rowY + 12,
        {
          width: 110,
          lineGap: 1,
        }
      )
      .text(
        `SGST(${sgstPercentage}%): ₹${paiseToRupees(sgstPaise)}`,
        440,
        rowY + 24,
        {
          width: 110,
          lineGap: 1,
        }
      )
      .text(`Tax: ₹${paiseToRupees(taxPaise)}`, 440, rowY + 36, {
        width: 110,
        lineGap: 1,
      });

    // =====================================================
    // TRANSFER DETAILS (left) + TOTALS TABLE (right)
    // =====================================================

    const totalsY = rowY + 92;

    doc.fontSize(9).fillColor("black").text("Transfer Details", 40, totalsY);

    doc
      .fontSize(8)
      .text(`Transferred From : ${transfer.fromMember.name}`, 40, totalsY + 16)
      .text(`Transferred To : ${transfer.toMember.name}`, 40, totalsY + 29)
      .text(`Transfer Date : ${formatDate(transfer.createdAt)}`, 40, totalsY + 42)
      .text(
        `Reason : ${(transfer.reason || "-").slice(0, 60)}`,
        40,
        totalsY + 55,
        {
          width: 290,
        }
      );

    const drawRow = (label: string, value: string, y: number) => {
      doc.rect(360, y, 195, 18).stroke();

      doc.fontSize(7.5).fillColor("black");

      doc.text(label, 365, y + 5);

      doc.text(value, 440, y + 5, {
        width: 105,
        align: "right",
      });
    };

    drawRow(
      "Transfer Fee (Before Tax)",
      `₹${paiseToRupees(basePaise)}`,
      totalsY
    );

    drawRow(
      `CGST (${cgstPercentage}%)`,
      `₹${paiseToRupees(cgstPaise)}`,
      totalsY + 18
    );

    drawRow(
      `SGST (${sgstPercentage}%)`,
      `₹${paiseToRupees(sgstPaise)}`,
      totalsY + 36
    );

    // =====================================================
    // GRAND TOTAL
    // =====================================================

    doc.rect(360, totalsY + 54, 195, 20).fill("#f3f4f6");

    doc
      .fillColor("black")
      .fontSize(8.5)
      .font(fontPath)
      .text("Total Transfer Fee", 365, totalsY + 60)
      .text(`₹${paiseToRupees(totalPaise)}`, 480, totalsY + 60);

    // =====================================================
    // BILL SUMMARY
    // =====================================================

    const summaryY = totalsY + 95;

    doc.fontSize(9).font(fontPath).text("Billing Summary", 40, summaryY);

    doc
      .fontSize(8)
      .text(
        `Transfer Fee (Before Tax) : ₹ ${paiseToRupees(basePaise)}`,
        40,
        summaryY + 16
      )
      .text(`GST : ₹ ${paiseToRupees(taxPaise)}`, 40, summaryY + 29)
      .text(
        `Total Transfer Fee : ₹ ${paiseToRupees(totalPaise)}`,
        40,
        summaryY + 42
      )
      .text(`Paid Amount : ₹ ${paiseToRupees(paidPaise)}`, 40, summaryY + 55)
      .text(`Balance : ₹ ${paiseToRupees(balancePaise)}`, 40, summaryY + 68)
      .text(`Payment Mode : ${paymentMode}`, 40, summaryY + 81);

    // =====================================================
    // TERMS
    // =====================================================

    const termsY = summaryY + 108;

    doc.rect(40, termsY, 515, 16).fill("#e5e5e5");

    doc
      .fillColor("black")
      .fontSize(8)
      .text("TERMS & CONDITIONS", 50, termsY + 4);

    const terms = (
      branch?.terms ||
      "The transfer fee is non-refundable. The transferred membership is valid only for the remaining period shown on this bill."
    ).slice(0, 180);

    doc.fontSize(6.5).text(terms, 45, termsY + 20, {
      width: 505,
      align: "justify",
    });

    // =====================================================
    // SIGNATURES
    // =====================================================

    const sigY = termsY + 45;

    doc
      .fontSize(7.5)
      .text("Signature of member", 40, sigY)
      .text("For FUEL GYM PRIVATE LIMITED", 370, sigY);

    doc.text(transfer.toMember.name, 40, sigY + 18);

    doc.text("Authorised Signatory", 370, sigY + 18);

    // =====================================================
    // FOOTER CONTACT
    // =====================================================

    const footerStartY = sigY + 40;

    doc
      .fontSize(6.5)
      .text(
        `Questions? Contact: ${branch?.supportPhone || "-"} | ${
          branch?.supportEmail || "-"
        }`,
        40,
        footerStartY,
        {
          align: "center",
          width: 515,
        }
      );

    // =====================================================
    // THANK YOU BAR
    // =====================================================

    const barY = footerStartY + 12;

    const barHeight = 20;

    const barLeft = 40;

    const barRight = 555;

    const barWidth = barRight - barLeft;

    doc.rect(barLeft, barY, barWidth, barHeight).fill("#e0e0e0");

    doc
      .fillColor("black")
      .fontSize(8)
      .text("Thank You For Your Business!", barLeft, barY + 6, {
        align: "center",
        width: barWidth,
      });

    // =====================================================
    // DECORATIVE SCALLOPS
    // =====================================================

    const scallopWidth = 6;

    const scallopHeight = 4;

    const scallopCount = Math.floor(barWidth / scallopWidth);

    doc.fillColor("white");

    // TOP

    for (let i = 0; i < scallopCount; i++) {
      const x = barLeft + i * scallopWidth;

      doc
        .polygon(
          [x, barY],
          [x + scallopWidth / 2, barY + scallopHeight],
          [x + scallopWidth, barY]
        )
        .fill();
    }

    // BOTTOM

    for (let i = 0; i < scallopCount; i++) {
      const x = barLeft + i * scallopWidth;

      doc
        .polygon(
          [x, barY + barHeight],
          [x + scallopWidth / 2, barY + barHeight - scallopHeight],
          [x + scallopWidth, barY + barHeight]
        )
        .fill();
    }

    // =====================================================
    // FINAL NOTE
    // =====================================================

    doc
      .fillColor("black")
      .fontSize(6)
      .text(
        "This is a computer generated bill. No signature required.",
        40,
        barY + 26,
        {
          align: "center",
          width: 515,
        }
      );

    // =====================================================
    // END PDF
    // =====================================================

    doc.end();
  });
}