"use client";

import type { Setting } from "@prisma/client";
import { useEffect, useState } from "react";

type ReferralRewardType =
  | "FIXED_AMOUNT"
  | "PERCENTAGE_DISCOUNT"
  | "MEMBERSHIP_DAYS";

type GroupDiscountRuleForm = {
  id: string;
  minMembers: string;
  maxMembers: string;
  discountPercentage: string;
};

type SettingsForm = {
  cgstPercentage: string;
  sgstPercentage: string;
  referralRewardType: ReferralRewardType;
  referralRewardAmount: string;
  referralRewardPercentage: string;
  referralMembershipDays: string;
  groupJoiningEnabled: boolean;
  groupJoiningMaxMembers: string;
  groupDiscountRules: GroupDiscountRuleForm[];
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function parseRules(value: unknown): GroupDiscountRuleForm[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const rule = item as Record<string, unknown>;
      const minMembers = Number(rule.minMembers);
      const maxMembers = Number(rule.maxMembers);
      const discountPercentage = Number(rule.discountPercentage);

      if (
        !Number.isFinite(minMembers) ||
        !Number.isFinite(maxMembers) ||
        !Number.isFinite(discountPercentage)
      ) {
        return null;
      }

      return {
        id: makeId(),
        minMembers: String(minMembers),
        maxMembers: String(maxMembers),
        discountPercentage: String(discountPercentage),
      };
    })
    .filter((rule): rule is GroupDiscountRuleForm => rule !== null)
    .sort((a, b) => Number(a.minMembers) - Number(b.minMembers));
}

export default function Page() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SettingsForm>({
    cgstPercentage: "",
    sgstPercentage: "",
    referralRewardType: "FIXED_AMOUNT",
    referralRewardAmount: "",
    referralRewardPercentage: "",
    referralMembershipDays: "",
    groupJoiningEnabled: false,
    groupJoiningMaxMembers: "10",
    groupDiscountRules: [],
  });

  const fetchSetting = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/settings", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success || !data.setting) {
        throw new Error(data.message || "Unable to load settings");
      }

      setSetting(data.setting);

      setForm({
        cgstPercentage:
          data.setting.cgstPercentage?.toString() || "",
        sgstPercentage:
          data.setting.sgstPercentage?.toString() || "",
        referralRewardType:
          data.setting.referralRewardType || "FIXED_AMOUNT",
        referralRewardAmount:
          data.setting.referralRewardAmount != null
            ? (data.setting.referralRewardAmount / 100).toString()
            : "",
        referralRewardPercentage:
          data.setting.referralRewardPercentage?.toString() || "",
        referralMembershipDays:
          data.setting.referralMembershipDays?.toString() || "",
        groupJoiningEnabled:
          Boolean(data.setting.groupJoiningEnabled),
        groupJoiningMaxMembers:
          String(data.setting.groupJoiningMaxMembers ?? 10),
        groupDiscountRules:
          parseRules(data.setting.groupDiscountRules),
      });
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to load settings"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetting();
  }, []);

  const updateRule = (
    id: string,
    field: "minMembers" | "maxMembers" | "discountPercentage",
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      groupDiscountRules: current.groupDiscountRules.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              [field]: value,
            }
          : rule
      ),
    }));
  };

  const addRule = () => {
    const maxAllowed = Number(form.groupJoiningMaxMembers) || 10;

    const highestMax = form.groupDiscountRules.reduce(
      (highest, rule) =>
        Math.max(highest, Number(rule.maxMembers) || 1),
      1
    );

    const nextCount = highestMax + 1;

    if (nextCount > maxAllowed) {
      alert(`Rules already reach the maximum of ${maxAllowed} members.`);
      return;
    }

    setForm((current) => ({
      ...current,
      groupDiscountRules: [
        ...current.groupDiscountRules,
        {
          id: makeId(),
          minMembers: String(nextCount),
          maxMembers: String(nextCount),
          discountPercentage: "",
        },
      ],
    }));
  };

  const removeRule = (id: string) => {
    setForm((current) => ({
      ...current,
      groupDiscountRules: current.groupDiscountRules.filter(
        (rule) => rule.id !== id
      ),
    }));
  };

  const validateGroupSettings = () => {
    const maxMembers = Number(form.groupJoiningMaxMembers);

    if (
      !Number.isInteger(maxMembers) ||
      maxMembers < 2 ||
      maxMembers > 10
    ) {
      return "Maximum group members must be between 2 and 10.";
    }

    if (!form.groupJoiningEnabled) return null;

    if (form.groupDiscountRules.length === 0) {
      return "Add at least one group discount rule.";
    }

    const rules = form.groupDiscountRules
      .map((rule) => ({
        minMembers: Number(rule.minMembers),
        maxMembers: Number(rule.maxMembers),
        discountPercentage: Number(rule.discountPercentage),
      }))
      .sort((a, b) => a.minMembers - b.minMembers);

    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index];
      const previous = rules[index - 1];

      if (
        !Number.isInteger(rule.minMembers) ||
        !Number.isInteger(rule.maxMembers)
      ) {
        return "Member counts must be whole numbers.";
      }

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
        !Number.isFinite(rule.discountPercentage) ||
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
  };

  const handleUpdate = async () => {
    if (!setting) return;

    const groupError = validateGroupSettings();

    if (groupError) {
      alert(groupError);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/settings/${setting.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cgstPercentage: Number(form.cgstPercentage),
          sgstPercentage: Number(form.sgstPercentage),

          referralRewardType: form.referralRewardType,
          referralRewardAmount: form.referralRewardAmount
            ? Number(form.referralRewardAmount)
            : null,
          referralRewardPercentage: form.referralRewardPercentage
            ? Number(form.referralRewardPercentage)
            : null,
          referralMembershipDays: form.referralMembershipDays
            ? Number(form.referralMembershipDays)
            : null,

          groupJoiningEnabled: form.groupJoiningEnabled,
          groupJoiningMaxMembers: Number(
            form.groupJoiningMaxMembers
          ),
          groupDiscountRules: form.groupDiscountRules.map((rule) => ({
            minMembers: Number(rule.minMembers),
            maxMembers: Number(rule.maxMembers),
            discountPercentage: Number(rule.discountPercentage),
          })),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to update settings");
        return;
      }

      alert("Settings updated successfully");
      await fetchSetting();
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>

        <p className="mt-1 text-sm text-neutral-500">
          Manage tax, referral and group membership settings
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <section>
          <h2 className="text-lg font-semibold text-white">
            Tax Settings
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="CGST Percentage"
              value={form.cgstPercentage}
              onChange={(value) =>
                setForm({
                  ...form,
                  cgstPercentage: value,
                })
              }
              min="0"
              max="100"
              step="0.01"
            />

            <Field
              label="SGST Percentage"
              value={form.sgstPercentage}
              onChange={(value) =>
                setForm({
                  ...form,
                  sgstPercentage: value,
                })
              }
              min="0"
              max="100"
              step="0.01"
            />
          </div>
        </section>

        <section className="mt-8 border-t border-neutral-800 pt-8">
          <h2 className="text-lg font-semibold text-white">
            Referral Reward
          </h2>

          <div className="mt-5 max-w-md">
            <label className="mb-2 block text-sm text-neutral-400">
              Reward Type
            </label>

            <select
              value={form.referralRewardType}
              onChange={(event) =>
                setForm({
                  ...form,
                  referralRewardType:
                    event.target.value as ReferralRewardType,
                  referralRewardAmount: "",
                  referralRewardPercentage: "",
                  referralMembershipDays: "",
                })
              }
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none focus:border-lime-400"
            >
              <option value="FIXED_AMOUNT">Fixed Amount</option>
              <option value="PERCENTAGE_DISCOUNT">
                Percentage Discount
              </option>
              <option value="MEMBERSHIP_DAYS">
                Membership Days
              </option>
            </select>
          </div>

          {form.referralRewardType === "FIXED_AMOUNT" && (
            <div className="mt-4 max-w-md">
              <Field
                label="Reward Amount (₹)"
                value={form.referralRewardAmount}
                onChange={(value) =>
                  setForm({
                    ...form,
                    referralRewardAmount: value,
                  })
                }
                min="0"
                step="0.01"
              />
            </div>
          )}

          {form.referralRewardType === "PERCENTAGE_DISCOUNT" && (
            <div className="mt-4 max-w-md">
              <Field
                label="Discount Percentage (%)"
                value={form.referralRewardPercentage}
                onChange={(value) =>
                  setForm({
                    ...form,
                    referralRewardPercentage: value,
                  })
                }
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          )}

          {form.referralRewardType === "MEMBERSHIP_DAYS" && (
            <div className="mt-4 max-w-md">
              <Field
                label="Membership Days"
                value={form.referralMembershipDays}
                onChange={(value) =>
                  setForm({
                    ...form,
                    referralMembershipDays: value,
                  })
                }
                min="1"
                step="1"
              />
            </div>
          )}
        </section>

        <section className="mt-8 border-t border-neutral-800 pt-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Group Membership Offers
              </h2>

              <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                Configure discounts based on how many people join
                together.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
              <input
                type="checkbox"
                checked={form.groupJoiningEnabled}
                onChange={(event) =>
                  setForm({
                    ...form,
                    groupJoiningEnabled: event.target.checked,
                  })
                }
                className="h-4 w-4 accent-lime-400"
              />

              <span className="text-sm font-medium text-neutral-200">
                Enable group joining
              </span>
            </label>
          </div>

          <div className="mt-6 max-w-sm">
            <Field
              label="Maximum Members Per Group"
              value={form.groupJoiningMaxMembers}
              onChange={(value) =>
                setForm({
                  ...form,
                  groupJoiningMaxMembers: value,
                })
              }
              min="2"
              max="10"
              step="1"
            />

            <p className="mt-2 text-xs text-neutral-500">
              Public checkout is capped at 10 members.
            </p>
          </div>

          <div
            className={`mt-6 rounded-2xl border p-5 ${
              form.groupJoiningEnabled
                ? "border-neutral-800 bg-neutral-950"
                : "border-neutral-800/60 bg-neutral-950/40 opacity-60"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">
                  Discount Rules
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  Example: 2 members get 10%, while 3 members get
                  12%.
                </p>
              </div>

              <button
                type="button"
                onClick={addRule}
                disabled={!form.groupJoiningEnabled}
                className="rounded-xl border border-lime-400/40 bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add Rule
              </button>
            </div>

            {form.groupDiscountRules.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-neutral-700 px-5 py-8 text-center text-sm text-neutral-500">
                No group discount rules configured.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {form.groupDiscountRules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <RuleField
                      label="Minimum Members"
                      value={rule.minMembers}
                      disabled={!form.groupJoiningEnabled}
                      onChange={(value) =>
                        updateRule(rule.id, "minMembers", value)
                      }
                    />

                    <RuleField
                      label="Maximum Members"
                      value={rule.maxMembers}
                      disabled={!form.groupJoiningEnabled}
                      onChange={(value) =>
                        updateRule(rule.id, "maxMembers", value)
                      }
                    />

                    <RuleField
                      label="Discount (%)"
                      value={rule.discountPercentage}
                      disabled={!form.groupJoiningEnabled}
                      step="0.01"
                      onChange={(value) =>
                        updateRule(
                          rule.id,
                          "discountPercentage",
                          value
                        )
                      }
                    />

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        disabled={!form.groupJoiningEnabled}
                        className="h-[42px] rounded-lg border border-red-900 bg-red-950/40 px-4 text-sm font-medium text-red-300 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>

                    <p className="text-xs text-neutral-500 md:col-span-4">
                      Rule {index + 1}: {rule.minMembers || "—"}
                      {rule.maxMembers !== rule.minMembers
                        ? `–${rule.maxMembers || "—"}`
                        : ""}{" "}
                      members receive{" "}
                      {rule.discountPercentage || "—"}% off.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 flex justify-end border-t border-neutral-800 pt-6">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={saving || !setting}
            className="rounded-xl bg-lime-400 px-6 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-neutral-400">
        {label}
      </label>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none focus:border-lime-400"
      />
    </div>
  );
}

function RuleField({
  label,
  value,
  onChange,
  disabled,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-neutral-500">
        {label}
      </label>

      <input
        type="number"
        min="0"
        max="100"
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-white outline-none focus:border-lime-400 disabled:cursor-not-allowed"
      />
    </div>
  );
}