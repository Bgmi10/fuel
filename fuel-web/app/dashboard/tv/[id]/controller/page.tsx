import { TvRemoteController } from "./TvRemoteController";

type ControllerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ControllerPage({
  params,
}: ControllerPageProps) {
  const { id: deviceId } = await params;

  return (
    <TvRemoteController
      deviceId={deviceId}
    />
  );
}