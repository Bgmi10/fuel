import React, {
    useEffect,
    useRef,
    useState,
  } from "react";
  
  import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
  } from "react-native";
  
  import tw from "twrnc";
  
  import {
    Search,
    Utensils,
    X,
  } from "lucide-react-native";
  
  import { request } from "../../../../src/api/client";
  
  interface FoodSearchInputProps {
    onSelect: (food: any) => void;
  }
  
  export default function FoodSearchInput({
    onSelect,
  }: FoodSearchInputProps) {
    const [query, setQuery] =
      useState("");

      const skipNextSearchRef =
  useRef(false);
  
    const [results, setResults] =
      useState<any[]>([]);
  
    const [loading, setLoading] =
      useState(false);
  
    const [error, setError] =
      useState<string | null>(null);
  
    const requestIdRef = useRef(0);
  
    useEffect(() => {
        if (skipNextSearchRef.current) {
          skipNextSearchRef.current =
            false;
      
          return;
        }
      
        const normalizedQuery =
          query.trim();
      
        if (
          normalizedQuery.length < 2
        ) {
          setResults([]);
          setLoading(false);
          setError(null);
          return;
        }
      
        const timer = setTimeout(() => {
          searchFoods(normalizedQuery);
        }, 450);
      
        return () =>
          clearTimeout(timer);
      }, [query]);
  
    const searchFoods = async (
      searchQuery: string
    ) => {
      const requestId =
        ++requestIdRef.current;
  
      try {
        setLoading(true);
        setError(null);
  
        const response =
          await request({
            url:
              `/foods/search?query=` +
              encodeURIComponent(
                searchQuery
              ),
          });
  
        /*
          Supports responses such as:
  
          [...]
          { data: [...] }
          { items: [...] }
          { results: [...] }
          { data: { items: [...] } }
        */
        const foods =
          normalizeFoodResults(
            response
          );
  
        // Ignore an older request if a
        // newer search has already started.
        if (
          requestId !==
          requestIdRef.current
        ) {
          return;
        }
  
        setResults(foods);
      } catch (err) {
        console.log(
          "Food search error:",
          err
        );
  
        if (
          requestId !==
          requestIdRef.current
        ) {
          return;
        }
  
        setResults([]);
  
        setError(
          "Unable to search foods."
        );
      } finally {
        if (
          requestId ===
          requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    };
  
    const clearSearch = () => {
      requestIdRef.current += 1;
  
      setQuery("");
      setResults([]);
      setError(null);
      setLoading(false);
    };
  
    const selectFood = (
        result: any
      ) => {
        const selectedFood =
          result?.item ?? result;
      
        // Cancel/ignore any pending search.
        requestIdRef.current += 1;
      
        setLoading(false);
        setResults([]);
        setError(null);
      
        // Prevent the selected name from
        // triggering another API search.
        skipNextSearchRef.current =
          true;
      
        setQuery(
          getFoodName(selectedFood)
        );
      
        // Send the actual food object,
        // not the result wrapper.
        onSelect(selectedFood);
      };
  
    return (
      <View>
        {/* Search input */}
  
        <View
          style={tw`h-12 flex-row items-center bg-neutral-900 border border-neutral-800 rounded-xl px-4`}
        >
          <Search
            size={19}
            color={
              loading
                ? "#A3E635"
                : "#737373"
            }
          />
  
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search food..."
            placeholderTextColor="#525252"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[
              tw`flex-1 h-full text-white ml-3`,
              {
                fontSize: 15,
              },
            ]}
          />
  
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#A3E635"
            />
          ) : query.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={clearSearch}
              style={tw`h-8 w-8 rounded-lg bg-neutral-800 items-center justify-center`}
            >
              <X
                size={16}
                color="#A3A3A3"
              />
            </TouchableOpacity>
          ) : null}
        </View>
  
        {/* Hint */}
  
        {query.trim().length === 1 && (
          <Text
            style={tw`text-neutral-500 text-xs mt-2`}
          >
            Enter at least 2 characters
            to search.
          </Text>
        )}
  
        {/* Error */}
  
        {!!error && (
          <View
            style={tw`bg-red-400/10 border border-red-400/20 rounded-xl p-3 mt-3`}
          >
            <Text
              style={tw`text-red-400 text-sm`}
            >
              {error}
            </Text>
          </View>
        )}
  
        {/* Results */}
  
        {!loading &&
          query.trim().length >= 2 &&
          results.length === 0 &&
          !error && (
            <View
              style={tw`border border-neutral-800 bg-neutral-900 rounded-2xl p-5 mt-3 items-center`}
            >
              <Utensils
                size={24}
                color="#525252"
              />
  
              <Text
                style={tw`text-neutral-500 text-sm mt-2`}
              >
                No foods found
              </Text>
            </View>
          )}
  
        {results.length > 0 && (
          <View
            style={tw`border border-neutral-800 bg-neutral-900 rounded-2xl overflow-hidden mt-3`}
          >
            {results
              .slice(0, 12)
              .map(
                (
                  result: any,
                  index: number
                ) => {
                  const food =
                    result?.item ??
                    result;
  
                  const calories =
                    getCalories(food);
  
                  const firstServing =
                    food
                      ?.serving_sizes
                      ?.[0];
  
                  return (
                    <TouchableOpacity
                      key={
                        food?.id ??
                        `${getFoodName(
                          food
                        )}-${index}`
                      }
                      activeOpacity={0.8}
                      onPress={() =>
                        selectFood(result)
                      }
                      style={[
                        tw`p-4`,
                        index <
                          Math.min(
                            results.length,
                            12
                          ) -
                            1 &&
                          tw`border-b border-neutral-800`,
                      ]}
                    >
                      <View
                        style={tw`flex-row items-start`}
                      >
                        <View
                          style={[
                            tw`h-10 w-10 rounded-xl items-center justify-center`,
                            {
                              backgroundColor:
                                "rgba(163,230,53,0.08)",
                            },
                          ]}
                        >
                          <Utensils
                            size={18}
                            color="#A3E635"
                          />
                        </View>
  
                        <View
                          style={tw`flex-1 ml-3`}
                        >
                          <Text
                            numberOfLines={2}
                            style={tw`text-white font-semibold leading-5`}
                          >
                            {getFoodName(
                              food
                            )}
                          </Text>
  
                          {!!food?.brand_name && (
                            <Text
                              numberOfLines={1}
                              style={tw`text-neutral-500 text-xs mt-1`}
                            >
                              {
                                food.brand_name
                              }
                            </Text>
                          )}
  
                          <View
                            style={tw`flex-row flex-wrap mt-2`}
                          >
                            {calories !==
                              null && (
                              <Text
                                style={tw`text-neutral-300 text-xs mr-3`}
                              >
                                {formatNumber(
                                  calories
                                )}{" "}
                                kcal
                              </Text>
                            )}
  
                            {!!firstServing?.unit && (
                              <Text
                                style={tw`text-neutral-500 text-xs`}
                              >
                                {
                                  firstServing.unit
                                }
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }
              )}
          </View>
        )}
      </View>
    );
  }
  
  function normalizeFoodResults(
    response: any
  ): any[] {
    if (Array.isArray(response)) {
      return response;
    }
  
    if (
      Array.isArray(response?.data)
    ) {
      return response.data;
    }
  
    if (
      Array.isArray(
        response?.items
      )
    ) {
      return response.items;
    }
  
    if (
      Array.isArray(
        response?.results
      )
    ) {
      return response.results;
    }
  
    if (
      Array.isArray(
        response?.data?.items
      )
    ) {
      return response.data.items;
    }
  
    if (
      Array.isArray(
        response?.data?.results
      )
    ) {
      return response.data.results;
    }
  
    return [];
  }
  
  function getFoodName(
    food: any
  ) {
    return (
      food?.description ||
      food?.foodName ||
      food?.name ||
      "Unknown food"
    );
  }
  
  function getCalories(
    food: any
  ): number | null {
    const value =
      food?.nutritional_contents
        ?.energy?.value ??
      food?.calories;
  
    const number = Number(value);
  
    return Number.isFinite(number)
      ? number
      : null;
  }
  
  function formatNumber(
    value: any
  ) {
    const number = Number(
      value ?? 0
    );
  
    return Number.isFinite(number)
      ? number.toFixed(1)
      : "0.0";
  }