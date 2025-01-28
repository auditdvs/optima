import { create } from 'zustand';

interface Branch {
  id: string;
  code: string;
  name: string;
  coordinates: [number, number];
  region: string;
  auditType?: 'regular' | 'fraud';
}

interface FraudCase {
  id: string;
  amount: number;
  branchId: string;
  date: string;
}

interface Audit {
  id: string;
  branchId: string;
  type: 'regular' | 'fraud';
  date: string;
}

interface AppState {
  branches: Branch[];
  fraudCases: FraudCase[];
  audits: Audit[];
  setBranches: (branches: Branch[]) => void;
  setFraudCases: (fraudCases: FraudCase[]) => void;
  setAudits: (audits: Audit[]) => void;
  addBranch: (branch: Branch) => void;
  updateBranchLocation: (code: string, coordinates: [number, number]) => void;
  addFraudCase: (fraudCase: FraudCase) => void;
}

export const useStore = create<AppState>((set) => ({
  branches: [],
  fraudCases: [],
  audits: [],
  
  setBranches: (branches) => set({ branches }),
  setFraudCases: (fraudCases) => set({ fraudCases }),
  setAudits: (audits) => set({ audits }),
  
  addBranch: (branch) => 
    set((state) => ({
      branches: [...state.branches, branch]
    })),
    
  updateBranchLocation: (code, coordinates) =>
    set((state) => ({
      branches: state.branches.map(branch =>
        branch.code === code 
          ? { ...branch, coordinates }
          : branch
      )
    })),
    
  addFraudCase: (fraudCase) =>
    set((state) => ({
      fraudCases: [...state.fraudCases, fraudCase]
    }))
}));