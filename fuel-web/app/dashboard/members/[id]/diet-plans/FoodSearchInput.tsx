"use client";

import { useEffect, useState } from "react";

export default function FoodSearchInput({
  onSelect,
}: {
  onSelect: (food: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setFoods([]);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(
          `/api/foods/search?query=${encodeURIComponent(
            query
          )}`
        );

        const data = await res.json();

        setFoods(data?.data?.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-2 relative">
      <input
        value={query}
        onChange={(e) =>
          setQuery(e.target.value)
        }
        placeholder="Search food..."
        className="w-full h-11 px-4 rounded-xl bg-neutral-800 border border-neutral-700"
      />

      {loading && (
        <p className="text-xs text-neutral-500">
          Searching...
        </p>
      )}

      {foods.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl max-h-96 overflow-y-auto">
          {foods.map((food: any) => {
            const item = food.item;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setFoods([]);
                  setQuery("");
                }}
                className="w-full text-left p-4 border-b border-neutral-800 hover:bg-neutral-900 transition"
              >
                <div className="font-medium text-white">
                  {item.description}
                </div>

                <div className="text-xs text-neutral-400 mt-1">
                  {item.brand_name}
                </div>

                <div className="flex gap-3 mt-2 text-xs text-neutral-500">
                  <span>
                    {" "}
                    {
                      item.nutritional_contents
                        ?.energy?.value
                    }{" "}
                    cal
                  </span>

                  <span>
                    P{" "}
                    {
                      item.nutritional_contents
                        ?.protein
                    }
                    g
                  </span>

                  <span>
                    C{" "}
                    {
                      item.nutritional_contents
                        ?.carbohydrates
                    }
                    g
                  </span>

                  <span>
                    F{" "}
                    {
                      item.nutritional_contents
                        ?.fat
                    }
                    g
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}