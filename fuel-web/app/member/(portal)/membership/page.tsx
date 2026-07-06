"use client"
import { useAuth } from "@/app/contexts/MemberAuthContext"
import MembershipSummary from "./MembershipSummary";
import OutstandingBalanceAlert from "./OutstandingBalanceAlert";
import MembershipCard from "./MembershipCard";

const page = () => {
    const { user: member } = useAuth();
    const subscriptions = member?.subscriptions;
 return(
    <div className="gap-3 flex flex-col">
        <MembershipSummary 
        //@ts-ignore
        subscriptions={subscriptions} />
        <OutstandingBalanceAlert 
        //@ts-ignore
        subscriptions={subscriptions} />

        {
            subscriptions?.map((s) => (
                <div className="gap-3" key={s.id}>
                    <MembershipCard subscription={s} />
                </div>
            ))
        }
    </div>
 )
}

export default page