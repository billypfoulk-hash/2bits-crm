import { create } from 'zustand';
import type { User, Campaign, Comment } from './types';

// Profile is the app-level representation of the authenticated user.
// It's fetched from the `profiles` table after sign-in and stored here
// so any Client Component can read it without an extra query.
export type Profile = User; // same shape — Role, id, name, email, clientId

interface AppState {
  // Auth
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;

  // Campaign data — loaded from Supabase, kept in memory for optimistic UI.
  // Mutations call Supabase first, then update this state on success.
  campaigns: Campaign[];
  setCampaigns: (campaigns: Campaign[]) => void;

  // Optimistic mutations (wired to Supabase in lib/actions/*.ts)
  addComment: (deliverableId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'replies'>) => void;
  resolveComment: (deliverableId: string, commentId: string) => void;
  updateDeliverableStatus: (campaignId: string, deliverableId: string, status: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),

  campaigns: [],
  setCampaigns: (campaigns) => set({ campaigns }),

  addComment: (deliverableId, comment) =>
    set((state) => ({
      campaigns: state.campaigns.map((camp) => ({
        ...camp,
        deliverables: camp.deliverables.map((del) =>
          del.id === deliverableId
            ? {
                ...del,
                comments: [
                  ...del.comments,
                  {
                    ...comment,
                    id: `opt_${Date.now()}`, // replaced by real UUID after Supabase confirms
                    createdAt: new Date().toISOString(),
                    replies: [],
                  },
                ],
              }
            : del
        ),
      })),
    })),

  resolveComment: (deliverableId, commentId) =>
    set((state) => ({
      campaigns: state.campaigns.map((camp) => ({
        ...camp,
        deliverables: camp.deliverables.map((del) =>
          del.id === deliverableId
            ? {
                ...del,
                comments: del.comments.map((c) =>
                  c.id === commentId ? { ...c, resolved: !c.resolved } : c
                ),
              }
            : del
        ),
      })),
    })),

  updateDeliverableStatus: (campaignId, deliverableId, status) =>
    set((state) => ({
      campaigns: state.campaigns.map((camp) =>
        camp.id === campaignId
          ? {
              ...camp,
              deliverables: camp.deliverables.map((del) =>
                del.id === deliverableId ? { ...del, status: status as any } : del
              ),
            }
          : camp
      ),
    })),
}));
