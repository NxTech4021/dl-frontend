import { create } from 'zustand';
import { MatchFormData } from '../components/CreateMatchScreen';

interface ThreadMetadata {
  threadId: string;
  threadName: string;
  divisionId?: string;
  sportType: 'PICKLEBALL' | 'TENNIS' | 'PADEL';
}

interface CreateMatchState {
  pendingMatchData: MatchFormData | null;
  threadMetadata: ThreadMetadata | null;
  matchCreated: boolean;
  setPendingMatchData: (data: MatchFormData | null) => void;
  setThreadMetadata: (metadata: ThreadMetadata | null) => void;
  setMatchCreated: () => void;
  clearMatchCreated: () => void;
  clearPendingMatch: () => void;
}

export const useCreateMatchStore = create<CreateMatchState>((set) => ({
  pendingMatchData: null,
  threadMetadata: null,
  matchCreated: false,
  setPendingMatchData: (data) => set({ pendingMatchData: data }),
  setThreadMetadata: (metadata) => set({ threadMetadata: metadata }),
  setMatchCreated: () => set({ matchCreated: true }),
  clearMatchCreated: () => set({ matchCreated: false }),
  clearPendingMatch: () => set({ pendingMatchData: null, threadMetadata: null }),
}));

