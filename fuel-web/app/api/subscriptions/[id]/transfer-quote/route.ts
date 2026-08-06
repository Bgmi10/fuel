// app/api/subscriptions/[subscriptionId]/transfer-quote/route.ts

import { calculateMembershipTransferQuote } from "@/src/lib/membership-transfer-fee";
import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  
  export const GET = async (
    _request: NextRequest,
    {
      params,
    }: {
      params: Promise<{
        id: string;
      }>;
    }
  ) => {
    try {
      const { id: subscriptionId } =
        await params;
  
      if (!subscriptionId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Subscription ID is required.",
          },
          {
            status: 400,
          }
        );
      }
  
      /*
       * Add your existing Admin
       * authentication check here.
       */
  
      const quote =
        await calculateMembershipTransferQuote(
          subscriptionId
        );
  
      return NextResponse.json({
        success: true,
        quote,
      });
    } catch (error) {
      console.error(
        "Calculate membership transfer quote error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Unable to calculate the membership transfer fee.",
        },
        {
          status: 400,
        }
      );
    }
  };