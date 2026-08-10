"use client";

import {
  Branch,
  Coupon,
  Service,
  ServicePackage,
} from "@prisma/client";

import {
  useSearchParams,
} from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Props = {
  open: boolean;
  setOpen: (value: boolean) => void;

  service: Service & {
    branches: Branch[];
  };

  selectedPackage: ServicePackage;
};

type GroupDiscountApplicability = {
  serviceId: string;
  packageIds: string[];
};

type MemberForm = {
  name: string;
  phone: string;
  email: string;
};

type GroupDiscountRule = {
  minMembers: number;
  maxMembers: number;
  discountPercentage: number;
};

type CheckoutSettings = {
  cgstPercentage: number;
  sgstPercentage: number;

  groupJoiningEnabled: boolean;

  groupJoiningMaxMembers: number;

  groupDiscountRules:
    GroupDiscountRule[];

  groupDiscountApplicability:
    GroupDiscountApplicability[];
};

type PublicCoupon = Coupon & {
  packages?: Array<{
    id: string;
  }>;
};

type ActiveGroupMember = {
  memberId?: string;
  name: string;
  phone: string;
  endDate?: string;
  currentEndDate?: string;
};

const EMPTY_MEMBER: MemberForm = {
  name: "",
  phone: "",
  email: "",
};

const PHONE_REGEX =
  /^[6-9]\d{9}$/;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  const parseGroupDiscountApplicability = (
    value: unknown
  ): GroupDiscountApplicability[] => {
    if (!Array.isArray(value)) {
      return [];
    }
  
    return value
      .map((item) => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return null;
        }
  
        const entry =
          item as Record<
            string,
            unknown
          >;
  
        const serviceId =
          typeof entry.serviceId ===
          "string"
            ? entry.serviceId.trim()
            : "";
  
        const packageIds =
          Array.isArray(
            entry.packageIds
          )
            ? entry.packageIds
                .map((id) =>
                  String(id).trim()
                )
                .filter(Boolean)
            : [];
  
        if (!serviceId) {
          return null;
        }
  
        return {
          serviceId,
  
          packageIds: [
            ...new Set(packageIds),
          ],
        };
      })
      .filter(
        (
          item
        ): item is GroupDiscountApplicability =>
          item !== null
      );
  };

const parseGroupRules = (
  value: unknown
): GroupDiscountRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return null;
      }

      const rule =
        item as Record<
          string,
          unknown
        >;

      const minMembers =
        Number(rule.minMembers);

      const maxMembers =
        Number(rule.maxMembers);

      const discountPercentage =
        Number(
          rule.discountPercentage
        );

      if (
        !Number.isInteger(
          minMembers
        ) ||
        !Number.isInteger(
          maxMembers
        ) ||
        !Number.isFinite(
          discountPercentage
        )
      ) {
        return null;
      }

      return {
        minMembers,
        maxMembers,
        discountPercentage,
      };
    })
    .filter(
      (
        rule
      ): rule is GroupDiscountRule =>
        rule !== null
    )
    .sort(
      (a, b) =>
        a.minMembers -
        b.minMembers
    );
};

const formatMoney = (
  amountInPaise: number
) => {
  return (
    amountInPaise / 100
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
};

export const SubscribeModal = ({
  open,
  setOpen,
  service,
  selectedPackage,
}: Props) => {
  const searchParams =
    useSearchParams();

  const ref =
    searchParams.get("ref");

  const branches =
    service.branches || [];


  const [
    form,
    setForm,
  ] = useState({
    name: "",
    phone: "",
    email: "",
    branchId: "",
  });

  const [
    groupMembers,
    setGroupMembers,
  ] = useState<MemberForm[]>([]);

  const [
    settings,
    setSettings,
  ] =
    useState<CheckoutSettings>({
      cgstPercentage: 2.5,
      sgstPercentage: 2.5,
  
      groupJoiningEnabled:
        false,
  
      groupJoiningMaxMembers:
        10,
  
      groupDiscountRules: [],
  
      groupDiscountApplicability:
        [],
    });

  const [
    settingsLoading,
    setSettingsLoading,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    extendModal,
    setExtendModal,
  ] = useState(false);

  const [
    groupExtendMembers,
    setGroupExtendMembers,
  ] = useState<
    ActiveGroupMember[]
  >([]);

  const [
    couponLoading,
    setCouponLoading,
  ] =
    useState<string | null>(
      null
    );

  const [
    appliedCoupons,
    setAppliedCoupons,
  ] =
    useState<PublicCoupon[]>(
      []
    );

  const [
    availableCoupons,
    setAvailableCoupons,
  ] =
    useState<PublicCoupon[]>(
      []
    );

  const [
    couponError,
    setCouponError,
  ] = useState("");

  /*
   * Auto-select the first branch.
   */
  useEffect(() => {
    if (
      branches.length > 0 &&
      !form.branchId
    ) {
      setForm(
        (current) => ({
          ...current,

          branchId:
            branches[0].id,
        })
      );
    }
  }, [
    branches,
    form.branchId,
  ]);

  /*
   * Load coupons and public checkout
   * settings whenever the modal opens.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const fetchCoupons =
      async () => {
        try {
          const response =
            await fetch(
              "/api/coupons",
              {
                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (
            data.success &&
            Array.isArray(
              data.coupons
            )
          ) {
            const now =
              new Date();

            const validCoupons =
              data.coupons.filter(
                (
                  coupon:
                    PublicCoupon
                ) => {
                  if (
                    coupon.isPrivate
                  ) {
                    return false;
                  }

                  if (
                    coupon.expiresAt &&
                    new Date(
                      coupon.expiresAt
                    ) < now
                  ) {
                    return false;
                  }

                  if (
                    coupon.usageLimit &&
                    coupon.usedCount >=
                      coupon.usageLimit
                  ) {
                    return false;
                  }

                  return true;
                }
              );

            setAvailableCoupons(
              validCoupons
            );
          }
        } catch (error) {
          console.error(
            "Failed to fetch coupons:",
            error
          );
        }
      };

    const fetchSettings =
      async () => {
        try {
          setSettingsLoading(
            true
          );

          const response =
            await fetch(
              "/api/settings",
              {
                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (
            data.success &&
            data.setting
          ) {
            const configuredMaximum =
              Number(
                data.setting
                  .groupJoiningMaxMembers
              );

            const safeMaximum =
              Number.isInteger(
                configuredMaximum
              )
                ? Math.min(
                    10,
                    Math.max(
                      2,
                      configuredMaximum
                    )
                  )
                : 10;

            setSettings({
              cgstPercentage:
                Number(
                  data.setting
                    .cgstPercentage
                ) || 2.5,
                groupDiscountApplicability:
  parseGroupDiscountApplicability(
    data.setting
      .groupDiscountApplicability
  ),

              sgstPercentage:
                Number(
                  data.setting
                    .sgstPercentage
                ) || 2.5,

              groupJoiningEnabled:
                Boolean(
                  data.setting
                    .groupJoiningEnabled
                ),

              groupJoiningMaxMembers:
                safeMaximum,

              groupDiscountRules:
                parseGroupRules(
                  data.setting
                    .groupDiscountRules
                ),
            });
          }
        } catch (error) {
          console.error(
            "Failed to fetch settings:",
            error
          );
        } finally {
          setSettingsLoading(
            false
          );
        }
      };

    fetchCoupons();
    fetchSettings();
  }, [open]);


  const groupDiscountApplicable =
  useMemo(() => {
    if (
      !settings.groupJoiningEnabled ||
      settings.groupDiscountRules
        .length === 0
    ) {
      return false;
    }

    return settings
      .groupDiscountApplicability
      .some(
        (item) =>
          item.serviceId ===
            service.id &&
          item.packageIds.includes(
            selectedPackage.id
          )
      );
  }, [
    settings.groupJoiningEnabled,
    settings.groupDiscountRules,
    settings.groupDiscountApplicability,
    service.id,
    selectedPackage.id,
  ]);


  useEffect(() => {
    /*
     * A different package/service is a new
     * checkout context.
     *
     * Never carry group members or discounts
     * from the previous membership.
     */
    setGroupMembers([]);
  
    setAppliedCoupons([]);
  
    setCouponError("");
  
    setGroupExtendMembers([]);
  
    setExtendModal(false);
  }, [
    service.id,
    selectedPackage.id,
  ]);

  const maximumGroupDiscount =
  useMemo(() => {
    if (
      !groupDiscountApplicable
    ) {
      return 0;
    }

    return settings
      .groupDiscountRules
      .reduce(
        (
          maximum,
          rule
        ) =>
          Math.max(
            maximum,
            Number(
              rule.discountPercentage
            ) || 0
          ),

        0
      );
  }, [
    groupDiscountApplicable,
    settings.groupDiscountRules,
  ]);


 

  const selectedBranch =
    useMemo(() => {
      return branches.find(
        (branch) =>
          branch.id ===
          form.branchId
      );
    }, [
      branches,
      form.branchId,
    ]);

  const individualPhoneValid =
    useMemo(() => {
      return PHONE_REGEX.test(
        form.phone
      );
    }, [form.phone]);

  const individualEmailValid =
    useMemo(() => {
      return EMAIL_REGEX.test(
        form.email
      );
    }, [form.email]);

    const memberCount =
  1 + groupMembers.length;

  const isGroupCheckout =
  groupDiscountApplicable &&
  memberCount > 1;
  /*


   * Individual coupon discount.
   */
  const couponDiscountAmount =
    useMemo(() => {
      if (
        appliedCoupons.length ===
        0
      ) {
        return 0;
      }

      let totalDiscount = 0;

      let remainingAmount =
        Number(
          selectedPackage.price
        );

      for (
        const coupon of
        appliedCoupons
      ) {
        if (
          coupon.discountPercent
        ) {
          const discount =
            Math.round(
              remainingAmount *
                (
                  coupon.discountPercent /
                  100
                )
            );

          totalDiscount +=
            discount;

          remainingAmount -=
            discount;
        } else if (
          coupon.discountFlatAmount
        ) {
          const discount =
            Math.min(
              coupon
                .discountFlatAmount,

              remainingAmount
            );

          totalDiscount +=
            discount;

          remainingAmount -=
            discount;
        }
      }

      return totalDiscount;
    }, [
      appliedCoupons,
      selectedPackage.price,
    ]);

  const individualFinalPrice =
    Math.max(
      Number(
        selectedPackage.price
      ) -
        couponDiscountAmount,

      0
    );

  const individualCgst =
    Math.round(
      individualFinalPrice *
        (
          settings.cgstPercentage /
          100
        )
    );

  const individualSgst =
    Math.round(
      individualFinalPrice *
        (
          settings.sgstPercentage /
          100
        )
    );

  const individualTotalGst =
    individualCgst +
    individualSgst;

  const individualInvoiceTotal =
    individualFinalPrice +
    individualTotalGst;

  /*
   * Group pricing is derived entirely from
   * the admin-configured rule for the
   * currently selected member count.
   */

  const groupMemberCount =
  memberCount;

  const matchingGroupRule =
    useMemo(() => {
      return settings
        .groupDiscountRules
        .find(
          (rule) =>
            groupMemberCount >=
              rule.minMembers &&
            groupMemberCount <=
              rule.maxMembers
        );
    }, [
      settings
        .groupDiscountRules,
      groupMemberCount,
    ]);

  const groupDiscountPercentage =
    Number(
      matchingGroupRule
        ?.discountPercentage || 0
    );

  const groupDiscountPerMember =
    Math.round(
      Number(
        selectedPackage.price
      ) *
        (
          groupDiscountPercentage /
          100
        )
    );

  const groupFinalPricePerMember =
    Math.max(
      Number(
        selectedPackage.price
      ) -
        groupDiscountPerMember,

      0
    );

  const groupCgstPerMember =
    Math.round(
      groupFinalPricePerMember *
        (
          settings.cgstPercentage /
          100
        )
    );

  const groupSgstPerMember =
    Math.round(
      groupFinalPricePerMember *
        (
          settings.sgstPercentage /
          100
        )
    );

  const groupGstPerMember =
    groupCgstPerMember +
    groupSgstPerMember;

  const groupInvoicePerMember =
    groupFinalPricePerMember +
    groupGstPerMember;

  const groupPackageSubtotal =
    Number(
      selectedPackage.price
    ) *
    groupMemberCount;

  const groupTotalDiscount =
    groupDiscountPerMember *
    groupMemberCount;

  const groupTotalGst =
    groupGstPerMember *
    groupMemberCount;

  const groupInvoiceTotal =
    groupInvoicePerMember *
    groupMemberCount;
const displayedInvoiceTotal =
  isGroupCheckout
    ? groupInvoiceTotal
    : individualInvoiceTotal;

const displayedTotalGst =
  isGroupCheckout
    ? groupTotalGst
    : individualTotalGst;

const displayedSavings =
  isGroupCheckout
    ? groupTotalDiscount
    : couponDiscountAmount;

  const packageCoupons =
    useMemo(() => {
      return availableCoupons.filter(
        (coupon) => {
          if (
            !coupon.packages ||
            coupon.packages.length ===
              0
          ) {
            return true;
          }

          return coupon.packages.some(
            (item) =>
              item.id ===
              selectedPackage.id
          );
        }
      );
    }, [
      availableCoupons,
      selectedPackage.id,
    ]);

  const validateAndApplyCoupon =
    async (
      coupon: PublicCoupon
    ) => {
      const alreadyApplied =
        appliedCoupons.some(
          (item) =>
            item.id ===
            coupon.id
        );

      if (alreadyApplied) {
        setAppliedCoupons(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                coupon.id
            )
        );

        setCouponError("");
        return;
      }

      try {
        setCouponLoading(
          coupon.id
        );

        setCouponError("");

        const response =
          await fetch(
            "/api/coupons/validate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                code: coupon.code,

                packageId:
                  selectedPackage.id,
              }),
            }
          );

        const data =
          await response.json();

        if (!data.success) {
          setCouponError(
            data.message ||
              "This coupon is not valid"
          );

          return;
        }

        setAppliedCoupons(
          (current) => [
            ...current,
            data.coupon,
          ]
        );
      } catch (error) {
        console.error(error);

        setCouponError(
          "Failed to validate coupon"
        );
      } finally {
        setCouponLoading(
          null
        );
      }
    };


const changeMemberCount = (
  direction: -1 | 1
) => {
  const nextCount =
    memberCount + direction;

  if (
    nextCount < 1 ||
    nextCount >
      settings
        .groupJoiningMaxMembers
  ) {
    return;
  }

  /*
   * Increasing beyond 1 is only
   * allowed for eligible packages.
   */
  if (
    nextCount > 1 &&
    !groupDiscountApplicable
  ) {
    return;
  }

  setCouponError("");

  /*
   * Group discounts and coupons
   * cannot be combined.
   */
  if (nextCount > 1) {
    setAppliedCoupons([]);
  }

  if (direction === 1) {
    setGroupMembers(
      (current) => [
        ...current,
        { ...EMPTY_MEMBER },
      ]
    );

    return;
  }

  /*
   * Count drops from e.g. 4 -> 3,
   * remove the last additional member.
   */
  setGroupMembers(
    (current) =>
      current.slice(
        0,
        Math.max(
          0,
          nextCount - 1
        )
      )
  );
};

  const updateGroupMember = (
    index: number,
    field: keyof MemberForm,
    value: string
  ) => {
    setGroupMembers(
      (current) =>
        current.map(
          (member, memberIndex) =>
            memberIndex ===
            index
              ? {
                  ...member,
                  [field]:
                    value,
                }
              : member
        )
    );
  };

  const validateGroupMembers =
  () => {
    if (
      !groupDiscountApplicable
    ) {
      return (
        "Group joining is not available " +
        "for this membership."
      );
    }

    /*
     * groupJoiningMaxMembers is
     * only the upper limit.
     */
    if (
      memberCount >
      settings
        .groupJoiningMaxMembers
    ) {
      return (
        `Maximum ${settings.groupJoiningMaxMembers} ` +
        `members are allowed in a group.`
      );
    }

    if (!matchingGroupRule) {
      return (
        "No group discount is configured " +
        `for ${memberCount} members.`
      );
    }

    /*
     * Build the ACTUAL complete
     * member list:
     *
     * form = Member 1
     * groupMembers = Member 2+
     */
    const allMembers:
      MemberForm[] = [
        {
          name:
            form.name,

          phone:
            form.phone,

          email:
            form.email,
        },

        ...groupMembers,
      ];

    /*
     * Validate every member.
     */
    for (
      let index = 0;
      index <
      allMembers.length;
      index += 1
    ) {
      const member =
        allMembers[index];

      if (
        !member.name.trim() ||
        !member.phone.trim() ||
        !member.email.trim()
      ) {
        return (
          `Complete all details for ` +
          `Member ${index + 1}.`
        );
      }

      if (
        !PHONE_REGEX.test(
          member.phone.trim()
        )
      ) {
        return (
          `Enter a valid mobile number ` +
          `for Member ${index + 1}.`
        );
      }

      if (
        !EMAIL_REGEX.test(
          member.email.trim()
        )
      ) {
        return (
          `Enter a valid email address ` +
          `for Member ${index + 1}.`
        );
      }
    }

    /*
     * Unique phone validation.
     */
    const phones =
      allMembers.map(
        (member) =>
          member.phone.trim()
      );

    if (
      new Set(phones).size !==
      phones.length
    ) {
      return (
        "Each group member must use " +
        "a different mobile number."
      );
    }

    /*
     * Unique email validation.
     */
    const emails =
      allMembers.map(
        (member) =>
          member.email
            .trim()
            .toLowerCase()
      );

    if (
      new Set(emails).size !==
      emails.length
    ) {
      return (
        "Each group member must use " +
        "a different email address."
      );
    }

    if (!form.branchId) {
      return "Select a branch.";
    }

    return null;
  };

  const openRazorpay = ({
    orderId,
    amount,
    payer,
    description,
  }: {
    orderId: string;
    amount: number;
    payer: MemberForm;
    description: string;
  }) => {
    const options = {
      key:
        process.env
          .NEXT_PUBLIC_RAZORPAY_KEY,

      amount,
      currency: "INR",

      order_id: orderId,

      name: "Fuel Gym",

      description,

      handler: function () {
        alert(
          "Payment successful 🎉"
        );

        setOpen(false);
      },

      prefill: {
        name: payer.name,
        email: payer.email,
        contact: payer.phone,
      },

      theme: {
        color: "#a3e635",
      },
    };

    const razorpay =
      new (
        window as any
      ).Razorpay(options);

    razorpay.open();
  };

  const handleIndividualSubmit =
    async (
      extend = false
    ) => {
      if (
        !form.name.trim() ||
        !form.phone.trim() ||
        !form.email.trim() ||
        !form.branchId
      ) {
        alert(
          "Please fill all fields"
        );

        return;
      }

      if (!individualPhoneValid) {
        alert(
          "Enter valid 10 digit phone"
        );

        return;
      }

      if (!individualEmailValid) {
        alert(
          "Enter valid email"
        );

        return;
      }

      setLoading(true);

      try {
        const response =
          await fetch(
            "/api/payment/create-order",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                name:
                  form.name.trim(),

                phone:
                  form.phone.trim(),

                email:
                  form.email
                    .trim()
                    .toLowerCase(),

                branchId:
                  form.branchId,

                ref,

                packageId:
                  selectedPackage.id,

                extend,

                discountAmount:
                  couponDiscountAmount,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !data.success &&
          data.requiresConfirmation
        ) {
          setExtendModal(true);
          return;
        }

        if (!data.success) {
          alert(
            data.message ||
              "Something went wrong"
          );

          return;
        }

        openRazorpay({
          orderId:
            data.orderId,

          amount:
            data.amount,

          payer: {
            name:
              form.name,

            email:
              form.email,

            phone:
              form.phone,
          },

          description:
            `${service.name} - ` +
            `${selectedPackage.name}`,
        });
      } catch (error) {
        console.error(error);

        alert(
          "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    };

    const handleGroupSubmit =
    async (
      extendPhones:
        string[] = []
    ) => {
      const validationError =
        validateGroupMembers();
  
      if (validationError) {
        alert(validationError);
        return;
      }
  
      setLoading(true);
  
      try {
        /*
         * IMPORTANT:
         *
         * form = Member 1
         * groupMembers = Member 2+
         */
        const normalizedMembers:
          MemberForm[] = [
            {
              name:
                form.name.trim(),
  
              phone:
                form.phone.trim(),
  
              email:
                form.email
                  .trim()
                  .toLowerCase(),
            },
  
            ...groupMembers.map(
              (member) => ({
                name:
                  member.name.trim(),
  
                phone:
                  member.phone.trim(),
  
                email:
                  member.email
                    .trim()
                    .toLowerCase(),
              })
            ),
          ];
  
        /*
         * Helpful while testing.
         */
        console.log(
          "GROUP CHECKOUT PAYLOAD",
          {
            memberCount:
              normalizedMembers.length,
  
            expectedMemberCount:
              memberCount,
  
            members:
              normalizedMembers,
          }
        );
  
        const response =
          await fetch(
            "/api/payment/create-group-order",
            {
              method: "POST",
  
              headers: {
                "Content-Type":
                  "application/json",
              },
  
              body:
                JSON.stringify({
                  branchId:
                    form.branchId,
  
                  packageId:
                    selectedPackage.id,
  
                  members:
                    normalizedMembers,
  
                  extendPhones,
                }),
            }
          );
  
        const data =
          await response.json();
  
        if (
          !data.success &&
          data.requiresConfirmation
        ) {
          const activeMembers =
            Array.isArray(
              data.activeMembers
            )
              ? data.activeMembers
              : [];
  
          setGroupExtendMembers(
            activeMembers
          );
  
          return;
        }
  
        if (!data.success) {
          alert(
            data.message ||
              "Unable to create group checkout"
          );
  
          return;
        }
  
        /*
         * Sanity check:
         * backend and frontend should agree
         * on member count.
         */
        if (
          Number(
            data.memberCount
          ) !==
          normalizedMembers.length
        ) {
          console.error(
            "GROUP MEMBER COUNT MISMATCH",
            {
              frontend:
                normalizedMembers.length,
  
              backend:
                data.memberCount,
            }
          );
  
          alert(
            "Member count mismatch. Please refresh and try again."
          );
  
          return;
        }
  
        /*
         * Sanity check:
         * backend and frontend should agree
         * on payable amount.
         */
        if (
          Number(data.amount) !==
          Number(
            groupInvoiceTotal
          )
        ) {
          console.error(
            "GROUP PRICE MISMATCH",
            {
              frontend:
                groupInvoiceTotal,
  
              backend:
                data.amount,
            }
          );
  
          alert(
            "Checkout price mismatch. Please refresh and try again."
          );
  
          return;
        }
  
        openRazorpay({
          orderId:
            data.orderId,
  
          amount:
            data.amount,
  
          payer:
            normalizedMembers[0],
  
          description:
            `${service.name} - ` +
            `${selectedPackage.name} ` +
            `(${normalizedMembers.length} members)`,
        });
      } catch (error) {
        console.error(
          error
        );
  
        alert(
          "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    };
    
    const handleSubmit = () => {
      if (isGroupCheckout) {
        handleGroupSubmit();
        return;
      }
    
      handleIndividualSubmit(false);
    };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4">
        <div
          className={`flex w-full flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl transition-all ${
            isGroupCheckout
              ? "max-h-[96dvh] max-w-6xl md:h-[94dvh]"
              : "max-h-[94dvh] max-w-lg"
          }`}
        >
          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}
  
          <div className="shrink-0 border-b border-neutral-800 bg-gradient-to-b from-lime-400/10 to-transparent px-4 py-3 sm:px-5 sm:py-4">
            {/* TOP */}
  
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-lime-400">
                  Fuel Gym
                </p>
  
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="truncate text-lg font-bold text-white sm:text-xl">
                    {service.name}
                  </h2>
  
                  <span className="text-neutral-700">
                    ·
                  </span>
  
                  <p className="truncate text-sm text-neutral-400">
                    {selectedPackage.name}
                  </p>
                </div>
              </div>
  
              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white"
              >
                ✕
              </button>
            </div>
  
            {/* PRICE + CURRENT GROUP STATUS */}
  
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-end gap-2">
                <h3 className="text-2xl font-black text-white sm:text-3xl">
                  ₹
                  {formatMoney(
                    displayedInvoiceTotal
                  )}
                </h3>
  
                <span className="mb-1 text-[11px] text-neutral-500">
                  incl. ₹
                  {formatMoney(
                    displayedTotalGst
                  )}{" "}
                  GST
                </span>
              </div>
  
              {isGroupCheckout &&
                matchingGroupRule && (
                  <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-300">
                    {memberCount}{" "}
                    members ·{" "}
                    {
                      groupDiscountPercentage
                    }
                    % OFF
                  </span>
                )}
            </div>
  
            {/* GROUP PROMOTION */}
  
            {!isGroupCheckout &&
              groupDiscountApplicable &&
              maximumGroupDiscount >
                0 && (
                <p className="mt-1.5 text-xs font-medium text-lime-400 sm:text-sm">
                  Join as a group
                  and get up to{" "}
                  <span className="font-bold">
                    {
                      maximumGroupDiscount
                    }
                    %
                  </span>{" "}
                  discount.
                </p>
              )}
  
            {/* INDIVIDUAL COUPON SAVING */}
  
            {!isGroupCheckout &&
              appliedCoupons.length >
                0 && (
                <p className="mt-1.5 text-xs font-medium text-lime-400">
                  You saved ₹
                  {formatMoney(
                    couponDiscountAmount
                  )}
                </p>
              )}
  
            {/* PACKAGE META */}
  
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] text-neutral-300">
                {
                  selectedPackage.durationInDays
                }{" "}
                Days
              </span>
  
              {selectedBranch && (
                <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-0.5 text-[10px] text-lime-300">
                  {
                    selectedBranch.name
                  }
                </span>
              )}
            </div>
          </div>
  
          {/* ================================================= */}
          {/* BODY */}
          {/* ================================================= */}
  
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {/* SETTINGS LOADING */}
  
            {settingsLoading && (
              <div className="mb-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs text-neutral-400">
                Loading available
                membership offers...
              </div>
            )}
  
            {/* ================================================= */}
            {/* MEMBER COUNT */}
            {/* ================================================= */}
  
            {groupDiscountApplicable && (
              <div className="mb-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Members
                    </p>
  
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      People joining
                      this membership
                    </p>
                  </div>
  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        changeMemberCount(
                          -1
                        )
                      }
                      disabled={
                        memberCount <= 1
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-lg font-bold text-white transition hover:border-lime-400 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      −
                    </button>
  
                    <span className="min-w-9 text-center text-xl font-black text-white">
                      {memberCount}
                    </span>
  
                    <button
                      type="button"
                      onClick={() =>
                        changeMemberCount(
                          1
                        )
                      }
                      disabled={
                        memberCount >=
                        settings
                          .groupJoiningMaxMembers
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-lg font-bold text-white transition hover:border-lime-400 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
  
                {/* NO RULE WARNING */}
  
                {isGroupCheckout &&
                  !matchingGroupRule && (
                    <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <p className="text-xs text-amber-300">
                        No group
                        discount is
                        configured for{" "}
                        {
                          memberCount
                        }{" "}
                        members.
                      </p>
                    </div>
                  )}
              </div>
            )}
  
            {/* ================================================= */}
            {/* COMPACT GROUP PRICE SUMMARY */}
            {/* ================================================= */}
  
            {isGroupCheckout &&
              matchingGroupRule && (
                <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800 sm:grid-cols-4">
                  <PriceSummaryCard
                    label="Subtotal"
                    value={`₹${formatMoney(
                      groupPackageSubtotal
                    )}`}
                  />
  
                  <PriceSummaryCard
                    label={`Discount ${groupDiscountPercentage}%`}
                    value={`-₹${formatMoney(
                      groupTotalDiscount
                    )}`}
                    highlight
                  />
  
                  <PriceSummaryCard
                    label="GST"
                    value={`₹${formatMoney(
                      groupTotalGst
                    )}`}
                  />
  
                  <PriceSummaryCard
                    label="Payable"
                    value={`₹${formatMoney(
                      groupInvoiceTotal
                    )}`}
                    strong
                  />
                </div>
              )}
  
            {/* ================================================= */}
            {/* PRIMARY MEMBER */}
            {/* ================================================= */}
  
            <div
              className={`rounded-xl ${
                isGroupCheckout
                  ? "border border-neutral-800 bg-neutral-900 px-4 py-3"
                  : ""
              }`}
            >
              {isGroupCheckout && (
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      Member 1
                    </h3>
  
                    <span className="rounded-full bg-lime-400/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-lime-400">
                      Primary
                    </span>
                  </div>
  
                  <span className="text-xs font-semibold text-neutral-400">
                    ₹
                    {formatMoney(
                      groupInvoicePerMember
                    )}
                  </span>
                </div>
              )}
  
              <div
                className={
                  isGroupCheckout
                    ? "grid gap-3 md:grid-cols-3"
                    : "space-y-3.5"
                }
              >
                {/* NAME */}
  
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-400">
                    Full Name
                  </label>
  
                  <input
                    value={
                      form.name
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
  
                        name:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Enter your name"
                    className={`h-10 w-full rounded-lg border border-neutral-800 px-3 text-sm text-white outline-none transition focus:border-lime-400 ${
                      isGroupCheckout
                        ? "bg-neutral-950"
                        : "bg-neutral-900"
                    }`}
                  />
                </div>
  
                {/* PHONE */}
  
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-400">
                    Mobile Number
                  </label>
  
                  <div className="flex h-10 overflow-hidden rounded-lg border border-neutral-800 transition focus-within:border-lime-400">
                    <div className="flex w-12 shrink-0 items-center justify-center bg-neutral-800 text-xs font-medium text-white">
                      +91
                    </div>
  
                    <input
                      value={
                        form.phone
                      }
                      maxLength={
                        10
                      }
                      inputMode="numeric"
                      onChange={(
                        event
                      ) => {
                        const value =
                          event.target.value.replace(
                            /\D/g,
                            ""
                          );
  
                        setForm({
                          ...form,
  
                          phone:
                            value,
                        });
                      }}
                      placeholder="9876543210"
                      className={`min-w-0 flex-1 px-3 text-sm text-white outline-none ${
                        isGroupCheckout
                          ? "bg-neutral-950"
                          : "bg-neutral-900"
                      }`}
                    />
                  </div>
  
                  {form.phone &&
                    !individualPhoneValid && (
                      <p className="mt-1 text-[10px] text-red-400">
                        Enter a valid
                        10 digit mobile
                        number
                      </p>
                    )}
                </div>
  
                {/* EMAIL */}
  
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-400">
                    Email Address
                  </label>
  
                  <input
                    value={
                      form.email
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
  
                        email:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Enter your email"
                    className={`h-10 w-full rounded-lg border border-neutral-800 px-3 text-sm text-white outline-none transition focus:border-lime-400 ${
                      isGroupCheckout
                        ? "bg-neutral-950"
                        : "bg-neutral-900"
                    }`}
                  />
  
                  {form.email &&
                    !individualEmailValid && (
                      <p className="mt-1 text-[10px] text-red-400">
                        Enter a valid
                        email address
                      </p>
                    )}
                </div>
              </div>
            </div>
  
            {/* ================================================= */}
            {/* ADDITIONAL GROUP MEMBERS */}
            {/* ================================================= */}
  
            {isGroupCheckout &&
              groupMembers.length >
                0 && (
                <div className="mt-3 space-y-3">
                  {groupMembers.map(
                    (
                      member,
                      index
                    ) => {
                      const memberNumber =
                        index + 2;
  
                      return (
                        <div
                          key={
                            index
                          }
                          className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
                        >
                          {/* MEMBER HEADER */}
  
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-white">
                              Member{" "}
                              {
                                memberNumber
                              }
                            </h3>
  
                            <span className="text-xs font-semibold text-neutral-400">
                              ₹
                              {formatMoney(
                                groupInvoicePerMember
                              )}
                            </span>
                          </div>
  
                          <div className="grid gap-3 md:grid-cols-3">
                            {/* NAME */}
  
                            <div>
                              <label className="mb-1 block text-[11px] text-neutral-400">
                                Full Name
                              </label>
  
                              <input
                                value={
                                  member.name
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateGroupMember(
                                    index,
                                    "name",
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="Full name"
                                className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-white outline-none transition focus:border-lime-400"
                              />
                            </div>
  
                            {/* PHONE */}
  
                            <div>
                              <label className="mb-1 block text-[11px] text-neutral-400">
                                Mobile
                                Number
                              </label>
  
                              <div className="flex h-10 overflow-hidden rounded-lg border border-neutral-800 transition focus-within:border-lime-400">
                                <div className="flex w-12 shrink-0 items-center justify-center bg-neutral-800 text-xs text-white">
                                  +91
                                </div>
  
                                <input
                                  value={
                                    member.phone
                                  }
                                  maxLength={
                                    10
                                  }
                                  inputMode="numeric"
                                  onChange={(
                                    event
                                  ) =>
                                    updateGroupMember(
                                      index,
                                      "phone",
                                      event.target.value.replace(
                                        /\D/g,
                                        ""
                                      )
                                    )
                                  }
                                  placeholder="9876543210"
                                  className="min-w-0 flex-1 bg-neutral-950 px-3 text-sm text-white outline-none"
                                />
                              </div>
  
                              {member.phone &&
                                !PHONE_REGEX.test(
                                  member.phone
                                ) && (
                                  <p className="mt-1 text-[10px] text-red-400">
                                    Invalid
                                    mobile
                                    number
                                  </p>
                                )}
                            </div>
  
                            {/* EMAIL */}
  
                            <div>
                              <label className="mb-1 block text-[11px] text-neutral-400">
                                Email
                                Address
                              </label>
  
                              <input
                                value={
                                  member.email
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateGroupMember(
                                    index,
                                    "email",
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="member@email.com"
                                className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-white outline-none transition focus:border-lime-400"
                              />
  
                              {member.email &&
                                !EMAIL_REGEX.test(
                                  member.email
                                ) && (
                                  <p className="mt-1 text-[10px] text-red-400">
                                    Invalid
                                    email
                                    address
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
  
            {/* ================================================= */}
            {/* COUPONS */}
            {/* INDIVIDUAL ONLY */}
            {/* ================================================= */}
  
            {!isGroupCheckout &&
              packageCoupons.length >
                0 && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs text-neutral-400">
                    Available Offers
                  </label>
  
                  <div className="space-y-2">
                    {packageCoupons.map(
                      (
                        coupon
                      ) => {
                        const isApplied =
                          appliedCoupons.some(
                            (
                              item
                            ) =>
                              item.id ===
                              coupon.id
                          );
  
                        const isLoading =
                          couponLoading ===
                          coupon.id;
  
                        return (
                          <div
                            key={
                              coupon.id
                            }
                            className={`rounded-xl border px-3 py-2.5 transition ${
                              isApplied
                                ? "border-lime-400/50 bg-lime-400/10"
                                : "border-neutral-800 bg-neutral-900"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded bg-lime-400/20 px-2 py-0.5 text-xs font-bold text-lime-300">
                                    {
                                      coupon.code
                                    }
                                  </span>
  
                                  <span className="text-xs text-neutral-400">
                                    {coupon.discountPercent
                                      ? `${coupon.discountPercent}% OFF`
                                      : `₹${formatMoney(
                                          coupon.discountFlatAmount ||
                                            0
                                        )} OFF`}
                                  </span>
                                </div>
                              </div>
  
                              <button
                                type="button"
                                onClick={() =>
                                  validateAndApplyCoupon(
                                    coupon
                                  )
                                }
                                disabled={
                                  isLoading
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                  isApplied
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-lime-400/20 text-lime-300 hover:bg-lime-400/30"
                                } disabled:opacity-50`}
                              >
                                {isLoading
                                  ? "..."
                                  : isApplied
                                  ? "Remove"
                                  : "Apply"}
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
  
                  {couponError && (
                    <p className="mt-2 text-xs text-red-400">
                      {
                        couponError
                      }
                    </p>
                  )}
                </div>
              )}
  
            {/* ================================================= */}
            {/* BRANCH */}
            {/* ================================================= */}
  
            {branches.length >
              1 && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs text-neutral-400">
                  Select Branch
                </label>
  
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {branches.map(
                    (
                      branch
                    ) => {
                      const active =
                        form.branchId ===
                        branch.id;
  
                      return (
                        <button
                          key={
                            branch.id
                          }
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
  
                              branchId:
                                branch.id,
                            })
                          }
                          className={`h-10 truncate rounded-lg border px-3 text-sm font-medium transition ${
                            active
                              ? "border-lime-400 bg-lime-400/10 text-lime-300"
                              : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                          }`}
                        >
                          {
                            branch.name
                          }
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>
  
          {/* ================================================= */}
          {/* COMPACT FOOTER */}
          {/* ================================================= */}
  
          <div className="shrink-0 border-t border-neutral-800 bg-neutral-950 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-4">
              {/* DESKTOP GROUP SUMMARY */}
  
              {isGroupCheckout && (
                <div className="hidden min-w-[150px] shrink-0 sm:block">
                  <p className="text-[10px] text-neutral-500">
                    {memberCount}{" "}
                    memberships
                  </p>
  
                  <p className="mt-0.5 text-sm font-semibold text-white">
                    ₹
                    {formatMoney(
                      groupInvoicePerMember
                    )}{" "}
                    each
                  </p>
                </div>
              )}
  
              <button
                type="button"
                disabled={
                  loading ||
                  (
                    isGroupCheckout &&
                    !matchingGroupRule
                  )
                }
                onClick={
                  handleSubmit
                }
                className="h-11 flex-1 rounded-xl bg-lime-400 text-sm font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
              >
                {loading
                  ? "Processing..."
                  : `Pay ₹${formatMoney(
                      displayedInvoiceTotal
                    )}`}
              </button>
            </div>
  
            <p className="mt-1.5 text-center text-[9px] text-neutral-600">
              Secure payments
              powered by Razorpay
            </p>
          </div>
        </div>
      </div>
  
      {/* ================================================= */}
      {/* INDIVIDUAL EXTEND CONFIRMATION */}
      {/* ================================================= */}
  
      {extendModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-xl font-bold text-white">
              Active Membership
              Found
            </h3>
  
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              You already have an
              active membership.
              Extending will add
              additional days to
              your existing plan.
            </p>
  
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setExtendModal(
                    false
                  )
                }
                className="h-11 flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 text-white"
              >
                Cancel
              </button>
  
              <button
                type="button"
                onClick={() => {
                  setExtendModal(
                    false
                  );
  
                  handleIndividualSubmit(
                    true
                  );
                }}
                className="h-11 flex-1 rounded-2xl bg-lime-400 font-semibold text-black"
              >
                Extend Plan
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* ================================================= */}
      {/* GROUP EXTEND CONFIRMATION */}
      {/* ================================================= */}
  
      {groupExtendMembers.length >
        0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-xl font-bold text-white">
              Active Memberships
              Found
            </h3>
  
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              The following members
              already have active
              memberships. Their new
              package will extend
              the existing
              membership.
            </p>
  
            <div className="mt-4 space-y-2">
              {groupExtendMembers.map(
                (
                  member,
                  index
                ) => (
                  <div
                    key={`${member.phone}-${index}`}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
                  >
                    <p className="font-medium text-white">
                      {
                        member.name
                      }
                    </p>
  
                    <p className="mt-1 text-xs text-neutral-500">
                      +91{" "}
                      {
                        member.phone
                      }
  
                      {(member.endDate ||
                        member.currentEndDate) &&
                        ` · Active until ${
                          member.endDate ||
                          member.currentEndDate
                        }`}
                    </p>
                  </div>
                )
              )}
            </div>
  
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setGroupExtendMembers(
                    []
                  )
                }
                className="h-11 flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 text-white"
              >
                Cancel
              </button>
  
              <button
                type="button"
                onClick={() => {
                  const extendPhones =
                    groupExtendMembers.map(
                      (
                        member
                      ) =>
                        member.phone
                    );
  
                  setGroupExtendMembers(
                    []
                  );
  
                  handleGroupSubmit(
                    extendPhones
                  );
                }}
                className="h-11 flex-1 rounded-2xl bg-lime-400 font-semibold text-black"
              >
                Continue & Extend
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
  };
  
  type PriceSummaryCardProps = {
    label: string;
    value: string;
    highlight?: boolean;
    strong?: boolean;
  };
  
  const PriceSummaryCard = ({
    label,
    value,
    highlight = false,
    strong = false,
  }: PriceSummaryCardProps) => {
    return (
      <div
        className={`px-3 py-2.5 sm:px-4 ${
          strong
            ? "bg-neutral-900"
            : "bg-neutral-950"
        }`}
      >
        <p className="truncate text-[9px] uppercase tracking-wider text-neutral-500 sm:text-[10px]">
          {label}
        </p>
  
        <p
          className={`mt-1 truncate font-bold ${
            strong
              ? "text-base text-white"
              : highlight
              ? "text-sm text-lime-300"
              : "text-sm text-neutral-200"
          }`}
        >
          {value}
        </p>
      </div>
    );
  };

