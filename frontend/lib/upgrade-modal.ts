// Global, framework-agnostic trigger for the plan-upgrade modal.
//
// Plan-restriction errors can originate deep inside API calls (lib/api.ts is not
// a React component), so we expose a tiny pub/sub: anything can call
// openUpgradeModal(); the <UpgradeModal/> mounted in the layout subscribes and
// renders. Also tracks the last routed message so the toast wrapper can skip a
// duplicate toast for the same error.

export interface UpgradeModalPayload {
  /** Bold headline. Defaults to a generic upgrade line. */
  title?: string;
  /** Sub-text — usually the backend's reason (e.g. "1 template email"). */
  message?: string;
  /** Which restriction triggered it, for optional copy tuning. */
  reason?: 'plan_limit' | 'ai_limit' | string;
}

type Listener = (payload: UpgradeModalPayload) => void;

let listener: Listener | null = null;
let lastMessage = '';
let lastAt = 0;

export function openUpgradeModal(payload: UpgradeModalPayload = {}): void {
  lastMessage = payload.message ?? '';
  lastAt = Date.now();
  listener?.(payload);
}

export function subscribeUpgradeModal(cb: Listener): () => void {
  listener = cb;
  return () => {
    if (listener === cb) listener = null;
  };
}

/** True when this exact message was just routed to the upgrade modal — lets the
 *  toast wrapper avoid showing a duplicate toast for the same plan error. */
export function wasRecentlyUpgradeModal(message: string): boolean {
  return !!message && message === lastMessage && Date.now() - lastAt < 1500;
}
