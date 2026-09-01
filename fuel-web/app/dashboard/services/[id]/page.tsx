import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const Page = async ({
  params,
}: Props) => {
  const { id } = await params;

  redirect(
    `/dashboard/services/${id}/packages`
  );
};

export default Page;
