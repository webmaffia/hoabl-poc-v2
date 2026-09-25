"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, PhoneCall, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenShell } from "@/components/screen-shell";
import { useJourney } from "@/lib/journey-context";
import { useAira } from "@/lib/aira-context";
import { useVoiceCommands } from "@/lib/voice-command-context";
import { track } from "@/lib/analytics";

// A named advisor (rather than a generic "an advisor") makes the simulated
// handoff read as a real handover instead of a dead-end confirmation.
const ADVISOR = { name: "Neha Kulkarni", initials: "NK", role: "Senior Land Wealth Advisor" };

export function Screen14AdvisorHandoff() {
  const { advisorContext } = useJourney();
  const { speak } = useAira();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [callScheduled, setCallScheduled] = useState(false);

  useEffect(() => {
    speak("You're in great hands from here. I've shared everything we've covered with your advisor.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!connecting) return;
    const t = setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      track("advisor_handoff_connected", { context: advisorContext, advisor: ADVISOR.name });
      speak(`Hi, I'm ${ADVISOR.name}, your land wealth advisor. I've reviewed everything Aira shared — let's talk about next steps.`);
    }, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting]);

  const connectAdvisor = () => {
    track("advisor_handoff_clicked", { context: advisorContext });
    setConnecting(true);
  };

  const scheduleCallInstead = () => {
    track("advisor_call_scheduled");
    setCallScheduled(true);
    speak(`No problem — ${ADVISOR.name} will call you within the hour.`);
  };

  useVoiceCommands(
    connected
      ? []
      : [
          { labels: ["connect", "connect me to an advisor", "yes", "talk to advisor"], action: connectAdvisor },
          { labels: ["schedule a call", "schedule instead", "call me later"], action: scheduleCallInstead },
        ]
  );

  const items = [
    { label: "Buyer profile", done: Boolean(advisorContext.buyerProfile.purpose) },
    { label: "Project viewed", done: Boolean(advisorContext.projectViewed) },
    { label: "Pockets viewed & shortlisted", done: advisorContext.pocketsViewed.length > 0 },
    { label: "KYC verified", done: advisorContext.kycStatus === "verified" },
    { label: "Token payment completed", done: advisorContext.tokenPaymentStatus === "completed" },
  ];

  return (
    <ScreenShell showStages title="Advisor handoff">
      <div className="flex h-full flex-col overflow-y-auto no-scrollbar px-5 pb-6 pt-6 text-center">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-2xl text-forest-900">Talk to my HoABL advisor</h1>
          <p className="mt-2 text-sm text-forest-900/60">
            We&rsquo;ll connect you with a sales advisor who already has your complete context.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 rounded-xl2 border border-forest-900/8 bg-white p-4 text-left shadow-card"
        >
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-forest-900/40">
            Your shared context
          </p>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.label} className="flex items-center gap-2.5 text-sm text-forest-900/80">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-800/10 text-forest-800">
                  <Check className="h-3 w-3" />
                </span>
                {it.label}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="mt-4 rounded-xl border border-gold-500/25 bg-gold-50 p-3 text-sm text-gold-700">
          No need to repeat everything. Your advisor is already up to speed.
        </div>

        <div className="mt-auto pt-6">
          <AnimatePresence mode="wait" initial={false}>
            {connected ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl2 border border-forest-800/15 bg-forest-800/5 p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-800 text-sm font-semibold text-ivory-100">
                    {ADVISOR.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-forest-900">{ADVISOR.name}</p>
                    <p className="text-xs text-forest-900/50">{ADVISOR.role}</p>
                  </div>
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-forest-800/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-forest-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-forest-800" /> Connected
                  </span>
                </div>
                <p className="mt-3 text-sm text-forest-900/70">
                  &ldquo;I&rsquo;ve reviewed everything Aira shared — let&rsquo;s talk about next steps.&rdquo;
                </p>
              </motion.div>
            ) : connecting ? (
              <motion.div
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2.5 rounded-xl2 border border-forest-900/8 bg-white p-4 text-sm font-medium text-forest-900/70 shadow-card"
              >
                <Loader2 className="h-4 w-4 animate-spin text-forest-800" />
                Connecting you to {ADVISOR.name}&hellip;
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <Button size="lg" className="w-full" onClick={connectAdvisor}>
                  <PhoneCall className="h-4 w-4" /> Connect me to an advisor &rarr;
                </Button>
                {callScheduled ? (
                  <p className="text-center text-sm font-medium text-forest-900/60">
                    {ADVISOR.name} will call you within the hour.
                  </p>
                ) : (
                  <button
                    onClick={scheduleCallInstead}
                    className="mx-auto flex items-center gap-1.5 text-sm font-medium text-forest-900/55 hover:text-forest-900"
                  >
                    <CalendarClock className="h-3.5 w-3.5" /> Schedule a call instead
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ScreenShell>
  );
}
