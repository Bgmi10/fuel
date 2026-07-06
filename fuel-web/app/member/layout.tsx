
import { MemberAuthProvider } from "@/app/contexts/MemberAuthContext";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MemberAuthProvider>
      {children}
    </MemberAuthProvider>
  );
}