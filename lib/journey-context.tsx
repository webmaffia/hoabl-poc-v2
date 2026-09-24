"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import {
  AdvisorContext,
  BuyerProfile,
  Concern,
  ConfidenceLevel,
  KycStatus,
  PaymentStatus,
  PocketPreferenceTag,
} from "./types";
import { PROJECT, getProjectById, getProjectPockets } from "./data";
import { track } from "./analytics";

export const SCREEN_ORDER = [
  "welcome",
  "buyer-profile",
  // A cinematic "Aira is thinking" moment between profile completion and
  // the project list — visually communicates the matching engine actually
  // running, rather than jumping straight to a static list.
  "ai-processing",
  // Right after the profile is built — a real, browsable list of HoABL
  // projects, with the one matched to the buyer's profile highlighted.
  "select-project",
  "project-match",
  // Verify the buyer's mobile (OTP) right after they commit to a project,
  // before showing project details — so the walkthrough onward is tied to a
  // verified number instead of an anonymous visitor.
  "identity-capture",
  "project-walkthrough",
  "pocket-map",
  "pocket-detail",
  "payment-plan",
  // Token payment + KYC happen once the buyer has actually decided, right
  // before handing off to a human advisor — rather than gating pocket
  // browsing behind payment up front.
  "token-kyc",
  "access-unlocked",
  "advisor-handoff",
] as const;

export type ScreenId = (typeof SCREEN_ORDER)[number];

interface JourneyState {
  screenIndex: number;
  selectedProjectId: string;
  buyerProfile: BuyerProfile;
  pocketPreferences: PocketPreferenceTag[];
  pocketsViewed: string[];
  shortlistedPockets: string[];
  comparedPockets: string[];
  activePocketId: string | null;
  questionsAsked: string[];
  concerns: Concern[];
  confidenceLevel: ConfidenceLevel | null;
  kycStatus: KycStatus;
  tokenPaymentStatus: PaymentStatus;
}

const initialBuyerProfile: BuyerProfile = {
  purpose: null,
  budgetLabel: null,
  budgetMin: null,
  budgetMax: null,
  location: null,
  horizon: null,
  riskComfort: null,
  plotPreference: null,
  expectedPurpose: null,
  priorities: [],
};

const initialState: JourneyState = {
  screenIndex: 0,
  selectedProjectId: PROJECT.id,
  buyerProfile: initialBuyerProfile,
  pocketPreferences: [],
  pocketsViewed: [],
  shortlistedPockets: [],
  comparedPockets: [],
  activePocketId: null,
  questionsAsked: [],
  concerns: [],
  confidenceLevel: null,
  kycStatus: "not_started",
  tokenPaymentStatus: "not_started",
};

// Resuming a left-off session: which screen the buyer was on and everything
// they'd already told Aira (profile, pockets viewed, KYC/payment progress,
// etc.) is persisted here, so reopening the app continues the same
// conversation instead of restarting from the welcome screen.
const STORAGE_KEY = "hoabl-journey-state";

function loadPersistedState(): JourneyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Spread over the current defaults rather than trusting the stored
    // shape outright — a previous session's data may predate a field this
    // build added, and a missing field should fall back to its default
    // instead of leaving it `undefined`.
    return {
      ...initialState,
      ...parsed,
      buyerProfile: { ...initialBuyerProfile, ...parsed?.buyerProfile },
    };
  } catch {
    return null;
  }
}

function persistState(state: JourneyState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private browsing, quota) — resume just won't persist */
  }
}

type Action =
  | { type: "GO_TO"; screen: ScreenId }
  | { type: "HYDRATE"; state: JourneyState }
  | { type: "SELECT_PROJECT"; id: string }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "UPDATE_PROFILE"; patch: Partial<BuyerProfile> }
  | { type: "SET_POCKET_PREFERENCES"; prefs: PocketPreferenceTag[] }
  | { type: "VIEW_POCKET"; id: string }
  | { type: "TOGGLE_SHORTLIST"; id: string }
  | { type: "SET_COMPARED"; ids: string[] }
  | { type: "SET_ACTIVE_POCKET"; id: string | null }
  | { type: "ASK_QUESTION"; question: string }
  | { type: "ADD_CONCERN"; concern: Concern }
  | { type: "SET_CONFIDENCE"; level: ConfidenceLevel }
  | { type: "SET_KYC"; status: KycStatus }
  | { type: "SET_PAYMENT"; status: PaymentStatus }
  | { type: "RESET" };

function reducer(state: JourneyState, action: Action): JourneyState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "GO_TO": {
      const idx = SCREEN_ORDER.indexOf(action.screen);
      return { ...state, screenIndex: idx === -1 ? state.screenIndex : idx };
    }
    case "SELECT_PROJECT":
      // Switching projects invalidates any pocket already chosen from a
      // different project's layout.
      return { ...state, selectedProjectId: action.id, activePocketId: null, shortlistedPockets: [], comparedPockets: [] };
    case "NEXT":
      return { ...state, screenIndex: Math.min(state.screenIndex + 1, SCREEN_ORDER.length - 1) };
    case "BACK":
      return { ...state, screenIndex: Math.max(state.screenIndex - 1, 0) };
    case "UPDATE_PROFILE":
      return { ...state, buyerProfile: { ...state.buyerProfile, ...action.patch } };
    case "SET_POCKET_PREFERENCES":
      return { ...state, pocketPreferences: action.prefs };
    case "VIEW_POCKET":
      return {
        ...state,
        pocketsViewed: state.pocketsViewed.includes(action.id)
          ? state.pocketsViewed
          : [...state.pocketsViewed, action.id],
      };
    case "TOGGLE_SHORTLIST": {
      const has = state.shortlistedPockets.includes(action.id);
      return {
        ...state,
        shortlistedPockets: has
          ? state.shortlistedPockets.filter((id) => id !== action.id)
          : [...state.shortlistedPockets, action.id],
      };
    }
    case "SET_COMPARED":
      return { ...state, comparedPockets: action.ids };
    case "SET_ACTIVE_POCKET":
      return { ...state, activePocketId: action.id };
    case "ASK_QUESTION":
      return { ...state, questionsAsked: [...state.questionsAsked, action.question] };
    case "ADD_CONCERN":
      return {
        ...state,
        concerns: state.concerns.includes(action.concern)
          ? state.concerns
          : [...state.concerns, action.concern],
      };
    case "SET_CONFIDENCE":
      return { ...state, confidenceLevel: action.level };
    case "SET_KYC":
      return { ...state, kycStatus: action.status };
    case "SET_PAYMENT":
      return { ...state, tokenPaymentStatus: action.status };
    case "RESET":
      track("demo_reset");
      return initialState;
    default:
      return state;
  }
}

interface JourneyContextValue extends JourneyState {
  currentScreen: ScreenId;
  dispatch: React.Dispatch<Action>;
  goTo: (screen: ScreenId) => void;
  next: () => void;
  back: () => void;
  selectProject: (id: string) => void;
  /** The project the buyer is currently exploring — resolves selectedProjectId. */
  selectedProject: ReturnType<typeof getProjectById>;
  /** That project's pockets (Aero Estate's own set, or a generated illustrative layout for others). */
  projectPockets: ReturnType<typeof getProjectPockets>;
  advisorContext: AdvisorContext;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const currentScreen = SCREEN_ORDER[state.screenIndex];
  // Starts every render (including the server-rendered first paint) on
  // initialState, then swaps in whatever was saved from a previous visit
  // right after mount — reading localStorage during the initial render
  // itself would make the server and client's first paint disagree and
  // trip a hydration error.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadPersistedState();
    if (stored) dispatch({ type: "HYDRATE", state: stored });
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Wait for the hydration check above so this can't win a race against
    // it and overwrite a just-restored session with the fresh initialState
    // it started from before HYDRATE landed.
    if (!hydrated) return;
    persistState(state);
  }, [state, hydrated]);

  const value = useMemo<JourneyContextValue>(() => {
    const selectedProject = getProjectById(state.selectedProjectId);
    const projectPockets = getProjectPockets(state.selectedProjectId);
    const advisorContext: AdvisorContext = {
      buyerProfile: state.buyerProfile,
      projectViewed: selectedProject.name,
      pocketsViewed: state.pocketsViewed,
      shortlistedPockets: state.shortlistedPockets,
      comparedPockets: state.comparedPockets,
      questionsAsked: state.questionsAsked,
      concerns: state.concerns,
      confidenceLevel: state.confidenceLevel,
      kycStatus: state.kycStatus,
      tokenPaymentStatus: state.tokenPaymentStatus,
      currentStage: currentScreen,
    };
    return {
      ...state,
      currentScreen,
      dispatch,
      goTo: (screen: ScreenId) => dispatch({ type: "GO_TO", screen }),
      next: () => dispatch({ type: "NEXT" }),
      back: () => dispatch({ type: "BACK" }),
      selectProject: (id: string) => dispatch({ type: "SELECT_PROJECT", id }),
      selectedProject,
      projectPockets,
      advisorContext,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, currentScreen]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error("useJourney must be used within a JourneyProvider");
  return ctx;
}
