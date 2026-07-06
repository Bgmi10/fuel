"use client";

import { Branch } from "@prisma/client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type BranchContextType = {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch) => void;
  loading: boolean;
};

const BranchContext =
  createContext<BranchContextType | null>(null);

export const BranchProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [branches, setBranches] = useState<
    Branch[]
  >([]);

  const [selectedBranch, setSelectedBranchState] =
    useState<Branch | null>(null);

  const [loading, setLoading] =
    useState(true);

  const setSelectedBranch = (
    branch: Branch
  ) => {
    setSelectedBranchState(branch);

    localStorage.setItem(
      "selectedBranch",
      JSON.stringify(branch)
    );
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");

      const data = await res.json();

      if (!data.success) return;

      const apiBranches: Branch[] =
        data.branches || [];

      setBranches(apiBranches);

      // 🔥 LOCAL STORAGE
      const storedBranch =
        localStorage.getItem(
          "selectedBranch"
        );

      if (!storedBranch) {
        // no branch selected before
        if (apiBranches.length > 0) {
          setSelectedBranch(apiBranches[0]);
        }

        return;
      }

      const parsed: Branch =
        JSON.parse(storedBranch);

      // 🔥 compare with latest api branches
      const branchExists =
        apiBranches.find(
          (b) => b.id === parsed.id
        );

      // stale branch removed from db
      if (!branchExists) {
        localStorage.removeItem(
          "selectedBranch"
        );

        if (apiBranches.length > 0) {
          setSelectedBranch(apiBranches[0]);
        }

        return;
      }

      // valid branch
      setSelectedBranchState(branchExists);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        setSelectedBranch,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context =
    useContext(BranchContext);

  if (!context) {
    throw new Error(
      "useBranch must be used inside BranchProvider"
    );
  }

  return context;
};