'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { driver, type Driver, type DriveStep, type AllowedButtons, type PopoverDOM } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/lib/onboarding-tour.css';
import { EMAIL_TOUR_STEPS, AI_TOUR_STEPS, type EmailTourCtx } from '@/lib/onboarding-tours';

const BASE_CONFIG = {
  showProgress: true,
  // No backdrop/ESC close — the interactive tour needs the user to click real
  // elements, so an accidental overlay click must not kill it. They exit via the
  // × (close) button or the injected "Passer" link.
  allowClose: false,
  overlayColor: '#0b1220',
  overlayOpacity: 0.55,
  stagePadding: 6,
  stageRadius: 12,
  popoverClass: 'winaity-tour',
  nextBtnText: 'Suivant',
  prevBtnText: 'Précédent',
  doneBtnText: 'Terminer',
  progressText: '{{current}} / {{total}}',
};

const GATED_BUTTONS: AllowedButtons[] = ['previous', 'close'];
const NORMAL_BUTTONS: AllowedButtons[] = ['previous', 'next', 'close'];

// Onboarding tours built on driver.js.
//   • Email tour is INTERACTIVE — "gated" steps hide the Next button and only
//     advance once the user actually performs the action (adds a Text/Image/
//     Button block), detected from the live `ctx` block counts.
//   • AI tour is informational (advances with Suivant).
// `onEnd` fires once whether the user finishes or skips (used to persist the flag).
export function useOnboardingTour(ctx: EmailTourCtx) {
  const driverRef = useRef<Driver | null>(null);
  const modeRef = useRef<'email' | 'ai' | null>(null);
  const endedRef = useRef(false);
  const onEndRef = useRef<(() => void) | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const injectSkip = useCallback((popover: PopoverDOM) => {
    if (popover.footerButtons.querySelector('.winaity-tour-skip')) return;
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.textContent = 'Passer';
    skip.className = 'winaity-tour-skip';
    skip.addEventListener('click', () => driverRef.current?.destroy());
    popover.footerButtons.prepend(skip);
  }, []);

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEndRef.current?.();
  }, []);

  const startEmailTour = useCallback((onEnd?: () => void) => {
    driverRef.current?.destroy();
    endedRef.current = false;
    onEndRef.current = onEnd;
    modeRef.current = 'email';
    const steps: DriveStep[] = EMAIL_TOUR_STEPS.map((s) => ({
      element: s.element,
      popover: {
        ...s.popover,
        showButtons: s.waitFor ? GATED_BUTTONS : NORMAL_BUTTONS,
      },
    }));
    const d = driver({
      ...BASE_CONFIG,
      steps,
      onHighlightStarted: () => setActiveIndex(driverRef.current?.getActiveIndex() ?? null),
      onDestroyed: () => {
        driverRef.current = null;
        modeRef.current = null;
        setActiveIndex(null);
        finish();
      },
      onPopoverRender: injectSkip,
    });
    driverRef.current = d;
    d.drive();
  }, [injectSkip, finish]);

  const startAiTour = useCallback((onEnd?: () => void) => {
    driverRef.current?.destroy();
    endedRef.current = false;
    onEndRef.current = onEnd;
    modeRef.current = 'ai';
    const d = driver({
      ...BASE_CONFIG,
      steps: AI_TOUR_STEPS,
      onDestroyed: () => {
        driverRef.current = null;
        modeRef.current = null;
        finish();
      },
      onPopoverRender: injectSkip,
    });
    driverRef.current = d;
    d.drive();
  }, [injectSkip, finish]);

  // Auto-advance the interactive email tour: when the current gated step's
  // condition becomes satisfied (or is already satisfied on entry), move on.
  useEffect(() => {
    if (modeRef.current !== 'email') return;
    const d = driverRef.current;
    if (!d?.isActive() || activeIndex == null) return;
    const step = EMAIL_TOUR_STEPS[activeIndex];
    if (step?.waitFor?.(ctx)) {
      d.moveNext();
    }
  }, [activeIndex, ctx]);

  return { startEmailTour, startAiTour };
}
