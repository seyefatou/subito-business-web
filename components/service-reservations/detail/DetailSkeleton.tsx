import React from "react";

export default function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6 pb-24">
      {/* Hero skeleton */}
      <div className="h-[28rem] md:h-[32rem] rounded-3xl bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 animate-pulse" />

      {/* Content grid skeleton */}
      <div className="grid lg:grid-cols-12 gap-8 mt-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Identité */}
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
          </div>

          {/* Stats row */}
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />

          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
          </div>

          {/* Section block */}
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Right column (ReserveCard) */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
