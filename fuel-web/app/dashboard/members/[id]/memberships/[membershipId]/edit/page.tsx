"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const page = () => {
    const router = useRouter();

    return(
            
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto"></div>
<div className="flex items-center justify-between mb-8">

<div className="flex items-center gap-4">

  <button
    onClick={() => router.back()}
    className="w-11 h-11 rounded-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-center"
  >
    <ArrowLeft size={18} />
  </button>

  <div>
    <h1 className="text-2xl font-bold">
      Edit MemberShip
    </h1>

  </div>

</div>

</div>
        </div>
    )
}

export default page