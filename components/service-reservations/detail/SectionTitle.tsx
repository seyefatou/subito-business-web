import React from "react";

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionTitle({ children, className = "" }: SectionTitleProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-600">
        {children}
      </h3>
      <div className="mt-2 w-6 h-0.5 bg-orange-500 rounded-full" />
    </div>
  );
}
