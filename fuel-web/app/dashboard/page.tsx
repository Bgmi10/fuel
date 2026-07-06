'use client'
import { useAuth } from "../contexts/AdminAuthContext";

const Page = () => {
  const { user } = useAuth();
  console.log(user);
    return (
      <div>
        <h2 className="text-2xl font-bold text-white">
          Dashboard Overview
        </h2>
  
        <p className="text-neutral-400 mt-2">
          Manage leads, trials and gym conversions here.
        </p>
      </div>
    );
  };
  
  export default Page;