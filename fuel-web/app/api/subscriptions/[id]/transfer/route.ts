import { getUserFromRequest } from "@/app/utils/auth";
import {
  calculateMembershipTransferQuote,
} from "@/src/lib/membership-transfer-fee";
import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import {
  NextRequest,
  NextResponse,
} from "next/server";

class TransferError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TransferError";
    this.status = status;
  }
}

type RequestBody = {
  toMemberId?: string;
  reason?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const allowedTransferRoles = new Set([
  "ADMIN",
  "MANAGER",
  "STAFF",
]);

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: subscriptionId } =
      await context.params;

    const user =
      await getUserFromRequest(request);

    if (!user?.id) {
      throw new TransferError(
        "You must be logged in to transfer a membership.",
        401
      );
    }

    if (
      user.role &&
      !allowedTransferRoles.has(user.role)
    ) {
      throw new TransferError(
        "You do not have permission to transfer memberships.",
        403
      );
    }

    if (!subscriptionId) {
      throw new TransferError(
        "Subscription ID is required."
      );
    }

    const body =
      (await request.json()) as RequestBody;

    const toMemberId =
      body.toMemberId?.trim();

    const reason =
      body.reason?.trim();

    if (!toMemberId) {
      throw new TransferError(
        "Please select the receiving member."
      );
    }

    if (!reason) {
      throw new TransferError(
        "Please enter the reason for the transfer."
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const subscription =
          await tx.subscription.findUnique({
            where: {
              id: subscriptionId,
            },

            select: {
              id: true,
              memberId: true,
              status: true,
              invoiceId: true,

              member: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
          });

        if (!subscription) {
          throw new TransferError(
            "Subscription was not found.",
            404
          );
        }

        if (
          subscription.status !== "ACTIVE" &&
          subscription.status !== "FROZEN"
        ) {
          throw new TransferError(
            "Only active or frozen memberships can be transferred."
          );
        }

        if (
          subscription.memberId === toMemberId
        ) {
          throw new TransferError(
            "The membership already belongs to the selected member."
          );
        }

        const receivingMember =
          await tx.member.findUnique({
            where: {
              id: toMemberId,
            },

            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              status: true,
            },
          });

        if (!receivingMember) {
          throw new TransferError(
            "The receiving member was not found.",
            404
          );
        }

        if (
          receivingMember.status !== "ACTIVE"
        ) {
          throw new TransferError(
            "A blocked member cannot receive a membership."
          );
        }

        /*
         * Calculate the fee using the subscription
         * and central settings inside this transaction.
         *
         * Never trust a fee provided by the frontend.
         */
        let quote;

        try {
          quote =
            await calculateMembershipTransferQuote(
              subscriptionId,
              tx
            );
        } catch (error) {
          throw new TransferError(
            error instanceof Error
              ? error.message
              : "Unable to calculate the membership transfer fee."
          );
        }

        const fromMemberId =
          subscription.memberId;

        /*
         * Update only if the subscription still
         * belongs to the same member.
         *
         * This prevents concurrent transfers.
         */
        const subscriptionUpdate =
          await tx.subscription.updateMany({
            where: {
              id: subscriptionId,
              memberId: fromMemberId,

              status: {
                in: [
                  "ACTIVE",
                  "FROZEN",
                ],
              },
            },

            data: {
              memberId:
                receivingMember.id,
            },
          });

        if (
          subscriptionUpdate.count !== 1
        ) {
          throw new TransferError(
            "This membership was already changed by another admin. Please refresh and try again.",
            409
          );
        }

        /*
         * Transfer the original invoice and
         * payment ownership.
         */
        if (subscription.invoiceId) {
          await tx.invoice.update({
            where: {
              id: subscription.invoiceId,
            },

            data: {
              memberId:
                receivingMember.id,

              memberName:
                receivingMember.name,

              memberPhone:
                receivingMember.phone,

              memberEmail:
                receivingMember.email,
            },
          });

          await tx.payment.updateMany({
            where: {
              invoiceId:
                subscription.invoiceId,
            },

            data: {
              memberId:
                receivingMember.id,
            },
          });
        }

        /*
         * Store the complete transfer-fee snapshot.
         *
         * Future changes to central settings will not
         * affect this historical transfer record.
         */
        const transfer =
          await tx.membershipTransfer.create({
            data: {
              subscriptionId,

              fromMemberId,

              toMemberId:
                receivingMember.id,

              reason,

              remainingDays:
                quote.remainingDays,

              feeSlabId:
                quote.slab.id,

              feeSlabLabel:
                quote.slab.label,

              feeSlabMinDays:
                quote.slab.minDays,

              feeSlabMaxDays:
                quote.slab.maxDays,

              baseTransferFee:
                quote.baseTransferFee,

              cgstPercentage:
                quote.cgstPercentage,

              sgstPercentage:
                quote.sgstPercentage,

              cgstAmount:
                quote.cgstAmount,

              sgstAmount:
                quote.sgstAmount,

              transferFee:
                quote.transferFee,

              transferredById:
                user.id,
            },
          });

        return {
          transferId:
            transfer.id,

          subscriptionId,

          fromMember: {
            id: subscription.member.id,
            name: subscription.member.name,
            phone:
              subscription.member.phone,
          },

          toMember: {
            id: receivingMember.id,
            name: receivingMember.name,
            phone:
              receivingMember.phone,
          },

          reason,

          fee: {
            remainingDays:
              quote.remainingDays,

            slab: quote.slab,

            baseTransferFee:
              quote.baseTransferFee,

            cgstPercentage:
              quote.cgstPercentage,

            sgstPercentage:
              quote.sgstPercentage,

            cgstAmount:
              quote.cgstAmount,

            sgstAmount:
              quote.sgstAmount,

            transferFee:
              quote.transferFee,
          },
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel
            .Serializable,

        timeout: 20_000,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Membership transferred successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Membership transfer failed:",
      error
    );

    if (error instanceof TransferError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: error.status,
        }
      );
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The membership was changed by another request. Please refresh and try again.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to transfer the membership. No records were changed.",
      },
      {
        status: 500,
      }
    );
  }
}