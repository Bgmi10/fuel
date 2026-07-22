import {
    Prisma,
    ReferralRewardType,
  } from "@prisma/client";
  
  import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { prisma } from "@/prisma";
  
  type GroupDiscountRule = {
    minMembers: number;
    maxMembers: number;
    discountPercentage: number;
  };
  
  const validReferralTypes =
    new Set<string>([
      "FIXED_AMOUNT",
      "PERCENTAGE_DISCOUNT",
      "MEMBERSHIP_DAYS",
    ]);
  
  function normalizeRules(
    value: unknown
  ): GroupDiscountRule[] | null {
    if (!Array.isArray(value)) return null;
  
    const rules: GroupDiscountRule[] = [];
  
    for (const item of value) {
      if (!item || typeof item !== "object") {
        return null;
      }
  
      const rule = item as Record<string, unknown>;
  
      const minMembers = Number(rule.minMembers);
      const maxMembers = Number(rule.maxMembers);
      const discountPercentage = Number(
        rule.discountPercentage
      );
  
      if (
        !Number.isInteger(minMembers) ||
        !Number.isInteger(maxMembers) ||
        !Number.isFinite(discountPercentage)
      ) {
        return null;
      }
  
      rules.push({
        minMembers,
        maxMembers,
        discountPercentage,
      });
    }
  
    return rules.sort(
      (a, b) => a.minMembers - b.minMembers
    );
  }
  
  function validateRules({
    enabled,
    maxMembers,
    rules,
  }: {
    enabled: boolean;
    maxMembers: number;
    rules: GroupDiscountRule[];
  }): string | null {
    if (
      !Number.isInteger(maxMembers) ||
      maxMembers < 2 ||
      maxMembers > 10
    ) {
      return "Maximum group members must be between 2 and 10.";
    }
  
    if (enabled && rules.length === 0) {
      return "At least one group discount rule is required.";
    }
  
    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index];
      const previous = rules[index - 1];
  
      if (rule.minMembers < 2) {
        return "Group rules must start from at least 2 members.";
      }
  
      if (rule.maxMembers < rule.minMembers) {
        return "Maximum members cannot be lower than minimum members.";
      }
  
      if (rule.maxMembers > maxMembers) {
        return `A rule cannot exceed ${maxMembers} members.`;
      }
  
      if (
        rule.discountPercentage <= 0 ||
        rule.discountPercentage > 100
      ) {
        return "Discount percentage must be greater than 0 and no more than 100.";
      }
  
      if (previous && rule.minMembers <= previous.maxMembers) {
        return "Group discount ranges cannot overlap.";
      }
    }
  
    return null;
  }
  
  function optionalNumber(value: unknown): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }
  
    return Number(value);
  }
  
  export const PUT = async (
    req: NextRequest,
    {
      params,
    }: {
      params: Promise<{
        id: string;
      }>;
    }
  ) => {
    const { id } = await params;
  
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Setting ID is required.",
        },
        {
          status: 400,
        }
      );
    }
  
    try {
      const currentSetting =
        await prisma.setting.findUnique({
          where: {
            id,
          },
        });
  
      if (!currentSetting) {
        return NextResponse.json(
          {
            success: false,
            message: "Settings not found.",
          },
          {
            status: 404,
          }
        );
      }
  
      const body = await req.json();
  
      const {
        cgstPercentage,
        sgstPercentage,
        referralRewardAmount,
        referralRewardPercentage,
        referralMembershipDays,
        referralRewardType,
        groupJoiningEnabled,
        groupJoiningMaxMembers,
        groupDiscountRules,
      } = body;
  
      const updateData: Prisma.SettingUpdateInput = {};
  
      if (cgstPercentage !== undefined) {
        const value = Number(cgstPercentage);
  
        if (
          !Number.isFinite(value) ||
          value < 0 ||
          value > 100
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "CGST percentage must be between 0 and 100.",
            },
            {
              status: 400,
            }
          );
        }
  
        updateData.cgstPercentage = value;
      }
  
      if (sgstPercentage !== undefined) {
        const value = Number(sgstPercentage);
  
        if (
          !Number.isFinite(value) ||
          value < 0 ||
          value > 100
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "SGST percentage must be between 0 and 100.",
            },
            {
              status: 400,
            }
          );
        }
  
        updateData.sgstPercentage = value;
      }
  
      if (referralRewardType !== undefined) {
        if (!validReferralTypes.has(referralRewardType)) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid referral reward type.",
            },
            {
              status: 400,
            }
          );
        }
  
        updateData.referralRewardType =
          referralRewardType as ReferralRewardType;
      }
  
      if (referralRewardAmount !== undefined) {
        const value = optionalNumber(referralRewardAmount);
  
        if (
          value !== null &&
          (!Number.isFinite(value) || value < 0)
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Referral reward amount cannot be negative.",
            },
            {
              status: 400,
            }
          );
        }
  
        updateData.referralRewardAmount =
          value === null ? null : Math.round(value * 100);
      }
  
      if (referralRewardPercentage !== undefined) {
        const value = optionalNumber(
          referralRewardPercentage
        );
  
        if (
          value !== null &&
          (!Number.isFinite(value) ||
            value < 0 ||
            value > 100)
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Referral discount percentage must be between 0 and 100.",
            },
            {
              status: 400,
            }
          );
        }
  
        updateData.referralRewardPercentage = value;
      }
  
      if (referralMembershipDays !== undefined) {
        const value = optionalNumber(
          referralMembershipDays
        );
  
        if (
          value !== null &&
          (!Number.isInteger(value) || value < 1)
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Referral membership days must be a positive whole number.",
            },
            {
              status: 400,
            }
          );
        }
  
        updateData.referralMembershipDays = value;
      }
  
      const finalEnabled =
        groupJoiningEnabled !== undefined
          ? Boolean(groupJoiningEnabled)
          : currentSetting.groupJoiningEnabled;
  
      const finalMaxMembers =
        groupJoiningMaxMembers !== undefined
          ? Number(groupJoiningMaxMembers)
          : currentSetting.groupJoiningMaxMembers;
  
      const currentRules =
        normalizeRules(
          currentSetting.groupDiscountRules
        ) || [];
  
      const finalRules =
        groupDiscountRules !== undefined
          ? normalizeRules(groupDiscountRules)
          : currentRules;
  
      if (!finalRules) {
        return NextResponse.json(
          {
            success: false,
            message: "Group discount rules are invalid.",
          },
          {
            status: 400,
          }
        );
      }
  
      const validationError = validateRules({
        enabled: finalEnabled,
        maxMembers: finalMaxMembers,
        rules: finalRules,
      });
  
      if (validationError) {
        return NextResponse.json(
          {
            success: false,
            message: validationError,
          },
          {
            status: 400,
          }
        );
      }
  
      updateData.groupJoiningEnabled = finalEnabled;
      updateData.groupJoiningMaxMembers = finalMaxMembers;
      updateData.groupDiscountRules =
        finalRules as Prisma.InputJsonValue;
  
      const updatedSetting =
        await prisma.setting.update({
          where: {
            id,
          },
          data: updateData,
        });
  
      return NextResponse.json({
        success: true,
        setting: updatedSetting,
      });
    } catch (error) {
      console.error("Update settings error:", error);
  
      return NextResponse.json(
        {
          success: false,
          message: "Unable to update settings.",
        },
        {
          status: 500,
        }
      );
    }
  };