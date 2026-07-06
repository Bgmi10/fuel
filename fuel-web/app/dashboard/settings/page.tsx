  "use client";

  import { Setting } from "@prisma/client";
  import { useEffect, useState } from "react";

  const Page = () => {
    const [setting, setSetting] = useState<Setting | null>(null);

    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
      cgstPercentage: "",
      sgstPercentage: "",
    
      referralRewardType: "FIXED_AMOUNT",
    
      referralRewardAmount: "",
      referralRewardPercentage: "",
      referralMembershipDays: "",
    });
    const [saving, setSaving] = useState(false);

    const fetchSetting = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();

        setSetting(data.setting);

        setForm({
          cgstPercentage:
            data.setting?.cgstPercentage?.toString() || "",
        
          sgstPercentage:
            data.setting?.sgstPercentage?.toString() || "",
        
          referralRewardType:
            data.setting?.referralRewardType ||
            "FIXED_AMOUNT",
        
            referralRewardAmount:
  data.setting?.referralRewardAmount != null
    ? (
        data.setting.referralRewardAmount /
        100
      ).toString()
    : "",
        
          referralRewardPercentage:
            data.setting?.referralRewardPercentage?.toString() ||
            "",
        
          referralMembershipDays:
            data.setting?.referralMembershipDays?.toString() ||
            "",
        });
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchSetting();
    }, []);

    const handleUpdate = async () => {
      if (!setting) return;

      setSaving(true);

      try {
        const res = await fetch(`/api/settings/${setting.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cgstPercentage: Number(
              form.cgstPercentage
            ),
          
            sgstPercentage: Number(
              form.sgstPercentage
            ),
          
            referralRewardType:
              form.referralRewardType,
          
            referralRewardAmount:
              form.referralRewardAmount
                ? Number(
                    form.referralRewardAmount
                  )
                : null,
          
            referralRewardPercentage:
              form.referralRewardPercentage
                ? Number(
                    form.referralRewardPercentage
                  )
                : null,
          
            referralMembershipDays:
              form.referralMembershipDays
                ? Number(
                    form.referralMembershipDays
                  )
                : null,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          alert(data.message || "Failed to update settings");
          return;
        }

        alert("Settings updated successfully");

        fetchSetting();
      } catch (e) {
        console.log(e);
        alert("Something went wrong");
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="p-6">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Settings
          </h1>

          <p className="text-sm text-neutral-500 mt-1">
            Manage tax and invoice settings
          </p>
        </div>

        {/* CONTENT */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

          {loading ? (
            <p className="text-neutral-500 text-sm">
              Loading settings...
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-5">

                {/* CGST */}
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    CGST Percentage
                  </label>

                  <input
                    type="number"
                    placeholder="Enter CGST %"
                    value={form.cgstPercentage}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cgstPercentage: e.target.value,
                      })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
                  />
                </div>

                {/* SGST */}
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    SGST Percentage
                  </label>

                  <input
                    type="number"
                    placeholder="Enter SGST %"
                    value={form.sgstPercentage}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sgstPercentage: e.target.value,
                      })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-neutral-800 pt-6">

<h3 className="text-lg font-semibold text-white mb-4">
  Referral Reward
</h3>

<div className="max-w-md">

  <label className="text-sm text-neutral-400 mb-2 block">
    Reward Type
  </label>

  <select
    value={form.referralRewardType}
    onChange={(e) =>
      setForm({
        ...form,
        referralRewardType:
          e.target.value,
        referralRewardAmount: "",
        referralRewardPercentage:
          "",
        referralMembershipDays:
          "",
      })
    }
    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
  >
    <option value="FIXED_AMOUNT">
      Fixed Amount
    </option>

    <option value="PERCENTAGE_DISCOUNT">
      Percentage Discount
    </option>

    <option value="MEMBERSHIP_DAYS">
      Membership Days
    </option>
  </select>

</div>

{form.referralRewardType ===
  "FIXED_AMOUNT" && (
  <div className="mt-4 max-w-md">

    <label className="text-sm text-neutral-400 mb-2 block">
      Reward Amount (₹)
    </label>

    <input
      type="number"
      value={
        form.referralRewardAmount
      }
      onChange={(e) =>
        setForm({
          ...form,
          referralRewardAmount:
            e.target.value,
        })
      }
      placeholder="500"
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
    />

  </div>
)}

{form.referralRewardType ===
  "PERCENTAGE_DISCOUNT" && (
  <div className="mt-4 max-w-md">

    <label className="text-sm text-neutral-400 mb-2 block">
      Discount Percentage (%)
    </label>

    <input
      type="number"
      value={
        form.referralRewardPercentage
      }
      onChange={(e) =>
        setForm({
          ...form,
          referralRewardPercentage:
            e.target.value,
        })
      }
      placeholder="10"
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
    />

  </div>
)}

{form.referralRewardType ===
  "MEMBERSHIP_DAYS" && (
  <div className="mt-4 max-w-md">

    <label className="text-sm text-neutral-400 mb-2 block">
      Membership Days
    </label>

    <input
      type="number"
      value={
        form.referralMembershipDays
      }
      onChange={(e) =>
        setForm({
          ...form,
          referralMembershipDays:
            e.target.value,
        })
      }
      placeholder="30"
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none"
    />

  </div>
)}

</div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="px-5 py-2 bg-lime-400 text-black rounded-xl font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  export default Page;