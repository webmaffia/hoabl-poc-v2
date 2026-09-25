"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJourney, ScreenId } from "@/lib/journey-context";
import { useAira } from "@/lib/aira-context";
import { useVoiceCommands } from "@/lib/voice-command-context";
import { track } from "@/lib/analytics";

// Friendly labels for the "you left off at..." line — deliberately phrased
// as what the buyer was doing, not the internal screen id.
const SCREEN_LABELS: Record<ScreenId, string> = {
  welcome: "just getting started",
  "buyer-profile": "sharing what you're looking for",
  "ai-processing": "finding your match",
  "project-match": "reviewing your matched project",
  "identity-capture": "verifying your mobile number",
  "project-walkthrough": "exploring the project",
  "pocket-map": "browsing available pockets",
  "pocket-detail": "reviewing a pocket's details",
  "payment-plan": "checking payment plans",
  "token-kyc": "completing your token payment & KYC",
  "access-unlocked": "unlocking your pocket",
  "advisor-handoff": "connecting with your advisor",
};

export function WelcomeBackGate() {
  const { buyerName, currentScreen, pocketsViewed, shortlistedPockets, selectedProject, kycStatus, tokenPaymentStatus, continueJourney, restartJourney } =
    useJourney();
  const { speak } = useAira();

  const greeting = buyerName ? `Welcome back, ${buyerName}!` : "Welcome back!";
  const pickedUpText = SCREEN_LABELS[currentScreen];

  useEffect(() => {
    track("welcome_back_shown", { screen: currentScreen });
    speak(`${greeting} Last time, we were ${pickedUpText} for ${selectedProject.name}. Want to pick up right where you left off?`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continueHere = () => {
    track("welcome_back_continue", { screen: currentScreen });
    continueJourney();
  };

  const startFresh = () => {
    track("welcome_back_restart", { screen: currentScreen });
    restartJourney();
  };

  useVoiceCommands([
    { labels: ["continue", "pick up where i left off", "yes", "resume"], action: continueHere },
    { labels: ["start over", "start fresh", "restart", "no"], action: startFresh },
  ]);

  const progress = [
    { label: `Exploring ${selectedProject.name}`, done: true },
    { label: "Pockets viewed", done: pocketsViewed.length > 0, hint: pocketsViewed.length ? `${pocketsViewed.length} viewed` : undefined },
    { label: "Pocket shortlisted", done: shortlistedPockets.length > 0 },
    { label: "KYC", done: kycStatus === "verified", hint: kycStatus !== "not_started" ? kycStatus : undefined },
    { label: "Token payment", done: tokenPaymentStatus === "completed", hint: tokenPaymentStatus !== "not_started" ? tokenPaymentStatus : undefined },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center bg-ivory-100 px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-white shadow-elevated">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-2xl text-forest-900">{greeting}</h1>
        <p className="mt-2 text-sm text-forest-900/60">
          You were {pickedUpText}. Here&rsquo;s where things stand:
        </p>

        <div className="mt-5 rounded-xl2 border border-forest-900/8 bg-white p-4 text-left shadow-card">
          <ul className="space-y-2">
            {progress.map((p) => (
              <li key={p.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2.5 text-forest-900/80">
                  <span
                    className={
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full " +
                      (p.done ? "bg-forest-800/10 text-forest-800" : "bg-forest-900/8 text-forest-900/25")
                    }
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  {p.label}
                </span>
                {p.hint && <span className="shrink-0 text-xs capitalize text-forest-900/40">{p.hint}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 space-y-2.5">
          <Button size="lg" className="w-full" onClick={continueHere}>
            Continue where I left off &rarr;
          </Button>
          <button
            onClick={startFresh}
            className="mx-auto flex items-center gap-1.5 text-sm font-medium text-forest-900/55 hover:text-forest-900"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Start fresh instead
          </button>
        </div>
      </motion.div>
    </div>
  );
}
