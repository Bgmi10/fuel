import { prisma } from "@/prisma";
import BillingPage from "./BillingPage";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const page = async ({ params }: Props) => {
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: {
      id,
    },
    include: {
      referrals: true
    }
  });

  if (!member) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Member Not Found
          </h1>

          <p className="text-neutral-500 mt-2">
            Unable to load member details.
          </p>
        </div>
      </div>
    );
  }

  const services = await prisma.service.findMany({
    include: {
      branches: true,

      packages: {
        where: {
          isActive: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <BillingPage
      services={services}
      member={member}
    />
  );
};

export default page;