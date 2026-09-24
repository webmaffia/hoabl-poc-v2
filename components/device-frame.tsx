"use client";

import React from "react";
import { HOABL_LOGO_URL } from "@/lib/brand";

export function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-forest-950 lg:flex lg:items-center lg:justify-center lg:py-10">
      {/* Single row: on mobile only the phone slot is visible (info panels
          hidden below); on desktop it becomes journey context + phone +
          info panel side by side. `children` is mounted exactly once here
          — it used to be rendered a second time in a separate "mobile"
          block below, which silently doubled every bit of this screen's
          local state (e.g. Screen02BuyerProfile's question index): the
          hidden copy would receive voice commands (registered last, so it
          won the shared voice-command singleton) and quietly advance,
          while the copy actually on screen stayed frozen on question 1
          forever, even as Aira's voice — shared globally too — spoke the
          hidden copy's later questions. */}
      <div className="flex w-full flex-col lg:w-full lg:max-w-6xl lg:flex-row lg:items-center lg:justify-center lg:gap-10 lg:px-8">
        <aside className="hidden w-64 shrink-0 text-ivory-200 lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HOABL_LOGO_URL} alt="The House of Abhinandan Lodha" className="mb-3 h-11 w-auto" />
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            AI Prototype
          </div>
          <h1 className="font-serif text-2xl leading-tight text-ivory-50">
            AI Land Advisor
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ivory-200/70">
            An AI-guided land decision experience. Aira helps a buyer understand a
            project, find the right pocket, see trade-offs clearly, and hand off to
            a human advisor with full context.
          </p>
          <div className="mt-6 space-y-2 text-xs text-ivory-200/50">
            <p>This is a clickable product prototype.</p>
            <p>No real payments. No real KYC. No real transactions.</p>
          </div>
        </aside>

        <div className="relative w-full lg:w-auto">
          <div className="relative h-dvh w-full overflow-hidden bg-ivory-100 lg:h-[812px] lg:w-[375px] lg:rounded-[1.75rem] lg:border-[10px] lg:border-forest-900 lg:bg-forest-900 lg:shadow-elevated">
            <div className="absolute left-1/2 top-0 z-10 hidden h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-forest-900 lg:block" />
            <div className="h-full w-full overflow-hidden lg:rounded-[1.75rem] lg:bg-ivory-100">
              {children}
            </div>
          </div>
        </div>

        <aside className="hidden w-64 shrink-0 text-ivory-200 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">Try it on your phone</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr.png" alt="Scan to open on mobile" className="mx-auto mt-4 h-40 w-40 rounded-lg bg-white p-2" />
            <p className="mt-4 text-xs leading-relaxed text-ivory-200/60">
              Scan with your phone&rsquo;s camera to open this prototype on mobile.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
