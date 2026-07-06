"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, CreditCard, Activity, FileText, Dumbbell } from "lucide-react";
import { MemberModal } from "../MemberModal";

const Page = () => {
  const router = useRouter();
  const { id } = useParams();

  const [member, setMember] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [openMemberModal, setOpenMemberModal] = useState(false);

  const fetchMember = async () => {
    try {
      const res = await fetch(`/api/members/${id}`);
      const data = await res.json();

      setMember(data.member);
      setStats(data.stats);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchMember();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-neutral-500">Loading...</div>;
  }

  const latestSubscription = member?.subscriptions?.[0];
  const latestInvoice = member?.invoices?.[0];
  const latestAssessment = member?.fitnessAssessments?.[0];

  return (
    <div className="space-y-6">

      {/* HEADER */}
     {/* MEMBER HEADER CARD */}
     <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 mb-8">

<div className="flex items-start justify-between gap-5 flex-wrap">

  <div className="flex items-start gap-5">

    <button
      onClick={() =>
        router.push(
          "/dashboard/members"
        )
      }
      className="w-11 h-11 rounded-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-center"
    >
      <ArrowLeft size={18} />
    </button>

    <div className="w-20 h-20 rounded-full overflow-hidden border border-neutral-800 bg-neutral-950">

      {member.profileImage ? (
        <img
          src={member.profileImage}
          alt={member.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-lime-400">
          {member.name?.charAt(0)}
        </div>
      )}

    </div>

    <div>

      <h1 className="text-3xl font-bold">
        {member.name}
      </h1>

      <div className="space-y-2 mt-4">

        <div>
          <p className="text-xs text-neutral-500">
            Phone
          </p>

          <p className="text-sm">
            {member.phone}
          </p>
        </div>

        <div>
          <p className="text-xs text-neutral-500">
            Email
          </p>

          <p className="text-sm">
            {member.email ||
              "-"}
          </p>
        </div>

        <div>
          <p className="text-xs text-neutral-500">
            Joined
          </p>

          <p className="text-sm">
            {new Date(
              member.createdAt
            ).toLocaleDateString()}
          </p>
        </div>

      </div>

    </div>

  </div>

  <div className="flex gap-3">

    <button
      className="h-11 px-5 rounded-2xl border border-neutral-700"
      onClick={() => setOpenMemberModal(true)}
    >
      Edit Member
    </button>

    <button
      className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold"
      onClick={() =>
        router.push(
          `/dashboard/members/${member.id}/assignplan`
        )
      }
    >
      Add Billing
    </button>


  </div>

  

</div>

{!member.onBoardCompleted ? (
  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mt-4">
    <h3 className="font-semibold text-yellow-300">
      Onboarding Incomplete
    </h3>

    <p className="text-sm text-neutral-400 mt-2">
      PAR-Q & LHQ questionnaire and consent form
      have not been completed.
    </p>

    <button
      className="mt-4 h-10 px-4 rounded-xl bg-lime-400 text-black font-semibold"
      onClick={() =>
        router.push(
          `/dashboard/members/${member.id}/complete-profile`
        )
      }
    >
      Complete Profile
    </button>
  </div>
) : (
  <div className="bg-lime-500/10 border border-lime-500/20 rounded-2xl p-5">
    <h3 className="font-semibold text-lime-400">
      Onboarding Completed
    </h3>

    <div className="flex gap-4">
    <button
      className="mt-4 h-10 px-4 rounded-xl border border-neutral-700"
      onClick={() =>
        router.push(
          `/dashboard/members/${member.id}/complete-profile?edit=true`
        )
      }
    >
      Edit PAR-Q & LHQ Form
    </button>
    <button
      className="mt-4 h-10 px-4 rounded-xl border border-neutral-700 bg-lime-400 text-black font-semibold"
      onClick={() =>
        router.push(
          `/dashboard/members/${member.id}/consent`
        )
      }
    >
      View PAR-Q & LHQ Form
    </button>
    </div>
  </div>
)}

{/* EXTRA INFO */}
<div className="grid md:grid-cols-3 gap-4 mt-8">

  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
    <p className="text-xs text-neutral-500">
      DOB
    </p>

    <h3 className="mt-2">
      {member.dob || "-"}
    </h3>
  </div>


  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
    <p className="text-xs text-neutral-500">
      Age
    </p>

    <h3 className="mt-2">
      {member.age || "-"}
    </h3>
  </div>

  

  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
    <p className="text-xs text-neutral-500">
      Emergency Contact
    </p>

    <h3 className="mt-2">
      {member.emergencyContact ||
        "-"}
    </h3>
  </div>

  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
    <p className="text-xs text-neutral-500">
      Gender
    </p>

    <h3 className="mt-2 uppercase">
      {member.gender || "-"}
    </h3>
  </div>

  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 md:col-span-3">
    <p className="text-xs text-neutral-500">
      Address
    </p>

    <h3 className="mt-2">
      {member.address ||
        "No address added"}
    </h3>
  </div>

</div>

</div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Revenue" value={stats.totalCollected} color="text-lime-400" />
        <KpiCard label="Outstanding" value={stats.totalPending} color="text-red-400" />
        <KpiCard label="Billing" value={stats.totalBilling} color="text-white" />
        <KpiCard label="Active Memberships" value={stats.activeMemberships} color="text-blue-400" />
      </div>

      {/* LATEST MEMBERSHIP */}
      <Section title="Latest Membership" icon={<Dumbbell size={18} />}>
  {latestSubscription ? (
    <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">

      <div className="flex items-center justify-between">
        <p className="font-semibold">
          {latestSubscription.packageName}
        </p>

        <span className="text-xs px-2 py-1 rounded-full bg-lime-400/10 text-lime-400">
          {latestSubscription.status}
        </span>
      </div>

      <p className="text-sm text-neutral-500">
        {latestSubscription.branchName}
      </p>

      {/* DATES */}
      <div className="grid grid-cols-2 gap-3 text-sm mt-2">
        <div>
          <p className="text-neutral-500 text-xs">Start</p>
          <p className="text-white">
            {new Date(latestSubscription.startDate).toLocaleDateString("en-IN")}
          </p>
        </div>

        <div>
          <p className="text-neutral-500 text-xs">End</p>
          <p className="text-white">
            {new Date(latestSubscription.endDate).toLocaleDateString("en-IN")}
          </p>
        </div>
      </div>

    </div>
  ) : (
    <Empty text="No membership found" />
  )}
</Section>

      {/* LATEST INVOICE */}
      <Section title="Latest Invoice" icon={<CreditCard size={18} />}>
        {latestInvoice ? (
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-1">
            <p className="font-semibold">{latestInvoice.invoiceNumber}</p>
            <p className="text-sm text-neutral-500">
              Total: ₹{latestInvoice.finalAmount / 100} • Paid: ₹{latestInvoice.paidAmount / 100}
            </p>
          </div>
        ) : (
          <Empty text="No invoice found" />
        )}
      </Section>

      {/* LATEST ASSESSMENT */}
      <Section title="Latest Assessment" icon={<Activity size={18} />}>
        {latestAssessment ? (
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
            <p className="font-semibold">BMI: {latestAssessment.bmi || "-"}</p>
            <p className="text-sm text-neutral-500">
              Weight: {latestAssessment.weight || "-"} kg
            </p>
          </div>
        ) : (
          <Empty text="No assessment yet" />
        )}
      </Section>

    

      {openMemberModal && (
        <MemberModal
          member={member}
          open={openMemberModal}
          setOpen={setOpenMemberModal}
        />
      )}
    </div>
  );
};

export default Page;

/* ---------------- UI HELPERS ---------------- */

const KpiCard = ({ label, value, color }: any) => (
  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
    <p className="text-neutral-500 text-sm">{label}</p>
    {label === "Active Memberships" ? <h3 className="text-2xl font-bold mt-2">{value}</h3> : <h3 className={`text-2xl font-bold mt-2 ${color}`}>
      ₹{(value / 100).toLocaleString()}
    </h3>}
  </div>
);

const Section = ({ title, icon, children }: any) => (
  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-3">
    <div className="flex items-center gap-2 text-neutral-300">
      {icon}
      <h2 className="font-semibold">{title}</h2>
    </div>
    {children}
  </div>
);

const Empty = ({ text }: any) => (
  <p className="text-neutral-500 text-sm">{text}</p>
);

const ActionButton = ({ label }: any) => (
  <button className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm hover:bg-neutral-700 transition">
    {label}
  </button>
);