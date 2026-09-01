"use client";

import {
  ArrowLeft,
  Dumbbell,
  Globe,
  Layers,
} from "lucide-react";

import {
  useParams,
  usePathname,
  useRouter,
} from "next/navigation";

import { ReactNode, useEffect, useState } from "react";

import type { Service } from "@prisma/client";

type Props = {
  children: ReactNode;
};

const ServiceLayout = ({
  children,
}: Props) => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const serviceId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const [service, setService] =
    useState<Service | null>(null);

  useEffect(() => {
    if (!serviceId) return;

    const fetchService = async () => {
      try {
        const response = await fetch(
          `/api/services/${serviceId}`,
          {
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        setService(
          data.service || null
        );
      } catch (error) {
        console.error(error);
      }
    };

    fetchService();
  }, [serviceId]);

  const isActive = (
    route: string
  ) => {
    return pathname.includes(route);
  };

  return (
    <div className="p-6">
      {/* HEADER */}

      <div className="mb-6 flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 transition hover:border-lime-400 hover:text-lime-400"
        >
          <ArrowLeft size={18} />
        </button>

        <div>
          <h1 className="text-2xl font-bold text-white">
            {service?.name || "Service"}
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Manage packages, website content
            and service categories
          </p>
        </div>
      </div>

      {/* TABS */}

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-2">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/services/${serviceId}/packages`
            )
          }
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            isActive("/packages")
              ? "bg-lime-400 text-black"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
        >
          <Dumbbell size={16} />
          Packages
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/services/${serviceId}/content`
            )
          }
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            isActive("/content")
              ? "bg-lime-400 text-black"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
        >
          <Globe size={16} />
          Website Content
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/services/${serviceId}/subcategories`
            )
          }
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            isActive("/subcategories")
              ? "bg-lime-400 text-black"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
        >
          <Layers size={16} />
          Subcategories
        </button>
      </div>

      {/* CHILD PAGE */}

      {children}
    </div>
  );
};

export default ServiceLayout;
