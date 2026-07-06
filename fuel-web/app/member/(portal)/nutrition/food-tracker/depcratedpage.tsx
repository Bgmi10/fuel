// "use client";

// import { useEffect, useMemo, useState } from "react";
// import {
//   Apple,
//   Flame,
//   Beef,
//   Wheat,
//   Droplets,
//   Plus,
// } from "lucide-react";

// import { useAuth } from "@/app/contexts/MemberAuthContext";
// import FoodTrackingMealCard from "./FoodTrackingMealCard";


// function ProgressCard({
//   icon,
//   title,
//   consumed,
//   target,
// }: any) {
//   const percent = Math.min(
//     (consumed / target) * 100,
//     100
//   );

//   const radius = 34;
//   const circumference =
//     2 * Math.PI * radius;

//   const offset =
//     circumference -
//     (percent / 100) *
//       circumference;

//   return (
//     <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5">

//       <div className="flex items-center justify-between">
//         <span className="text-lime-400">
//           {icon}
//         </span>

//         <span className="text-xs text-neutral-500">
//           {Math.round(percent)}%
//         </span>
//       </div>

//       <div className="mt-4 flex justify-center">

//         <div className="relative w-24 h-24">

//           <svg
//             className="-rotate-90"
//             width="96"
//             height="96"
//           >
//             <circle
//               cx="48"
//               cy="48"
//               r={radius}
//               stroke="rgba(255,255,255,.08)"
//               strokeWidth="8"
//               fill="none"
//             />

//             <circle
//               cx="48"
//               cy="48"
//               r={radius}
//               stroke="#A3E635"
//               strokeWidth="8"
//               fill="none"
//               strokeLinecap="round"
//               strokeDasharray={
//                 circumference
//               }
//               strokeDashoffset={
//                 offset
//               }
//             />
//           </svg>

//           <div className="absolute inset-0 flex flex-col items-center justify-center">
//             <p className="font-bold text-lg">
//               {Math.round(
//                 consumed
//               )}
//             </p>

//             <p className="text-[10px] text-neutral-500">
//               / {target.toFixed(1)}
//             </p>
//           </div>

//         </div>

//       </div>

//       <p className="text-center text-sm text-neutral-400 mt-3">
//         {title}
//       </p>

//     </div>
//   );
// }



// function TrackerSummary({
//     data,
//   }: any) {
//     return (
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  
//         <ProgressCard
//           icon={<Flame />}
//           title="Calories"
//           consumed={
//             data.consumed
//               .calories
//           }
//           target={
//             data.targets
//               .calories
//           }
//         />
  
//         <ProgressCard
//           icon={<Beef />}
//           title="Protein"
//           consumed={
//             data.consumed
//               .protein
//           }
//           target={
//             data.targets
//               .protein
//           }
//         />
  
//         <ProgressCard
//           icon={<Wheat />}
//           title="Carbs"
//           consumed={
//             data.consumed.carbs
//           }
//           target={
//             data.targets.carbs
//           }
//         />
  
//         <ProgressCard
//           icon={<Droplets />}
//           title="Fat"
//           consumed={
//             data.consumed.fat
//           }
//           target={
//             data.targets.fat
//           }
//         />
  
//       </div>
//     );
//   }


// const page = () => {
//     const { user } = useAuth();

// const [loading, setLoading] =
//   useState(true);

  
//   const [meals, setMeals] =
//   useState<any[]>([]);


// const [data, setData] =
//   useState<any>(null);


//   const liveConsumed = useMemo(() => {
//     return meals.reduce(
//       (acc, meal) => {
//         meal.items.forEach((item: any) => {
//           if (!item.consumed) return;
  
//           acc.calories += Number(item.calories || 0);
//           acc.protein += Number(item.protein || 0);
//           acc.carbs += Number(item.carbs || 0);
//           acc.fat += Number(item.fat || 0);
//         });
  
//         return acc;
//       },
//       {
//         calories: 0,
//         protein: 0,
//         carbs: 0,
//         fat: 0,
//       }
//     );
//   }, [meals]);

//   const updateMeal = (
//     mealId: string,
//     updatedMeal: any
//   ) => {
//     setMeals((prev) =>
//       prev.map((meal) =>
//         meal.id === mealId
//           ? updatedMeal
//           : meal
//       )
//     );
//   };

//   useEffect(() => {
//     if (!user?.id) return;
  
//     loadTracker();
//   }, [user?.id]);
  
//   const loadTracker = async () => {
//     try {
//       const res = await fetch(
//         `/api/member/food-tracker/today?memberId=${user?.id}`
//       );
  
//       const json =
//         await res.json();
  
//       setData(json.data);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const startEmpty = async () => {
//     try {
//       const res = await fetch(
//         "/api/member/food-tracker/start-empty",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             memberId: user?.id,
//           }),
//         }
//       );
  
//       if (!res.ok) throw new Error();
  
//       loadTracker();
//     } catch {
//       alert("Failed to start tracking");
//     }
//   };

// useEffect(() => {
//   if (data?.foodLog?.meals) {
//     setMeals(
//       data.foodLog.meals
//     );
//   }
// }, [data]);



//   const startFromPlan =
//   async () => {
//     try {
//       const res = await fetch(
//         "/api/member/food-tracker/start-from-plan",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type":
//               "application/json",
//           },
//           body: JSON.stringify({
//             memberId: user?.id,
//           }),
//         }
//       );
//       const json = await res.json();
//       if (!res.ok)
//         throw new Error();

//         setData((prev: any) => ({
//       ...prev,
//       foodLog: json.data,
//       hasLogToday: true,
//     }));

//     } catch {
//       alert(
//         "Failed to start tracking"
//       );
//     }
//   };

  
//   if (loading) {
//     return (
//       <div className="flex justify-center py-20">
//         <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
//       </div>
//     );
//   }


//   if (!data?.activePlan) {
//     return (
//       <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
//         <Apple
//           size={50}
//           className="mx-auto text-neutral-600"
//         />
  
//         <h2 className="text-xl font-semibold mt-4">
//           No Active Diet Plan
//         </h2>
  
//         <p className="text-neutral-400 mt-2">
//           Your coach has not assigned
//           a plan yet.
//         </p>
//       </div>
//     );
//   }



//   if (!data.hasLogToday) {
//     return (
//       <div className="space-y-6">
// <TrackerSummary
//   data={{
//     ...data,
//     consumed: liveConsumed,
//   }}
// />  
//         <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 lg:p-8">
//           <div className="max-w-2xl">
//             <h2 className="text-2xl font-bold">
//               Start Tracking Today
//             </h2>
  
//             <p className="text-neutral-400 mt-2">
//               Choose how you'd like to begin logging your meals for today.
//             </p>
//           </div>
  
//           <div className="grid lg:grid-cols-2 gap-5 mt-8">
//             {/* PLAN OPTION */}
  
//             <div className="relative overflow-hidden rounded-3xl border border-lime-400/20 bg-gradient-to-br from-lime-400/10 to-lime-400/5 p-6">
//               <div className="absolute top-0 right-0 w-40 h-40 bg-lime-400/10 blur-3xl rounded-full" />
  
//               <div className="relative">
//                 <div className="w-14 h-14 rounded-2xl bg-lime-400/15 flex items-center justify-center text-lime-400">
//                   <Apple size={24} />
//                 </div>
  
//                 <h3 className="font-semibold text-xl mt-5">
//                   Continue With My Plan
//                 </h3>
  
//                 <p className="text-neutral-400 mt-3 leading-relaxed">
//                   Start with the meals already assigned by your coach and
//                   track your progress throughout the day.
//                 </p>
  
//                 <div className="mt-5 space-y-2 text-sm text-neutral-300">
//                   <div>✓ Meals pre-filled</div>
//                   <div>✓ Food items copied automatically</div>
//                   <div>✓ Compare against your targets</div>
//                 </div>
  
//                 <button
//                   onClick={startFromPlan}
//                   className="mt-6 h-11 px-5 rounded-xl bg-lime-400 text-black font-medium hover:bg-lime-300 transition-colors"
//                 >
//                   Start From Plan
//                 </button>
//               </div>
//             </div>
  
//             {/* EMPTY OPTION */}
  
//             <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
//               <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white">
//                 <Plus size={24} />
//               </div>
  
//               <h3 className="font-semibold text-xl mt-5">
//                 Start Empty
//               </h3>
  
//               <p className="text-neutral-400 mt-3 leading-relaxed">
//                 Create a blank food log and add meals as you eat throughout
//                 the day.
//               </p>
  
//               <div className="mt-5 space-y-2 text-sm text-neutral-300">
//                 <div>✓ Add your own meals</div>
//                 <div>✓ Search and log foods manually</div>
//                 <div>✓ Useful when eating outside your plan</div>
//               </div>
  
//               <button
//                 onClick={startEmpty}
//                 className="mt-6 h-11 px-5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
//               >
//                 Start Empty
//               </button>
//             </div>
//           </div>
  
//           {/* QUICK INFO */}
  
//           <div className="mt-8 bg-black/20 rounded-2xl p-4 border border-white/5">
//             <p className="text-sm text-neutral-400">
//               Your nutrition targets for today
//             </p>
  
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
//               <div>
//                 <p className="text-xs text-neutral-500">
//                   Calories
//                 </p>
//                 <p className="font-semibold">
//                   {data.targets.calories.toFixed(1)} kcal
//                 </p>
//               </div>
  
//               <div>
//                 <p className="text-xs text-neutral-500">
//                   Protein
//                 </p>
//                 <p className="font-semibold">
//                   {data.targets.protein.toFixed(1)}g
//                 </p>
//               </div>
  
//               <div>
//                 <p className="text-xs text-neutral-500">
//                   Carbs
//                 </p>
//                 <p className="font-semibold">
//                   {data.targets.carbs.toFixed(1)}g
//                 </p>
//               </div>
  
//               <div>
//                 <p className="text-xs text-neutral-500">
//                   Fat
//                 </p>
//                 <p className="font-semibold">
//                   {data.targets.fat.toFixed(1)}g
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }



//   return (
//     <div>
//   <div className="space-y-6">

//     <TrackerSummary
//       data={data}
//     />

//     <div className="space-y-4">

//       <div className="space-y-4">
//   {meals.map(
//     (meal: any) => (
//       <FoodTrackingMealCard
//         key={meal.id}
//         meal={meal}
//         allowAddFood={true}
//         onUpdateMeal={
//           updateMeal
//         }
//       />
//     )
//   )}
// </div>

//     </div>

//   </div>
//     </div>
//   )
// }


// export default page;