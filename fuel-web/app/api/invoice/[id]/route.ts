import { prisma } from "@/prisma";

import { NextRequest } from "next/server";

import PDFDocument from "pdfkit";

import path from "path";
import fs from "fs";

import {
  calculateGSTBreakdown,
  paiseToRupees,
  formatDate,
} from "@/app/utils/helper";

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
  const { id: invoiceId } =
    await params;

  // =====================================================
  // INVOICE
  // =====================================================

  const invoice =
    await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },

      include: {
        member: true,

        branch: true,

        package: {
          include: {
            service: true,
          },
        },

        payments: {
          orderBy: {
            createdAt: "asc",
          },
        },

        subscription: true,
      },
    });

  if (!invoice) {
    return new Response(
      "Invoice not found",
      {
        status: 404,
      }
    );
  }

  // =====================================================
  // GST
  // =====================================================

  // Calculate GST based on finalAmount (after discount)
  const taxableAmount =
  paiseToRupees(
    invoice.packageAmount -
    invoice.discountAmount -
    (invoice.referralDiscountAmount || 0)
  );

  const {
    baseFee,
    cgst,
    sgst,
    totalTax,
    cgstPercentage,
    sgstPercentage,
  } = await calculateGSTBreakdown(
    taxableAmount
  );
  
  const invoiceTotal =
  Math.round(
    (Number(taxableAmount) +
      Number(totalTax)) *
      100
  ) / 100;

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

              "Content-Disposition": `attachment; filename=${invoice.invoiceNumber}.pdf`,
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

        doc.opacity(1);

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
        .text(
          "TAX INVOICE",
          0,
          50,
          {
            align: "center",
          }
        );

      // =====================================================
      // COMPANY
      // =====================================================
// =====================================================
// RIGHT SIDE GYM DETAILS
// =====================================================

const rightX = 400;
let rightY = 52;

doc
  .fontSize(10)
  .text(
    "FUEL GYM PRIVATE LIMITED",
    rightX,
    rightY,
    {
      width: 170,
      align: "right",
    }
  );

rightY += 16;

doc
  .fontSize(9)
  .text(
    `Branch : ${invoice.branchName}`,
    rightX,
    rightY,
    {
      width: 170,
      align: "right",
    }
  );

rightY += 14;

doc.text(
  `GSTIN : ${
    invoice.branch?.gstNumber || "-"
  }`,
  rightX,
  rightY,
  {
    width: 170,
    align: "right",
  }
);

rightY += 14;

doc.text(
  invoice.branch?.address || "-",
  rightX,
  rightY,
  {
    width: 170,
    align: "right",
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
      // CUSTOMER
      // =====================================================

      doc.fontSize(9);

      // LEFT

      doc.text(
        `Customer : ${invoice.memberName}`,
        40,
        130
      );

      doc.text(
        `Phone : ${invoice.memberPhone}`,
        40,
        143
      );

      doc.text(
        `Email : ${
          invoice.memberEmail ||
          "-"
        }`,
        40,
        156
      );

      doc.text(
        `Address : ${
          invoice.member
            ?.address || "-"
        }`,
        40,
        169,
        {
          width: 240,
          height: 24,
        }
      );

      // RIGHT

      doc.text(
        `Invoice No : ${invoice.invoiceNumber}`,
        360,
        130
      );

      doc.text(
        `Invoice Date : ${formatDate(
          invoice.createdAt
        )}`,
        360,
        143
      );

      doc.text(
        `Sales Rep : ${
          invoice.salesRepName ||
          "-"
        }`,
        360,
        156
      );

      // =====================================================
      // SERVICE TABLE
      // =====================================================

      const tableTop = 200;

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
// =====================================================
// SERVICE DESCRIPTION
// =====================================================

const rowY = tableTop + 25;

const membershipDescription = `${invoice.serviceName} - ${invoice.packageName}
Service Fee for ${invoice.packageName} Membership
Period: ${invoice.subscription?.startDate ? formatDate(invoice.subscription.startDate) : "-"} To ${invoice.subscription?.endDate ? formatDate(invoice.subscription.endDate) : "-"}`;

doc
  .fontSize(8.5)
  .fillColor("black")
  .text(
    membershipDescription,
    50,
    rowY,
    {
      width: 300,
      lineGap: 1,
    }
  );

// =====================================================
// RIGHT SIDE INVOICE INFO
// =====================================================

 

// =====================================================
// SERVICE AMOUNT RIGHT ALIGN
// =====================================================


      // =====================================================
      // GST BREAKDOWN IN SERVICE AMOUNT COLUMN
      // =====================================================

      const amountY = rowY;

      doc
        .fontSize(8)
        .text(
          `Base Fee: ₹${baseFee}`,
          440,
          amountY,
          {
            width: 100,
            lineGap: 1,
          }
        )
        .text(
          `CGST(${cgstPercentage}%): ₹${cgst.toFixed(2)}`,
          440,
          amountY + 12,
          {
            width: 100,
            lineGap: 1,
          }
        )
        .text(
          `SGST(${sgstPercentage}%): ₹${sgst.toFixed(2)}`,
          440,
          amountY + 24,
          {
            width: 100,
            lineGap: 1,
          }
        )
        .text(
          `Tax: ₹${totalTax.toFixed(2)}`,
          440,
          amountY + 36,
          {
            width: 100,
            lineGap: 1,
          }
        );

      // =====================================================
      // TOTALS TABLE
      // =====================================================

      const totalsY = rowY + 60;

      const drawRow = (
        label: string,
        value: string,
        y: number
      ) => {
        doc
          .rect(360, y, 195, 18)
          .stroke();
      
        doc
          .fontSize(7.5)
          .fillColor("black");
      
        doc.text(
          label,
          365,
          y + 5
        );
      
        doc.text(
          value,
          440,
          y + 5,
          {
            width: 105,
            align: "right",
          }
        );
      };

      drawRow(
        "Package Amount",
        `₹${paiseToRupees(invoice.packageAmount)}`,
        totalsY
      );

      drawRow(
        "Discount",
        `-₹${paiseToRupees(invoice.discountAmount)}`,
        totalsY + 18
      );
      
      drawRow(
        "Referral Reward",
        `-₹${paiseToRupees(invoice.referralDiscountAmount || 0)}`,
        totalsY + 36
      );
      
      drawRow(
        "Taxable Amount",
        `₹${taxableAmount}`,
        totalsY + 54
      );
      
      drawRow(
        "CGST + SGST",
        `₹${totalTax.toFixed(2)}`,
        totalsY + 72
      );

      doc
  .rect(
    360,  
    totalsY + 90,
    195,
    20
  )
  .fill("#f3f4f6");

doc
  .fillColor("black")
  .fontSize(8.5)
  .font(fontPath)
  .text(
    "Grand Total",
    365,
    totalsY + 96
  )
  .text(
    `₹${invoiceTotal.toFixed(2)}`,
    480,
    totalsY + 96
  );

      // =====================================================
      // BILL SUMMARY
      // =====================================================

      const summaryY =
        totalsY + 125;

      doc
        .fontSize(9)
        .font(fontPath)
        .text(
          "Billing Summary",
          40,
          summaryY
        );

      doc
        .fontSize(8)
        .text(
          `Package Amount : ₹ ${paiseToRupees(invoice.packageAmount)}`,
          40,
          summaryY + 16
        )
        .text(
          `Discount : ₹ ${paiseToRupees(invoice.discountAmount)}`,
          40,
          summaryY + 29
        )
        .text(
          `Referral Reward : ₹ ${paiseToRupees(invoice.referralDiscountAmount || 0)}`,
          40,
          summaryY + 42
        )
        .text(
          `Taxable Amount : ₹ ${taxableAmount}`,
          40,
          summaryY + 55
        )
        .text(
          `GST : ₹ ${totalTax.toFixed(2)}`,
          40,
          summaryY + 68
        )
        .text(
          `Grand Total : ₹ ${invoiceTotal.toFixed(2)}`,
          40,
          summaryY + 81
        )
        .text(
          `Paid Amount : ₹ ${paiseToRupees(invoice.paidAmount)}`,
          40,
          summaryY + 94
        )
        .text(
          `Balance : ₹ ${paiseToRupees(invoice.balanceAmount)}`,
          40,
          summaryY + 107
        );
       

      // =====================================================
      // PAYMENT HISTORY
      // =====================================================

      const paymentY =
      summaryY + 130;

      doc
        .fontSize(9)
        .text(
          "Payment History",
          40,
          paymentY
        );

      let currentY =
        paymentY + 15;

      if (invoice.payments.length > 0) {
        invoice.payments
          .slice(0, 3)
          .forEach((payment) => {
            doc
              .fontSize(7.5)
              .text(
                `${payment.paymentMode} • ₹${paiseToRupees(
                  payment.amount
                )} • ${formatDate(
                  payment.createdAt
                )}`,
                50,
                currentY
              );

            currentY += 12;
          });
      } else {
        doc
          .fontSize(7.5)
          .text(
            "No payments recorded",
            50,
            currentY
          );
        currentY += 12;
      }

      // =====================================================
      // TERMS
      // =====================================================

      const termsY =
        currentY + 8;

      doc
        .rect(
          40,
          termsY,
          515,
          16
        )
        .fill("#e5e5e5");

      doc
        .fillColor("black")
        .fontSize(8)
        .text(
          "TERMS & CONDITIONS",
          50,
          termsY + 4
        );

      const terms =
        (
          invoice.branch
            ?.terms ||
          "Standard terms apply."
        ).slice(0, 180);

      doc
        .fontSize(6.5)
        .text(
          terms,
          45,
          termsY + 20,
          {
            width: 505,
            align: "justify",
          }
        );

      // =====================================================
      // SIGNATURES
      // =====================================================

      const sigY =
        termsY + 45;

      doc
        .fontSize(7.5)

        .text(
          "Signature of member",
          40,
          sigY
        )

        .text(
          "For FUEL GYM PRIVATE LIMITED",
          370,
          sigY
        );

      doc.text(
        invoice.memberName,
        40,
        sigY + 18
      );

      doc.text(
        "Authorised Signatory",
        370,
        sigY + 18
      );

      // =====================================================
      // FOOTER CONTACT
      // =====================================================

      const footerStartY =
        sigY + 40;

      doc
        .fontSize(6.5)
        .text(
          `Questions? Contact: ${invoice.branch?.supportPhone || "-"} | ${invoice.branch?.supportEmail || "-"}`,
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
        footerStartY + 12;

      const barHeight = 20;

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
        .fontSize(8)
        .text(
          "Thank You For Your Business!",
          barLeft,
          barY + 6,
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
        .fontSize(6)
        .text(
          "This is a computer generated invoice. No signature required.",
          40,
          barY + 26,
          {
            align: "center",
            width: 515,
          }
        );

      doc.end();
    }
  );
}