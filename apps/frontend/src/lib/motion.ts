import type { Variants, Transition } from "framer-motion";

// ─── Spring configs ───────────────────────────────────────────────────────────
// Emil rule: springs for interruptible/gesture-driven, easing for state changes

export const springTight: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 45,
};

export const springSmooth: Transition = {
  type: "spring",
  stiffness: 360,
  damping: 38,
};

export const springCinematic: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 1.1,
};

// Easing curves — cubic bezier for organic feel
export const easeFastOut = [0.16, 1, 0.3, 1] as const;
export const easeSharp = [0.32, 0.72, 0, 1] as const;

// ─── Standard variants ────────────────────────────────────────────────────────
// Emil rule: ease-out for entrances, ease-in for exits
// userinterface-wiki: under 300ms for user-initiated, duration-press-hover 120-180ms

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: "easeIn" } },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: easeFastOut } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14, ease: "easeIn" } },
};

export const cardReveal: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: easeFastOut },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.14, ease: "easeIn" },
  },
};

// userinterface-wiki: stagger delays < 50ms per item
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: easeFastOut },
  },
};

// ─── Page transitions ─────────────────────────────────────────────────────────

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.14, ease: "easeIn" } },
};

// ─── Cinematic moments ────────────────────────────────────────────────────────
// These are rare/first-time — can be more elaborate (Emil: "Rare → can add delight")

export const vetoReveal: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 16 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springCinematic,
  },
};

export const vetoContent: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.22 } },
};

export const vetoContentItem: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

export const safetyCardExpand: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: "auto",
    transition: {
      height: { ...springSmooth },
      opacity: { duration: 0.2, ease: "easeOut" },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: { duration: 0.18, ease: "easeIn" },
      opacity: { duration: 0.1, ease: "easeIn" },
    },
  },
};

// Compiler receipt: line-by-line sequential reveal
export const compilerLineReveal: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.16, ease: "easeOut" } },
};

export const compilerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

// Replay: stagger under 50ms per step
export const replayStep: Variants = {
  initial: { opacity: 0, x: -14 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

export const replayContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
};

// Drift shake — physical recoil
export const driftShake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -5, 5, -3, 3, -1, 1, 0],
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

// Emergency banner — drops from top
export const bannerDrop: Variants = {
  initial: { y: -56, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { ...springSmooth } },
  exit: { y: -56, opacity: 0, transition: { duration: 0.18, ease: "easeIn" } },
};

// Kill switch flash — amber overlay burst
export const killSwitchFlash: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 0.4, 0],
    transition: { duration: 0.55, times: [0, 0.18, 1], ease: "easeOut" },
  },
};

// Generic height collapse
export const expandHeight: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { ...springSmooth },
      opacity: { delay: 0.08, duration: 0.18, ease: "easeOut" },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      opacity: { duration: 0.1, ease: "easeIn" },
      height: { duration: 0.18, ease: "easeIn" },
    },
  },
};

// ─── Landing page ─────────────────────────────────────────────────────────────

export const trustNodeReveal: Variants = {
  initial: { opacity: 0, scale: 0.85 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { ...springCinematic },
  },
};

export const trustEdgeReveal: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.0, ease: "easeOut", delay: 0.3 },
  },
};

export const landingHeroReveal: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

export const landingHeroItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeFastOut },
  },
};

export const featureCardReveal: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: easeFastOut },
  },
};

// ─── Scroll-in reveal (for landing sections) ──────────────────────────────────
// Used with whileInView — subtle, not distracting

export const scrollReveal: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeFastOut } },
};

export const scrollRevealStagger: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0 } },
};
