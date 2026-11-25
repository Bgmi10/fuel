import { prisma } from "@/prisma";

import { NextRequest } from "next/server";

import PDFDocument from "pdfkit";

import path from "path";
import fs from "fs";

import {
  paiseToRupees,
  formatDate,
} from "@/app/utils/helper";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      paymentId: string;
    }>;
  }
) {
  const { paymentId } =
    await params;

  // =====================================================
  // PAYMENT
  // =====================================================

  const payment =
    await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },

      include: {
        member: true,

        invoice: {
          include: {
            branch: true,
          },
        },
      },
    });

  if (!payment) {
    return new Response(
      "Receipt not found",
      {
        status: 404,
      }
    );
  }

  // CHANGED: a receipt is only valid for a payment that was actually received.
  // (The PAID stamp below would otherwise be printed on refunded / voided /
  // failed payments.)
  if (payment.status !== "PAID") {
    return new Response(
      "Receipt is available only for paid payments",
      {
        status: 400,
      }
    );
  }

  // =====================================================
  // GST
  // =====================================================

  // IMPORTANT: all calculations here are in PAISE.
  //
  // CHANGED: the GST shown on a receipt is the share of the tax that was
  // stored on the INVOICE, in proportion to the amount of this payment.
  //   - invoice with GST (new software): receipt shows that part of the GST
  //   - invoice with no GST (old software, totalTax = 0): receipt shows no GST
  // Only when the invoice has no stored tax at all (null) do we fall back to
  // extracting GST from the payment using the percentages in Settings.
  // A stored 0 is never treated as "missing".

  const invoice = payment.invoice;

  const hasStoredTax =
    invoice.totalTax !== null &&
    invoice.totalTax !== undefined;

  let taxPaise: number;
  let cgstPaise: number;
  let sgstPaise: number;
  let cgstPercentage: number;
  let sgstPercentage: number;

  if (hasStoredTax) {
    const invoiceTaxPaise = Math.round(
      invoice.totalTax ?? 0
    );

    const invoiceTaxableAmount = Math.max(
      invoice.packageAmount -
        invoice.discountAmount -
        (invoice.referralDiscountAmount || 0),
      0
    );

    const invoiceTotalPaise =
      invoiceTaxableAmount +
      invoiceTaxPaise;

    taxPaise =
      invoiceTaxPaise > 0 &&
      invoiceTotalPaise > 0
        ? Math.round(
            (payment.amount *
              invoiceTaxPaise) /
              invoiceTotalPaise
          )
        : 0;

    const cgstShare =
      invoiceTaxPaise > 0
        ? (invoice.cgstAmount ??
            invoiceTaxPaise / 2) /
          invoiceTaxPaise
        : 0.5;

    cgstPaise = Math.round(
      taxPaise * cgstShare
    );

    sgstPaise = taxPaise - cgstPaise;

    cgstPercentage =
      invoice.cgstPercentage ?? 0;

    sgstPercentage =
      invoice.sgstPercentage ?? 0;
  } else {
    const setting =
      await prisma.setting.findFirst();

    cgstPercentage =
      setting?.cgstPercentage ?? 0;

    sgstPercentage =
      setting?.sgstPercentage ?? 0;

    const totalGSTPercentage =
      cgstPercentage + sgstPercentage;

    const extractedBasePaise =
      Math.round(
        payment.amount /
          (1 + totalGSTPercentage / 100)
      );

    taxPaise =
      payment.amount -
      extractedBasePaise;

    cgstPaise = Math.round(
      taxPaise *
        (totalGSTPercentage > 0
          ? cgstPercentage /
            totalGSTPercentage
          : 0.5)
    );

    sgstPaise = taxPaise - cgstPaise;
  }

  const basePaise =
    payment.amount - taxPaise;

  const showTax = taxPaise > 0;

  // =====================================================
  // ASSETS
  // =====================================================

  const fontPath = path.join(
    process.cwd(),
    "app/fonts/Roboto-VariableFont_wdth,wght.ttf"
  );

  const logoPath = path.join(
    process.cwd(),
    "public/Fuel Main Logo.jpg"
  );

  const watermarkPath = path.join(
    process.cwd(),
    "public/fuelnamebg.png"
  );

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

  return new Promise<Response>(
    (resolve) => {
      doc.on("end", () => {
        const pdfBuffer =
          Buffer.concat(chunks);

        resolve(
          new Response(pdfBuffer, {
            headers: {
              "Content-Type":
                "application/pdf",

              "Content-Disposition": `attachment; filename=${payment.receiptNumber}.pdf`,
            },
          })
        );
      });

      // =====================================================
      // WATERMARK
      // =====================================================

      if (
        fs.existsSync(
          watermarkPath
        )
      ) {
        const pageWidth =
          595.28;

        const pageHeight =
          841.89;

        const watermarkWidth =
          480;

        const watermarkHeight =
          480;

        const centerX =
          pageWidth / 2;

        const centerY =
          pageHeight / 2 + 80;

        doc.save();

        doc.translate(
          centerX,
          centerY
        );

        doc.rotate(-30);

        doc.image(
          watermarkPath,
          -watermarkWidth / 2,
          -watermarkHeight / 2,
          {
            width: 560,
          }
        );

        doc.opacity(0.08);

        doc.restore();
      }

      // =====================================================
      // HEADER
      // =====================================================

      if (
        fs.existsSync(logoPath)
      ) {
        doc.image(
          logoPath,
          40,
          40,
          {
            width: 90,
          }
        );
      }

      doc
        .fontSize(18)
        .font(fontPath)
        .fillColor("black")
        .text(
          "RECEIPT",
          0,
          50,
          {
            align: "center",
          }
        );

      // =====================================================
      // COMPANY
      // =====================================================

      doc
        .fontSize(9)
        .font(fontPath)

        .text(
          "FUEL GYM PRIVATE LIMITED",
          395,
          52,
          {
            align: "left",
            width: 160,
            lineGap: 2,
          }
        )

        .moveDown(0.3)

        .text(
          `Branch : ${payment.invoice.branchName}`,
          395,
          undefined,
          {
            width: 160,
            lineGap: 2,
          }
        )

        .moveDown(0.3)

        .text(
          `GSTIN : ${
            payment.invoice
              .branch
              ?.gstNumber ||
            "-"
          }`,
          395,
          undefined,
          {
            width: 160,
            lineGap: 2,
          }
        )

        .moveDown(0.3)

        .text(
          payment.invoice
            .branch?.address ||
            "-",
          395,
          undefined,
          {
            width: 160,
            lineGap: 2,
          }
        );

      // =====================================================
      // DIVIDER
      // =====================================================

      doc
        .moveTo(40, 120)
        .lineTo(555, 120)
        .strokeColor("#d4d4d4")
        .stroke();

      // =====================================================
      // CUSTOMER DETAILS
      // =====================================================

      doc
        .fontSize(9)
        .fillColor("black");

      // LEFT

      doc.text(
        `Customer : ${payment.invoice.memberName}`,
        40,
        135
      );

      doc.text(
        `Phone : ${payment.invoice.memberPhone}`,
        40,
        149
      );

      doc.text(
        `Email : ${
          payment.invoice
            .memberEmail ||
          "-"
        }`,
        40,
        163
      );

      // =====================================================
      // RIGHT SIDE DETAILS (FIXED)
      // =====================================================

      const rightX = 330;
      const rightY = 135;
      const rightWidth = 220;

      doc
        .fontSize(9)
        .font(fontPath)

        .text(
          `Receipt No : ${payment.receiptNumber}`,
          rightX,
          rightY,
          {
            width: rightWidth,
            align: "left",
            lineGap: 2,
          }
        )

        .moveDown(0.5)

        .text(
          `Invoice No : ${payment.invoice.invoiceNumber}`,
          {
            width: rightWidth,
            align: "left",
            lineGap: 2,
          }
        )

        .moveDown(0.5)

        .text(
          `Date : ${formatDate(
            payment.paidAt ||
              payment.createdAt
          )}`,
          {
            width: rightWidth,
            align: "left",
          }
        );

      // =====================================================
      // PAYMENT TABLE
      // =====================================================

      const tableTop = 250;

      doc
        .rect(
          40,
          tableTop,
          515,
          20
        )
        .fill("#e5e5e5");

      doc
        .fillColor("black")
        .fontSize(9)

        .text(
          "DESCRIPTION",
          50,
          tableTop + 6
        )

        .text(
          "AMOUNT",
          470,
          tableTop + 6
        );

      const rowY =
        tableTop + 30;

      const paymentDescription = `${payment.invoice.serviceName} - ${payment.invoice.packageName}

${payment.paymentType} Payment

Payment Mode : ${payment.paymentMode}

Receipt Date : ${formatDate(
        payment.paidAt ||
          payment.createdAt
      )}`;

      doc
        .fontSize(8.5)
        .fillColor("black")
        .text(
          paymentDescription,
          50,
          rowY,
          {
            width: 300,
            lineGap: 2,
          }
        );

      // =====================================================
      // GST BREAKDOWN
      // =====================================================

      const totalsY = rowY + 80;

      const drawRow = (
        label: string,
        value: string,
        y: number,
        isBold: boolean = false
      ) => {
        doc.rect(
          320,
          y,
          235,
          20
        );

        doc.stroke();

        doc.fontSize(isBold ? 9 : 8);

        doc.text(
          label,
          330,
          y + 6
        );

        doc.text(
          value,
          470,
          y + 6
        );
      };

      // CHANGED: the CGST / SGST / Tax lines are printed only when GST is
      // part of this payment. Receipts for old-software invoices (no GST)
      // show just the base fee.

      // Breakdown in amount column
      doc
        .fontSize(8)
        .text(
          `Base Fee : ₹ ${paiseToRupees(
            basePaise
          )}`,
          470,
          rowY,
          {
            width: 80,
            lineGap: 2,
          }
        );

      if (showTax) {
        doc
          .text(
            `CGST (${cgstPercentage.toFixed(
              1
            )}%) : ₹ ${paiseToRupees(
              cgstPaise
            )}`,
            470,
            rowY + 14,
            {
              width: 80,
              lineGap: 2,
            }
          )
          .text(
            `SGST (${sgstPercentage.toFixed(
              1
            )}%) : ₹ ${paiseToRupees(
              sgstPaise
            )}`,
            470,
            rowY + 28,
            {
              width: 80,
              lineGap: 2,
            }
          )
          .text(
            `Total Tax : ₹ ${paiseToRupees(
              taxPaise
            )}`,
            470,
            rowY + 42,
            {
              width: 80,
              lineGap: 2,
            }
          );
      }

      // Breakdown table
      drawRow(
        "Base Fee",
        `₹ ${paiseToRupees(
          basePaise
        )}`,
        totalsY
      );

      if (showTax) {
        drawRow(
          `CGST (${cgstPercentage.toFixed(
            1
          )}%)`,
          `₹ ${paiseToRupees(
            cgstPaise
          )}`,
          totalsY + 20
        );

        drawRow(
          `SGST (${sgstPercentage.toFixed(
            1
          )}%)`,
          `₹ ${paiseToRupees(
            sgstPaise
          )}`,
          totalsY + 40
        );

        drawRow(
          "Total Tax",
          `₹ ${paiseToRupees(
            taxPaise
          )}`,
          totalsY + 60
        );
      }

      // =====================================================
      // GRAND TOTAL
      // =====================================================

      // CHANGED: position depends on how many rows were drawn above
      // (80 with the GST rows, 24 without), so there is no big gap.
      const grandY = showTax
        ? totalsY + 80
        : totalsY + 24;

      doc
        .rect(
          320,
          grandY,
          235,
          22
        )
        .fill("#f3f4f6");

      doc
        .fillColor("black")
        .fontSize(9)
        .font(fontPath)

        .text(
          "Paid Amount",
          330,
          grandY + 7
        )

        .text(
          `₹ ${paiseToRupees(
            payment.amount
          )}`,
          470,
          grandY + 7
        );

      // =====================================================
      // PAID STAMP
      // =====================================================

      const stampY = grandY + 40;

      doc.save();

      doc.rotate(
        -18,
        {
          origin: [
            495,
            stampY + 5,
          ],
        }
      );

      doc
        .roundedRect(
          470,
          stampY,
          58,
          24,
          4
        )
        .lineWidth(2)
        .strokeColor("#ef4444")
        .stroke();

      doc
        .fillColor("#ef4444")
        .fontSize(14)
        .font(fontPath)
        .text(
          "PAID",
          480,
          stampY + 5
        );

      doc.restore();

      // =====================================================
      // SIGNATURES
      // =====================================================

      const sigY =
        grandY + 120;

      doc
        .fontSize(8)

        .text(
          "Received From",
          40,
          sigY
        )

        .text(
          "For FUEL GYM PRIVATE LIMITED",
          370,
          sigY
        );

      doc.text(
        payment.invoice
          .memberName,
        40,
        sigY + 22
      );

      doc.text(
        "Authorised Signatory",
        370,
        sigY + 22
      );

      // =====================================================
      // FOOTER CONTACT
      // =====================================================

      const footerStartY =
        sigY + 48;

      doc
        .fontSize(7)
        .text(
          `If you have any questions about this receipt contact ${
            payment.invoice
              .branch
              ?.supportPhone ||
            "-"
          } | ${
            payment.invoice
              .branch
              ?.supportEmail ||
            "-"
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

      const barY =
        footerStartY + 14;

      const barHeight = 22;

      const barLeft = 40;

      const barRight = 555;

      const barWidth =
        barRight - barLeft;

      doc
        .rect(
          barLeft,
          barY,
          barWidth,
          barHeight
        )
        .fill("#e0e0e0");

      doc
        .fillColor("black")
        .fontSize(9)
        .text(
          "Thank You For Your Payment!",
          barLeft,
          barY + 7,
          {
            align: "center",
            width: barWidth,
          }
        );

      // =====================================================
      // DECORATIVE SCALLOPS
      // =====================================================

      const scallopWidth = 6;

      const scallopHeight = 4;

      const scallopCount =
        Math.floor(
          barWidth /
            scallopWidth
        );

      doc.fillColor("white");

      // TOP

      for (
        let i = 0;
        i < scallopCount;
        i++
      ) {
        const x =
          barLeft +
          i * scallopWidth;

        doc
          .polygon(
            [x, barY],
            [
              x +
                scallopWidth /
                  2,
              barY +
                scallopHeight,
            ],
            [
              x +
                scallopWidth,
              barY,
            ]
          )
          .fill();
      }

      // BOTTOM

      for (
        let i = 0;
        i < scallopCount;
        i++
      ) {
        const x =
          barLeft +
          i * scallopWidth;

        doc
          .polygon(
            [
              x,
              barY +
                barHeight,
            ],
            [
              x +
                scallopWidth /
                  2,
              barY +
                barHeight -
                scallopHeight,
            ],
            [
              x +
                scallopWidth,
              barY +
                barHeight,
            ]
          )
          .fill();
      }

      // =====================================================
      // FINAL NOTE
      // =====================================================

      doc
        .fillColor("black")
        .fontSize(7)
        .text(
          "This is a computer generated receipt. No signature required.",
          40,
          barY + 30,
          {
            align: "center",
            width: 515,
          }
        );

      doc.end();
    }
  );
}