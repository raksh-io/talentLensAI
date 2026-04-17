"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useRef, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

// Generic Identity Card Body
export const IdentityCardBody = forwardRef(
  (
    {
      title,
      subtitle,
      description,
      icon,
      scheme = "plain",
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const isAccent = scheme === "accented";

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col rounded-3xl p-6 h-full",
          isAccent
            ? "text-white"
            : "bg-white text-slate-900 border border-slate-100 shadow-sm",
          className
        )}
        {...rest}
      >
        <div className="flex items-center gap-4 mb-4">
          {icon && (
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0",
              isAccent ? "bg-white/20" : "bg-blue-50 text-blue-600"
            )}>
              {icon}
            </div>
          )}
          <div className="overflow-visible">
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.25em] mb-1",
              isAccent ? "text-blue-100/70" : "text-slate-400"
            )}>
              {subtitle}
            </p>
            <h3 className={cn(
              "text-xl font-black leading-tight",
              isAccent ? "text-white text-3xl" : "text-slate-900"
            )}>
              {title}
            </h3>
          </div>
        </div>

        <div className="flex-grow">
          {description && (
             <p className={cn(
                "text-base leading-relaxed",
                isAccent ? "text-blue-50 opacity-90" : "text-slate-600"
              )}>
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    );
  }
);
IdentityCardBody.displayName = "IdentityCardBody";

// Animated Container
export const RevealCard = forwardRef(
  (
    {
      base,
      overlay,
      accent = "#2563eb",
      className,
      ...rest
    },
    ref
  ) => {
    const holderRef = useRef(null);
    const overlayRef = useRef(null);

    const assignRef = useCallback(
      (el) => {
        holderRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref]
    );

    const startClip = "circle(32px at 48px 48px)";
    const expandClip = "circle(160% at 48px 48px)";

    useGSAP(() => {
      gsap.set(overlayRef.current, { clipPath: startClip });
    }, { scope: holderRef });

    const reveal = () => {
      gsap.to(overlayRef.current, {
        clipPath: expandClip,
        duration: 0.6,
        ease: "power3.inOut",
      });
    };
    const conceal = () => {
      gsap.to(overlayRef.current, {
        clipPath: startClip,
        duration: 0.8,
        ease: "power3.out",
      });
    };

    return (
      <div
        ref={assignRef}
        onMouseEnter={reveal}
        onMouseLeave={conceal}
        style={{
          "--accent-color": accent,
        }}
        className={cn(
          "relative overflow-hidden rounded-3xl border border-slate-100 h-full cursor-default shadow-sm hover:shadow-md transition-shadow",
          className
        )}
        {...rest}
      >
        <div className="h-full">{base}</div>
        <div
          ref={overlayRef}
          className="absolute inset-0 h-full w-full z-10"
          style={{ backgroundColor: accent }}
        >
          {overlay}
        </div>
      </div>
    );
  }
);
RevealCard.displayName = "RevealCard";
