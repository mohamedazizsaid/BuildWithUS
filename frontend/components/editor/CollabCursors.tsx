'use client';

import { CollabUser } from '@/hooks/use-collaboration';

interface CollabCursorsProps {
  readonly users: CollabUser[];
}

/**
 * Renders collaborator cursors.
 *
 * Must be a direct child of a `position: relative` container whose dimensions
 * match the coordinate space used when emitting cursor positions (the inner
 * template box in Canvas).  cursorX / cursorY are already % of that box, so
 * plain `left: x%` / `top: y%` land at the exact right spot on every screen.
 */
export default function CollabCursors({ users }: CollabCursorsProps) {
  if (!users.length) return null;

  return (
    <>
      {users.map((user) => (
        <div
          key={user.userId}
          className="pointer-events-none absolute z-50"
          style={{
            left: `${user.cursorX}%`,
            top:  `${user.cursorY}%`,
            // Smooth interpolation at the throttle rate (30 ms)
            transition: 'left 30ms linear, top 30ms linear',
          }}
        >
          {/* Arrow */}
          <svg
            width="16"
            height="20"
            viewBox="0 0 16 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          >
            <path
              d="M0 0L0 16L4.5 12L7.5 19L9.5 18L6.5 11L12 11L0 0Z"
              fill={user.color}
            />
          </svg>

          {/* Name badge */}
          <div
            className="absolute left-3 top-4 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-md"
            style={{ backgroundColor: user.color }}
          >
            {user.userName}
          </div>
        </div>
      ))}
    </>
  );
}
