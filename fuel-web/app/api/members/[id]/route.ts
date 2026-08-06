import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const PUT = async (req: NextRequest, { params }: { params: Promise<{ id: string }>}) => {
   const { name, email, phone, branchId, status, gender, dob, address, emergencyContact, profileImage, height, weight, age, onBoardingForm, onBoardCompleted } = await req.json();
   const { id } = await params;

   const updateData: Prisma.MemberUpdateInput = {};

   if (gender !== undefined) {
    updateData.gender = gender;
   }

   if (onBoardCompleted !== undefined) {
    updateData.onBoardCompleted = onBoardCompleted;
   }

   if (onBoardingForm !== undefined) {
    updateData.onBoardingForm = onBoardingForm;
   }

   
   if (weight !== undefined) {
    updateData.weight = parseFloat(weight);
   }
   
   if (height !== undefined) {
    updateData.height = parseFloat(height);
   }
   
   if (age !== undefined) {
    updateData.age = Number(age);
   }
   if (dob !== undefined) {
    updateData.dob = dob;
   }

   if (address !== undefined) {
    updateData.address = address
   }

   if (emergencyContact !== undefined) {
    updateData.emergencyContact = emergencyContact;
   }

   if (profileImage !== undefined) {
    updateData.profileImage = profileImage;
   }

   if (name !== undefined) {
    updateData.name = name;
   };

   if (email !== undefined) {
     updateData.email = email;
   }

   if (phone !== undefined) {
    updateData.phone = phone;
   }

   if (branchId !== undefined) {
    updateData.branch = branchId
      ? { connect: { id: branchId } }
      : { disconnect: true };
  }

   if (status !== undefined) {
    updateData.status = status;
   }

   try {
     await prisma.member.update({
        where: { id },
        data: updateData
     })

     return NextResponse.json({ success: true });
   } catch (e) {
    console.log(e)
     return NextResponse.json({ success: false });
   }
}

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  try {
    const member = await prisma.member.findUnique({
      where: { id },

      include: {
        referrals: {
          include: {
            referredMember: true
          }
        },
        branch: true,
        fitnessAssessments: true,
        // 🔥 INVOICES
        invoices: {
          orderBy: {
            createdAt: "desc",
          },

          include: {
            package: {
              include: {
                service: true,
              },
            },

            payments: {
              orderBy: {
                createdAt: "desc",
              },
            },

            salesRep: true,

            subscription: {
              include: {
                branch: true,

                package: {
                  include: {
                    service: true,
                  },
                },
              },
            },
          },
        },

        // 🔥 PAYMENTS
        payments: {
          orderBy: {
            createdAt: "desc",
          },

          include: {
            invoice: {
              include: {
                package: {
                  include: {
                    service: true,
                  },
                },
              },
            },
          },
        },
        

        // 🔥 SUBSCRIPTIONS
        subscriptions: {
          orderBy: {
            createdAt: "desc",
          },
        
          include: {
            branch: true,
        
            package: {
              include: {
                service: true,
              },
            },
        
            invoice: {
              include: {
                payments: {
                  orderBy: {
                    createdAt: "desc",
                  },
                },
              },
            },
        
            membershipTransfers: {
              where: {
                toMemberId: id,
              },
        
              orderBy: {
                createdAt: "desc",
              },
        
              take: 1,
        
              select: {
                id: true,
        
                subscriptionId: true,
        
                fromMemberId: true,
                toMemberId: true,
        
                reason: true,
        
                remainingDays: true,
        
                feeSlabId: true,
                feeSlabLabel: true,
                feeSlabMinDays: true,
                feeSlabMaxDays: true,
        
                baseTransferFee: true,
        
                cgstPercentage: true,
                sgstPercentage: true,
        
                cgstAmount: true,
                sgstAmount: true,
        
                transferFee: true,
        
                transferredById: true,
                createdAt: true,
        
                fromMember: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                  },
                },
        
                transferredBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({
        success: false,
        message: "Member not found",
      });
    }

    // 🔥 ONLY ACTIVE/FROZEN
    const activeSubscriptions =
      member.subscriptions.filter(
        (s) =>
          s.status === "ACTIVE" ||
          s.status === "FROZEN"
      );

    // 🔥 TOTAL BILLING
    const totalBilling =
      member.invoices.reduce((acc, invoice) => {
        return acc + invoice.finalAmount;
      }, 0);

    // 🔥 TOTAL COLLECTED
    const totalCollected =
      member.payments
        .filter((p) => p.status === "PAID")
        .reduce((acc, payment) => {
          return acc + payment.amount;
        }, 0);

    // 🔥 TOTAL PENDING
    const totalPending =
      member.invoices.reduce((acc, invoice) => {
        return acc + invoice.balanceAmount;
      }, 0);

    return NextResponse.json({
      success: true,

      member,

      activeSubscriptions,

      stats: {
        totalInvoices:
          member.invoices.length,

        totalSubscriptions:
          member.subscriptions.length,

        totalPayments:
          member.payments.length,

        totalBilling,

        totalCollected,

        totalPending,

        activeMemberships:
          activeSubscriptions.length,
      },
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json({
      success: false,
      message: "Something went wrong",
    });
  }
};