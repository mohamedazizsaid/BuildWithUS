'use client';

// Futuristic, de-duplicated toasts. Drop-in for `import toast from 'react-hot-toast'`
// (same API: toast(), .success, .error, .loading, .custom, .promise, .dismiss, .remove).
//
// - Custom glassy card with a gradient accent + an X (dismiss) button.
// - Firing the SAME message again updates the existing toast instead of stacking.
// - Skips a toast when the same message was just routed to the upgrade modal.
import hotToast, { type Toast } from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { wasRecentlyUpgradeModal } from './upgrade-modal';

type Message = Parameters<typeof hotToast>[0];
type Opts = NonNullable<Parameters<typeof hotToast>[1]>;
type Kind = 'success' | 'error' | 'info';

function idFor(message: string): string {
  let h = 0;
  for (let i = 0; i < message.length; i++) h = (Math.imul(31, h) + message.charCodeAt(i)) | 0;
  return `t${h}`;
}

const THEME: Record<Kind, { ring: string; glow: string; chip: string; Icon: typeof Info }> = {
  success: {
    ring: 'ring-emerald-400/40',
    glow: 'from-emerald-400/25',
    chip: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    Icon: CheckCircle2,
  },
  error: {
    ring: 'ring-rose-400/40',
    glow: 'from-rose-400/25',
    chip: 'bg-gradient-to-br from-rose-500 to-red-500',
    Icon: AlertTriangle,
  },
  info: {
    ring: 'ring-indigo-400/40',
    glow: 'from-indigo-400/25',
    chip: 'bg-gradient-to-br from-indigo-500 to-violet-500',
    Icon: Info,
  },
};

function ToastCard({ t, kind, message }: { t: Toast; kind: Kind; message: Message }) {
  const { ring, glow, chip, Icon } = THEME[kind];
  // react-hot-toast messages may be a render function of the toast.
  const content =
    typeof message === 'function' ? (message as (tt: Toast) => React.ReactNode)(t) : (message as React.ReactNode);
  return (
    <div
      className={[
        'pointer-events-auto relative flex w-[min(92vw,420px)] items-start gap-3 overflow-hidden',
        'rounded-2xl border border-white/60 bg-white/80 px-4 py-3 pr-10',
        'shadow-[0_18px_50px_-16px_rgba(30,41,59,0.45)] ring-1 backdrop-blur-xl',
        ring,
        'transition-all duration-300 ease-out',
        t.visible ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-2 scale-95 opacity-0',
      ].join(' ')}
    >
      {/* soft colored glow */}
      <div className={`pointer-events-none absolute -left-6 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${glow} to-transparent blur-2xl`} />

      <span className={`relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ${chip}`}>
        <Icon size={16} strokeWidth={2.4} />
      </span>

      <div className="relative min-w-0 flex-1 pt-0.5 text-[13.5px] font-medium leading-snug text-slate-800">
        {content}
      </div>

      <button
        onClick={() => hotToast.dismiss(t.id)}
        aria-label="Fermer"
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function render(kind: Kind, message: Message, opts?: Opts) {
  // Don't double up with the upgrade modal for the same plan-limit message.
  if (typeof message === 'string' && wasRecentlyUpgradeModal(message)) return '';
  const id = typeof message === 'string' ? idFor(message) : undefined;
  return hotToast.custom((t) => <ToastCard t={t} kind={kind} message={message} />, {
    id,
    duration: kind === 'error' ? 6000 : 4000,
    ...opts,
  });
}

const toast = Object.assign((message: Message, opts?: Opts) => render('info', message, opts), {
  success: (message: Message, opts?: Opts) => render('success', message, opts),
  error: (message: Message, opts?: Opts) => render('error', message, opts),
  info: (message: Message, opts?: Opts) => render('info', message, opts),
  // loading keeps react-hot-toast's default (spinner) but still de-dupes by id.
  loading: (message: Message, opts?: Opts) =>
    hotToast.loading(message, { ...(typeof message === 'string' ? { id: idFor(message) } : {}), ...(opts ?? {}) }),
  custom: hotToast.custom,
  promise: hotToast.promise,
  dismiss: hotToast.dismiss,
  remove: hotToast.remove,
});

export default toast;
