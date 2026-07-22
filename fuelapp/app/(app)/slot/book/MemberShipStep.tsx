import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";

import tw from "twrnc";

import {
  Building2,
  Package,
  Check,
  ChevronRight,
} from "lucide-react-native";

interface MembershipStepProps {
  subscriptions: any[];
  selectedSubscription: any;
  setSelectedSubscription: (
    subscription: any
  ) => void;
  onContinue: () => void;
}

export default function MembershipStep({
  subscriptions,
  selectedSubscription,
  setSelectedSubscription,
  onContinue,
}: MembershipStepProps) {
  return (
    <View>
      {/* Header */}

      <View style={tw`mb-5`}>
        <Text
          style={tw`text-white text-xl font-bold`}
        >
          Select Membership
        </Text>

        <Text
          style={tw`text-neutral-400 mt-2 leading-5`}
        >
          Choose the membership you want to
          use for this booking.
        </Text>
      </View>

      {/* Empty */}

      {subscriptions.length === 0 ? (
        <View
          style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-6 items-center`}
        >
          <Package
            size={40}
            color="#737373"
          />

          <Text
            style={tw`text-neutral-400 mt-4 text-center`}
          >
            No active memberships found.
          </Text>
        </View>
      ) : (
        <>
          {subscriptions.map(
            (subscription: any) => {
              const selected =
                selectedSubscription?.id ===
                subscription.id;

              return (
                <TouchableOpacity
                  key={subscription.id}
                  activeOpacity={0.85}
                  onPress={() =>
                    setSelectedSubscription(
                      subscription
                    )
                  }
                  style={[
                    tw`rounded-3xl p-5 mb-4 border`,
                    selected
                      ? {
                          borderColor:
                            "#A3E635",
                          backgroundColor:
                            "rgba(163,230,53,0.06)",
                        }
                      : {
                          borderColor:
                            "#262626",
                          backgroundColor:
                            "#171717",
                        },
                  ]}
                >
                  <View
                    style={tw`flex-row justify-between`}
                  >
                    <View
                      style={tw`flex-1`}
                    >
                      {/* Branch */}

                      <View
                        style={tw`flex-row items-center`}
                      >
                        <Building2
                          size={16}
                          color="#A3E635"
                        />

                        <Text
                          style={tw`text-white ml-2 font-semibold`}
                        >
                          {
                            subscription
                              .branchName
                          }
                        </Text>
                      </View>

                      {/* Package */}

                      <View
                        style={tw`flex-row items-center mt-3`}
                      >
                        <Package
                          size={16}
                          color="#A3A3A3"
                        />

                        <Text
                          style={tw`text-neutral-300 ml-2 flex-1`}
                        >
                          {[
                            subscription.serviceName,
                            subscription.packageName,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </Text>
                      </View>

                      {/* Expiry */}

                      <Text
                        style={tw`text-neutral-500 text-xs mt-4`}
                      >
                        Valid until{" "}
                        {new Date(
                          subscription.endDate
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </Text>
                    </View>

                    {/* Selected */}

                    {selected && (
                      <View
                        style={[
                          tw`h-9 w-9 rounded-full items-center justify-center`,
                          {
                            backgroundColor:
                              "#A3E635",
                          },
                        ]}
                      >
                        <Check
                          size={18}
                          color="#000"
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }
          )}

          {/* Continue */}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!selectedSubscription}
            onPress={onContinue}
            style={[
              tw`rounded-2xl py-4 flex-row justify-center items-center mt-2`,
              selectedSubscription
                ? {
                    backgroundColor:
                      "#A3E635",
                  }
                : {
                    backgroundColor:
                      "#404040",
                  },
            ]}
          >
            <Text
              style={[
                tw`font-bold text-base`,
                {
                  color:
                    selectedSubscription
                      ? "#000"
                      : "#A3A3A3",
                },
              ]}
            >
              Continue
            </Text>

            <ChevronRight
              size={18}
              color={
                selectedSubscription
                  ? "#000"
                  : "#A3A3A3"
              }
              style={{
                marginLeft: 8,
              }}
            />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}