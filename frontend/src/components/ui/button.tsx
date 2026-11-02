"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gv-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gv-bg-base)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white border border-[rgba(139,92,246,0.3)] shadow-[0_4px_16px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_rgba(139,92,246,0.2)]",
        outline:
          "border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-[#94A3B8] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.18)] hover:text-white",
        ghost:
          "text-[#94A3B8] hover:bg-[rgba(255,255,255,0.05)] hover:text-white",
        danger:
          "bg-[rgba(251,113,133,0.1)] text-[#FB7185] border border-[rgba(251,113,133,0.2)] hover:bg-[rgba(251,113,133,0.18)] hover:border-[rgba(251,113,133,0.3)]",
        success:
          "bg-gradient-to-br from-[#34D399] to-[#059669] text-white border border-[rgba(52,211,153,0.3)] shadow-[0_4px_16px_rgba(52,211,153,0.2)] hover:shadow-[0_8px_32px_rgba(52,211,153,0.3)] hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(6,9,17,0.6)] px-4 py-2.5 text-sm text-[#F1F5F9] placeholder:text-[#475569] transition-all duration-300 focus:border-[#8B5CF6] focus:outline-none focus:ring-1 focus:ring-[rgba(139,92,246,0.3)] focus:bg-[rgba(15,20,36,0.8)]",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(15,20,36,0.75)] backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
        className
      )}
      {...props}
    />
  );
}
