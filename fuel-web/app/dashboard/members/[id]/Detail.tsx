"use client";

import { formatPaidAt } from "@/app/utils/helper";

import {
  ArrowLeft,
  Download,
  Wallet,
  CreditCard,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import { CollectBalanceModal } from "./CollectBalanceModal";
import { MemberModal } from "../MemberModal";
import { EditInvoiceModal } from "./EditInvoiceModal";
import { EditPaymentModal } from "./EditPaymentModel";
import { VoidPaymentModal } from "./VoidPaymentModal";
import { FreezeModal } from "./Freezemodal";

type Props = {};

export const Detail = ({}: Props) => {
  const { id } = useParams();

  const [openCollect, setOpenCollect] = useState(false);
  const router = useRouter();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [openMemberModal, setOpenMemberModal] = useState(false);
  const [openEditInvoice, setOpenEditInvoice] =
  useState(false);

const [openEditPayment, setOpenEditPayment] =
  useState(false);

const [openVoidPayment, setOpenVoidPayment] =
  useState(false);

const [selectedInvoice, setSelectedInvoice] =
  useState<any>(null);

const [selectedPayment, setSelectedPayment] =
  useState<any>(null);

const [openFreezeModal, setOpenFreezeModal] = useState(false);
const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
 
  const [member, setMember] =
    useState<any>(null);

  const [stats, setStats] =
    useState<any>(null);

  const [activeSubscriptions, setActiveSubscriptions] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const fetchMember = async () => {
    try {
      const res = await fetch(
        `/api/members/${id}`
      );

      const data = await res.json();

      setMember(data.member);

      setStats(data.stats);

      setActiveSubscriptions(
        data.activeSubscriptions || []
      );
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMember();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-10 text-neutral-500">
        Loading...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-10 text-red-500">
        Member not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <div className="max-w-7xl mx-auto">

        {/* MEMBER CARD */}
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

              <div className="w-28 h-28 rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-950">

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

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
            <p className="text-neutral-500 text-sm">
              Total Revenue
            </p>

            <h3 className="text-2xl font-bold text-lime-400 mt-2">
              ₹
              {(
                stats.totalCollected / 100
              ).toLocaleString()}
            </h3>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
            <p className="text-neutral-500 text-sm">
              Pending Balance
            </p>

            <h3 className="text-2xl font-bold text-yellow-400 mt-2">
              ₹
              {(
                stats.totalPending / 100
              ).toLocaleString()}
            </h3>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
            <p className="text-neutral-500 text-sm">
              Total Billing
            </p>

            <h3 className="text-2xl font-bold text-white mt-2">
              ₹
              {(
                stats.totalBilling / 100
              ).toLocaleString()}
            </h3>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
            <p className="text-neutral-500 text-sm">
              Active Memberships
            </p>

            <h3 className="text-2xl font-bold text-blue-400 mt-2">
              {stats.activeMemberships}
            </h3>
          </div>

        </div>

        {/* ACTIVE MEMBERSHIPS */}
        <div className="space-y-5 mb-10">

          <h2 className="text-2xl font-bold">
            Active Memberships
          </h2>

          {activeSubscriptions.map((sub) => {

            // Calculate days remaining from today or start date (whichever is later)
            const today = new Date();
            const startDate = new Date(sub.startDate);
            const endDate = new Date(sub.endDate);
            
            // If subscription hasn't started yet, show total duration
            const effectiveStartDate = today > startDate ? today : startDate;
            
            const daysLeft = Math.max(
              0,
              Math.ceil(
                (endDate.getTime() -
                  effectiveStartDate.getTime()) /
                  (1000 *
                    60 *
                    60 *
                    24)
              )
            );
            
            // Calculate total subscription days for reference
            const totalDays = Math.ceil(
              (endDate.getTime() - startDate.getTime()) / 
              (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={sub.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"
              >

                <div className="flex items-start justify-between flex-wrap gap-5">

                  <div>

                    <div className="flex items-center gap-3">

                      <h3 className="text-xl font-bold">
                        {sub.package.name}
                      </h3>

                      <div className={`px-3 py-1 rounded-full text-xs ${
                        sub.status === "ACTIVE" 
                          ? "bg-lime-400/15 text-lime-400"
                          : sub.status === "FROZEN"
                          ? "bg-blue-400/15 text-blue-400"
                          : "bg-neutral-400/15 text-neutral-400"
                      }`}>
                        {sub.status}
                      </div>

                    </div>

                    <p className="text-neutral-400 mt-2">
                      {
                        sub.package.service
                          .name
                      }{" "}
                      •{" "}
                      {sub.branch?.name}
                    </p>

                  </div>

                  <div className="flex gap-3 flex-wrap">
                    {sub.status === "ACTIVE" ? (
                      <button 
                        className="h-11 px-5 rounded-2xl border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition"
                        onClick={() => {
                          setSelectedSubscriptionId(sub.id);
                          setOpenFreezeModal(true);
                        }}
                      >
                        Freeze
                      </button>
                    ) : sub.status === "FROZEN" ? (
                      <button 
                        className="h-11 px-5 rounded-2xl border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition"
                        onClick={async () => {
                          const confirmUnfreeze = confirm("Are you sure you want to unfreeze this subscription? The subscription end date will be extended.");
                          if (!confirmUnfreeze) return;
                          
                          try {
                            const res = await fetch(
                              `/api/subscriptions/${sub.id}/unfreeze`,
                              {
                                method: "PATCH",
                              }
                            );
                            
                            const data = await res.json();
                            
                            if (!data.success) {
                              alert(data.message || "Failed to unfreeze");
                              return;
                            }
                            
                            alert(`Subscription unfrozen successfully! Extended by ${data.freezeDays} days.`);
                            fetchMember();
                          } catch (e) {
                            console.error(e);
                            alert("Something went wrong");
                          }
                        }}
                      >
                        Unfreeze
                      </button>
                    ) : null}
                    
                    <button className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold">
                      Upgrade / Renew
                    </button>
                  </div>

                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-6">

                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                    <p className="text-xs text-neutral-500">
                      Start Date
                    </p>

                    <h3 className="mt-2">
                      {new Date(
                        sub.startDate
                      ).toLocaleDateString()}
                    </h3>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                    <p className="text-xs text-neutral-500">
                      Expiry
                    </p>

                    <h3 className="mt-2">
                      {new Date(
                        sub.endDate
                      ).toLocaleDateString()}
                    </h3>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                    <p className="text-xs text-neutral-500">
                      {sub.status === "FROZEN" ? "Status" : today < startDate ? "Starts In" : "Remaining"}
                    </p>

                    <h3 className="mt-2 text-lime-400">
                      {sub.status === "FROZEN" ? "FROZEN" : `${daysLeft} / ${totalDays} Days`}
                    </h3>
                  </div>

                </div>

                {/* Show freeze dates if frozen */}
                {sub.status === "FROZEN" && sub.freezeStart && sub.freezeEnd && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-blue-950/20 border border-blue-800/40 rounded-2xl p-4">
                      <p className="text-xs text-blue-400">
                        Freeze Start
                      </p>
                      <h3 className="mt-2 text-white">
                        {new Date(sub.freezeStart).toLocaleDateString()}
                      </h3>
                    </div>
                    <div className="bg-blue-950/20 border border-blue-800/40 rounded-2xl p-4">
                      <p className="text-xs text-blue-400">
                        Freeze End
                      </p>
                      <h3 className="mt-2 text-white">
                        {new Date(sub.freezeEnd).toLocaleDateString()}
                      </h3>
                    </div>
                  </div>
                )}

                </div>
            )
          })}

        </div>

        {/* BILLING */}
        <div>

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-2xl font-bold">
              Billing & Payments
            </h2>

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

          <div className="space-y-5">

            {member.invoices.map(
              (invoice: any) => {


                return (
                  <div
                    key={invoice.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"
                  >

                    <div className="flex items-start justify-between flex-wrap gap-5">

                      <div>

                        <div className="flex items-center gap-3">

                          <h3 className="text-xl font-bold">
                            {
                              invoice.invoiceNumber
                            }
                          </h3>

                          <div
                            className={`px-3 py-1 rounded-full text-xs ${
                              invoice.status ===
                              "FULLY_PAID"
                                ? "bg-lime-400/15 text-lime-400"
                                : invoice.status ===
                                  "PARTIAL_PAID"
                                ? "bg-yellow-400/15 text-yellow-400"
                                : "bg-red-400/15 text-red-400"
                            }`}
                          >
                            {invoice.status.replace(
                              "_",
                              " "
                            )}
                          </div>

                        </div>

                        <p className="text-neutral-400 mt-2">
                          {
                            invoice.branchName
                          }{" "}
                          •{" "}
                          {
                            invoice.serviceName
                          }{" "}
                          •{" "}
                          {
                            invoice.packageName
                          }
                        </p>

                      </div>

{/* ===================================================== */
/* INVOICE ACTIONS */
/* ===================================================== */}

<div className="flex gap-3 flex-wrap">

  { invoice.status !== "CANCELLED" && invoice.status !== "PENDING" && <button
    className="h-11 px-5 rounded-2xl border border-neutral-700"
    onClick={() => {
      setSelectedInvoice(invoice);
      setOpenEditInvoice(true);
    }}
  >
    Edit Invoice
  </button>}

  {
  invoice.status !== "FULLY_PAID" && invoice.status !== "CANCELLED" && (
    <button
      onClick={async () => {
        const confirmDelete =
          confirm(
            "Are you sure you want to cancel this invoice?"
          );

        if (!confirmDelete)
          return;

        try {
          const res = await fetch(
            `/api/invoices/${invoice.id}`,
            {
              method: "DELETE",
            }
          );

          const data =
            await res.json();

          if (!data.success) {
            alert(data.message);
            return;
          }

          fetchMember();
        } catch (e) {
          console.log(e);
        }
      }}
      className="h-11 px-5 rounded-2xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
    >
      Cancel Invoice
    </button>
  )
}

  {invoice.status === "PARTIAL_PAID" || invoice.status === "FULLY_PAID" && <button
    className="h-11 px-5 rounded-2xl border border-neutral-700 flex items-center gap-2"
    onClick={() =>
      window.open(
        `/api/invoice/${invoice.id}`,
        "_blank"
      )
    }
  >
    <Download size={16} />
    Invoice
  </button>}

  {invoice.balanceAmount > 0 && (
    <button
      className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold"
      onClick={() => {
        setOpenCollect(true);
        setSelectedInvoiceId(invoice.id);
        setPendingAmount(invoice.balanceAmount);
      }}
    >
      Collect Balance
    </button>
  )}

</div>
                     
                    </div>

                    {/* SUMMARY */}
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mt-6">

                      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                        <p className="text-xs text-neutral-500">
                          Package
                        </p>

                        <h3 className="mt-2">
                          ₹
                          {(
                            invoice.packageAmount /
                            100
                          ).toLocaleString()}
                        </h3>
                      </div>

                      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                        <p className="text-xs text-neutral-500">
                          Discount
                        </p>

                        <h3 className="mt-2 text-red-400">
                          -₹
                          {(
                            invoice.discountAmount /
                            100
                          ).toLocaleString()}
                        </h3>
                      </div>

                      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                        <p className="text-xs text-neutral-500">
                          Subtotal
                        </p>

                        <h3 className="mt-2">
                          ₹
                          {(
                            invoice.finalAmount /
                            100
                          ).toLocaleString()}
                        </h3>
                      </div>

                      {/* GST Breakdown */}
                      {(invoice.cgstAmount > 0 || invoice.sgstAmount > 0) && (
                        <>
                          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                            <p className="text-xs text-neutral-500">
                              CGST {invoice.cgstPercentage ? `(${invoice.cgstPercentage}%)` : ''}
                            </p>

                            <h3 className="mt-2 text-neutral-400">
                              ₹
                              {(
                                (invoice.cgstAmount || 0) /
                                100
                              ).toLocaleString()}
                            </h3>
                          </div>

                          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                            <p className="text-xs text-neutral-500">
                              SGST {invoice.sgstPercentage ? `(${invoice.sgstPercentage}%)` : ''}
                            </p>

                            <h3 className="mt-2 text-neutral-400">
                              ₹
                              {(
                                (invoice.sgstAmount || 0) /
                                100
                              ).toLocaleString()}
                            </h3>
                          </div>
                        </>
                      )}

                      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                        <p className="text-xs text-neutral-500">
                          Invoice Total
                        </p>

                        <h3 className="mt-2 font-semibold">
                          ₹
                          {(
                            (invoice.finalAmount + (invoice.totalTax || 0)) /
                            100
                          ).toLocaleString()}
                        </h3>
                      </div>

                      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                        <p className="text-xs text-neutral-500">
                          Paid
                        </p>

                        <h3 className="mt-2 text-lime-400">
                          ₹
                          {(
                            invoice.paidAmount /
                            100
                          ).toLocaleString()}
                        </h3>
                      </div>

                      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 xl:col-span-7">
                        <p className="text-xs text-neutral-500">
                          Balance Due
                        </p>

                        <h3 className="mt-2 text-yellow-400">
                          ₹
                          {(
                            invoice.balanceAmount /
                            100
                          ).toLocaleString()}
                        </h3>
                      </div>

                    </div>

                    {/* PROGRESS */}
                   

                    {/* PAYMENTS */}
                    <div className="mt-8">

                      <h3 className="text-lg font-semibold mb-4">
                        Payment History
                      </h3>

                      <div className="space-y-3">

                        {invoice.payments.map(
                          (payment: any) => (
                            <div
                              key={payment.id}
                              className="bg-neutral-950 border border-neutral-800 justify-between rounded-2xl p-4 flex flex-wrap gap-4"
                            >


<div className="flex gap-4">

  <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center">
    <Wallet size={18} />
  </div>

  <div>

    <div className="flex items-center gap-2 flex-wrap">

      <h4 className="font-semibold">
        {payment.receiptNumber}
      </h4>

      {/* PAYMENT STATUS */}
      <div
        className={`px-2 py-1 rounded-full text-[10px] ${
          payment.status === "VOIDED"
            ? "bg-red-500/15 text-red-400"
            : "bg-lime-400/15 text-lime-400"
        }`}
      >
        {payment.status === "VOIDED"
          ? "Cancelled"
          : payment.status}
      </div>

      {/* PAYMENT TYPE */}
      <div className="px-2 py-1 rounded-full bg-neutral-800 text-[10px]">
        {payment.paymentType}
      </div>

    </div>

    <p className="text-neutral-400 text-sm mt-1">
      {payment.paymentMode} •{" "}
      {formatPaidAt(payment.paidAt)}
    </p>

    {payment.notes && (
      <p className="text-xs mt-1 text-blue-400">
        <span>Notes: </span>
        {payment.notes}
      </p>
    )}

    {/* VOIDED INFO */}
    {payment.status === "VOIDED" && (
      <p className="text-xs mt-2 text-red-400">
        This payment has been cancelled
      </p>
    )}

  </div>

</div>

{/* ACTIONS */}
<div className="flex gap-3 flex-wrap">

  {/* RECEIPT */}
  {payment.status === "PAID" && <button
    className="h-11 px-5 rounded-2xl border border-neutral-700 flex items-center gap-2 hover:bg-neutral-800 transition"
    onClick={() =>
      window.open(
        `/api/receipt/${payment.id}`,
        "_blank"
      )
    }
  >
    <CreditCard size={16} />
    Receipt
  </button>}

  {/* ONLY SHOW ACTIONS IF NOT VOIDED */}
  {payment.status !== "VOIDED" && (
    <>
      {/* EDIT */}
      <button
        className="h-11 px-5 rounded-2xl border border-neutral-700 hover:bg-neutral-800 transition"
        onClick={() => {
          setSelectedPayment(payment);
          setOpenEditPayment(true);
        }}
      >
        Edit Payment
      </button>

      {/* CANCEL */}
      <button
        className="h-11 px-5 rounded-2xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
        onClick={() => {
          setSelectedPayment(payment);
          setOpenVoidPayment(true);
        }}
      >
        Cancel Payment
      </button>
    </>
  )}

</div>

                          
                            </div>
                          )
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}

           

          </div>

        </div>

      {
              openCollect && <CollectBalanceModal balanceAmount={pendingAmount} invoiceId={selectedInvoiceId} member={member} onClose={() => {
                setOpenCollect(false);
              }} open={openCollect}  onSuccess={() => {
                fetchMember()
              }} />
            }

            {
              openMemberModal && <MemberModal member={member} open={openMemberModal} setOpen={setOpenMemberModal} onSuccess={() => {
                fetchMember();
                console.log('las')
              }}/>
            }
{
  openEditInvoice && (
    <EditInvoiceModal
      invoice={selectedInvoice}
      open={openEditInvoice}
      onClose={() =>
        setOpenEditInvoice(false)
      }
      onSuccess={fetchMember}
    />
  )
}

{
  openEditPayment && (
    <EditPaymentModal
      payment={selectedPayment}
      open={openEditPayment}
      onClose={() =>
        setOpenEditPayment(false)
      }
      onSuccess={fetchMember}
    />
  )
}

{
  openVoidPayment && (
    <VoidPaymentModal
      payment={selectedPayment}
      open={openVoidPayment}
      onClose={() =>
        setOpenVoidPayment(false)
      }
      onSuccess={fetchMember}
    />
  )
}

{
  openFreezeModal && selectedSubscriptionId && (
    <FreezeModal
      subscriptionId={selectedSubscriptionId}
      open={openFreezeModal}
      onClose={() => {
        setOpenFreezeModal(false);
        setSelectedSubscriptionId(null);
      }}
      onSuccess={() => {
        fetchMember();
        setOpenFreezeModal(false);
        setSelectedSubscriptionId(null);
      }}
    />
  )
}

    </div>
    </div>
  );
};

export default Detail;