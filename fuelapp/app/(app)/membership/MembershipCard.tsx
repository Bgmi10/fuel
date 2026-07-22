import React, { useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";

import tw from "twrnc";

import {
  Calendar,
  Building2,
  Receipt,
  Download,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Snowflake,
} from "lucide-react-native";

import { request } from "../../../src/api/client";
import { API_BASE_URL, BASE_URL } from "../../../src/constants/config";

interface MembershipCardProps {
    subscription: any;
  }
  
  export default function MembershipCard({
    subscription,
  }: MembershipCardProps) {

    const [paying, setPaying] =
  useState(false);

const invoice =
  subscription.invoice;


  const handlePayNow = async () => {
    try {
      setPaying(true);
  
      const data = await request({
        url: "/payment/collect-balance/razorpay",
        method: "POST",
        data: {
          invoiceId: invoice.id,
          amount: invoice.balanceAmount,
        },
      });
  
      if (!data.success) {
        Alert.alert("Payment", data.message);
        return;
      }
  
      const checkoutUrl =
        `${BASE_URL}/payment/checkout?` +
        new URLSearchParams({
          orderId: data.orderId,
          invoiceId: invoice.id,
          amount: String(data.amount),
  
          name: data.member.name ?? "",
          phone: data.member.phone ?? "",
          email: data.member.email ?? "",
  
          service: subscription.serviceName,
          package: subscription.packageName,
        }).toString();
  
      await Linking.openURL(checkoutUrl);
    } catch (err) {
      console.log(err);
      Alert.alert(
        "Payment",
        "Something went wrong."
      );
    } finally {
      setPaying(false);
    }
  };


  const downloadInvoice =
  () => {
    Linking.openURL(
      `${API_BASE_URL}/invoice/${invoice.id}`
    );
  };



  const downloadReceipt = (
    paymentId: string
  ) => {
    Linking.openURL(
      `${API_BASE_URL}/receipt/${paymentId}`
    );
  };



  const daysRemaining =
  () => {
    const now =
      new Date();

    const end =
      new Date(
        subscription.endDate
      );

    const diff =
      Math.ceil(
        (end.getTime() -
          now.getTime()) /
          (1000 *
            60 *
            60 *
            24)
      );

    return diff > 0
      ? diff
      : 0;
  };



  return (
    <View
    style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-6 mb-5`}
    >

          {/* Header */}

          <View
        style={tw`flex-row justify-between items-start`}
      >
        <View style={tw`flex-1`}>
          <Text
            style={tw`text-white text-xl font-bold`}
          >
            {subscription.serviceName}
          </Text>

          <Text
            style={tw`text-neutral-400 mt-1`}
          >
            {subscription.packageName}
          </Text>
        </View>

        {/* Status Badge */}

        {subscription.status ===
        "ACTIVE" ? (
          <View
            style={[
              tw`px-3 py-2 rounded-full flex-row items-center`,
              {
                backgroundColor:
                  "rgba(74,222,128,0.12)",
              },
            ]}
          >
            <CheckCircle2
              size={15}
              color="#4ADE80"
            />

            <Text
              style={[
                tw`ml-2 font-semibold text-xs`,
                {
                  color: "#4ADE80",
                },
              ]}
            >
              ACTIVE
            </Text>
          </View>
        ) : subscription.status ===
          "FROZEN" ? (
          <View
            style={[
              tw`px-3 py-2 rounded-full flex-row items-center`,
              {
                backgroundColor:
                  "rgba(96,165,250,0.12)",
              },
            ]}
          >
            <Snowflake
              size={15}
              color="#60A5FA"
            />

            <Text
              style={[
                tw`ml-2 font-semibold text-xs`,
                {
                  color: "#60A5FA",
                },
              ]}
            >
              FROZEN
            </Text>
          </View>
        ) : subscription.status ===
          "EXPIRED" ? (
          <View
            style={[
              tw`px-3 py-2 rounded-full flex-row items-center`,
              {
                backgroundColor:
                  "rgba(248,113,113,0.12)",
              },
            ]}
          >
            <AlertCircle
              size={15}
              color="#F87171"
            />

            <Text
              style={[
                tw`ml-2 font-semibold text-xs`,
                {
                  color: "#F87171",
                },
              ]}
            >
              EXPIRED
            </Text>
          </View>
        ) : (
          <View
            style={[
              tw`px-3 py-2 rounded-full flex-row items-center`,
              {
                backgroundColor:
                  "rgba(251,191,36,0.12)",
              },
            ]}
          >
            <Clock
              size={15}
              color="#FBBF24"
            />

            <Text
              style={[
                tw`ml-2 font-semibold text-xs`,
                {
                  color: "#FBBF24",
                },
              ]}
            >
              {subscription.status}
            </Text>
          </View>
        )}
      </View>

      {/* Branch */}

      <View
        style={tw`flex-row items-center mt-5`}
      >
        <Building2
          size={18}
          color="#A3A3A3"
        />

        <Text
          style={tw`text-neutral-300 ml-3`}
        >
          {subscription.branchName}
        </Text>
      </View>

      {/* Membership Dates */}

      <View
        style={tw`mt-6 bg-black rounded-2xl p-4 border border-neutral-800`}
      >
        <View
          style={tw`flex-row items-center mb-4`}
        >
          <Calendar
            size={18}
            color="#A3E635"
          />

          <Text
            style={tw`text-white font-bold ml-2`}
          >
            Membership Duration
          </Text>
        </View>

        <View
          style={tw`flex-row justify-between`}
        >
          <View>
            <Text
              style={tw`text-neutral-500 text-xs`}
            >
              Start Date
            </Text>

            <Text
              style={tw`text-white mt-1`}
            >
              {new Date(
                subscription.startDate
              ).toLocaleDateString(
                "en-IN"
              )}
            </Text>
          </View>

          <View>
            <Text
              style={tw`text-neutral-500 text-xs`}
            >
              End Date
            </Text>

            <Text
              style={tw`text-white mt-1`}
            >
              {new Date(
                subscription.endDate
              ).toLocaleDateString(
                "en-IN"
              )}
            </Text>
          </View>
        </View>

        <View
          style={tw`mt-5`}
        >
          <Text
            style={tw`text-neutral-500 text-xs`}
          >
            Remaining
          </Text>

          <Text
            style={tw`text-lime-400 text-lg font-bold mt-1`}
          >
            {daysRemaining()} Days
          </Text>
        </View>
      </View>

            {/* Freeze Details */}

            {subscription.status ===
        "FROZEN" && (
        <View
          style={[
            tw`mt-5 rounded-2xl border p-4`,
            {
              backgroundColor:
                "rgba(96,165,250,0.08)",
              borderColor:
                "rgba(96,165,250,0.20)",
            },
          ]}
        >
          <View
            style={tw`flex-row items-center mb-3`}
          >
            <Snowflake
              size={18}
              color="#60A5FA"
            />

            <Text
              style={tw`text-white font-bold ml-2`}
            >
              Membership Frozen
            </Text>
          </View>

          <View
            style={tw`flex-row justify-between`}
          >
            <View>
              <Text
                style={tw`text-neutral-500 text-xs`}
              >
                Freeze Start
              </Text>

              <Text
                style={tw`text-white mt-1`}
              >
                {subscription.freezeStartDate
                  ? new Date(
                      subscription.freezeStartDate
                    ).toLocaleDateString(
                      "en-IN"
                    )
                  : "-"}
              </Text>
            </View>

            <View>
              <Text
                style={tw`text-neutral-500 text-xs`}
              >
                Freeze End
              </Text>

              <Text
                style={tw`text-white mt-1`}
              >
                {subscription.freezeEndDate
                  ? new Date(
                      subscription.freezeEndDate
                    ).toLocaleDateString(
                      "en-IN"
                    )
                  : "-"}
              </Text>
            </View>
          </View>

          {subscription.freezeReason && (
            <View
              style={tw`mt-4`}
            >
              <Text
                style={tw`text-neutral-500 text-xs`}
              >
                Reason
              </Text>

              <Text
                style={tw`text-neutral-300 mt-1`}
              >
                {subscription.freezeReason}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Invoice */}

      {invoice && (

<View style={tw`pb-5 border-b border-neutral-800`}>

<View style={tw`flex-row justify-between mb-3`}>
  <Text style={tw`text-neutral-500 text-xs`}>
    Invoice Number
  </Text>

  <Text style={tw`text-white`}>
    {invoice.invoiceNumber}
  </Text>
</View>

<View style={tw`flex-row justify-between mb-3`}>
  <Text style={tw`text-neutral-500 text-xs`}>
    Package Amount
  </Text>

  <Text style={tw`text-white`}>
    ₹{(invoice.packageAmount / 100).toLocaleString()}
  </Text>
</View>

{invoice.discountAmount > 0 && (
  <View style={tw`flex-row justify-between mb-3`}>
    <Text style={tw`text-neutral-500 text-xs`}>
      Discount Applied
    </Text>

    <Text style={{ color: "#4ADE80" }}>
      -₹{(invoice.discountAmount / 100).toLocaleString()}
    </Text>
  </View>
)}

{(invoice.cgstAmount > 0 ||
  invoice.sgstAmount > 0) && (
  <>
    <View style={tw`flex-row justify-between mb-3`}>
      <Text style={tw`text-neutral-500 text-xs`}>
        CGST ({invoice.cgstPercentage || 0}%)
      </Text>

      <Text style={tw`text-white`}>
        +₹{((invoice.cgstAmount || 0) / 100).toFixed(2)}
      </Text>
    </View>

    <View style={tw`flex-row justify-between`}>
      <Text style={tw`text-neutral-500 text-xs`}>
        SGST ({invoice.sgstPercentage || 0}%)
      </Text>

      <Text style={tw`text-white`}>
        +₹{((invoice.sgstAmount || 0) / 100).toFixed(2)}
      </Text>
    </View>

    
  </>

  
)}



<View style={tw`pt-5`}>

  <View style={tw`flex-row justify-between mb-4`}>
    <Text style={tw`text-white font-semibold`}>
      Total Amount
    </Text>

    <Text style={tw`text-white text-2xl font-bold`}>
      ₹
      {(
        (invoice.finalAmount +
          (invoice.totalTax || 0)) /
        100
      ).toLocaleString()}
    </Text>
  </View>

  <View style={tw`flex-row justify-between mb-4`}>
    <Text style={tw`text-neutral-400`}>
      Amount Paid
    </Text>

    <Text style={{ color: "#4ADE80" }}>
      ₹
      {(invoice.paidAmount / 100).toLocaleString()}
    </Text>
  </View>
  </View>

  {invoice.balanceAmount > 0 ? (

<View
style={[
tw`rounded-2xl p-4 flex-row justify-between`,
{
backgroundColor:"rgba(248,113,113,0.08)",
borderWidth:1,
borderColor:"rgba(248,113,113,0.2)"
}
]}
>

<Text
style={{
color:"#F87171",
fontWeight:"600"
}}
>
Balance Due
</Text>

<Text
style={{
color:"#F87171",
fontWeight:"700",
fontSize:22
}}
>
₹{(invoice.balanceAmount/100).toLocaleString()}
</Text>

</View>

) : (

<View
style={[
tw`rounded-2xl p-4 flex-row justify-between items-center`,
{
backgroundColor:"rgba(74,222,128,0.08)",
borderWidth:1,
borderColor:"rgba(74,222,128,0.2)"
}
]}
>

<View style={tw`flex-row items-center`}>

<CheckCircle2
size={18}
color="#4ADE80"
/>

<Text
style={{
marginLeft:8,
color:"#4ADE80",
fontWeight:"600"
}}
>
Fully Paid
</Text>

</View>

<Text
style={{
color:"#4ADE80",
fontWeight:"700"
}}
>
₹0
</Text>

</View>

)}



<View style={tw`mt-5`}>
    {invoice.balanceAmount > 0 && (
        <TouchableOpacity
            onPress={handlePayNow}
            disabled={paying}
            style={tw`bg-red-500 rounded-2xl py-4 flex-row items-center justify-center mb-3`}
        >
            {paying ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <>
                    <Wallet size={18} color="#fff" />
                    <Text style={tw`text-white font-semibold ml-2`}>
                        Pay ₹{(invoice.balanceAmount / 100).toLocaleString()} Now
                    </Text>
                </>
            )}
        </TouchableOpacity>
    )}

    <TouchableOpacity
        onPress={downloadInvoice}
        style={tw`bg-neutral-800 rounded-2xl py-4 flex-row items-center justify-center`}
    >
        <Download size={18} color="#fff" />

        <Text style={tw`text-white font-semibold ml-2`}>
            Download Invoice
        </Text>
    </TouchableOpacity>
</View>

</View>




      )}


      {/* Payment History */}

      {invoice?.payments &&
        invoice.payments.length >
          0 && (
          <View
            style={tw`mt-6`}
          >
            <Text
              style={tw`text-white text-lg font-bold mb-4`}
            >
              Payment History
            </Text>

            {invoice.payments.map(
              (
                payment: any,
                index: number
              ) => (
                <View
                  key={
                    payment.id ??
                    index
                  }
                  style={tw`bg-black border border-neutral-800 rounded-2xl p-4 mb-3`}
                >
                  {/* Top */}

                  <View
                    style={tw`flex-row justify-between items-center`}
                  >
                    <View
                      style={tw`flex-1`}
                    >
                      <Text
                        style={tw`text-white font-semibold`}
                      >
                        ₹
                        {(
                          payment.amount /
                          100
                        ).toLocaleString()}
                      </Text>

                      <Text
                        style={tw`text-neutral-500 text-xs mt-1`}
                      >
                        {new Date(
                          payment.createdAt
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </Text>
                    </View>

                    <View
                      style={[
                        tw`px-3 py-2 rounded-full`,
                        {
                          backgroundColor:
                            "rgba(74,222,128,0.10)",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            "#4ADE80",
                          fontWeight:
                            "600",
                          fontSize: 12,
                        }}
                      >
                        {payment.status}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Method */}

                  <View
                    style={tw`mt-4`}
                  >
                    <Text
                      style={tw`text-neutral-500 text-xs`}
                    >
                      Payment Method
                    </Text>

                    <Text
                      style={tw`text-neutral-300 mt-1`}
                    >
                      {payment.method ??
                        payment.paymentMethod ??
                        "-"}
                    </Text>
                  </View>

                  {/* Transaction Id */}

                  {payment.transactionId && (
                    <View
                      style={tw`mt-4`}
                    >
                      <Text
                        style={tw`text-neutral-500 text-xs`}
                      >
                        Transaction ID
                      </Text>

                      <Text
                        style={tw`text-neutral-300 mt-1`}
                      >
                        {
                          payment.transactionId
                        }
                      </Text>
                    </View>
                  )}

                  {/* Receipt */}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      downloadReceipt(
                        payment.id
                      )
                    }
                    style={tw`mt-5 bg-neutral-800 rounded-xl py-3 flex-row items-center justify-center`}
                  >
                    <Download
                      size={16}
                      color="#FFFFFF"
                    />

                    <Text
                      style={tw`text-white font-semibold ml-2`}
                    >
                      Download Receipt
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        )}

    </View>
  );
}