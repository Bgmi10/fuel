"use client";

import { ParallaxProvider } from "react-scroll-parallax";
import { BranchProvider } from "../contexts/BranchContext";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return <ParallaxProvider>
    <BranchProvider>
    {children}
    </BranchProvider>
    </ParallaxProvider>;
};