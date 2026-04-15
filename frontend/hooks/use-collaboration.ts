'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { TemplateData } from '@/lib/editor-types';

// ── Palette: vibrant, distinct colors for up to 10 simultaneous users
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#F7DC6F', '#DDA0DD', '#82E0AA', '#F0A500',
  '#BB8FCE', '#5DADE2',
];

export function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (userId.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export interface CollabUser {
  _id: string;
  userId: string;
  userName: string;
  color: string;
  cursorX: number;
  cursorY: number;
  lastSeen: number;
}

interface UseCollaborationProps {
  templateId: string | null;  // null in create mode — collab disabled
  tenantId: string;
  userId: string;
  userName: string;
  template: TemplateData;
  onRemoteUpdate: (template: TemplateData) => void;
}

export function useCollaboration({
  templateId,
  tenantId,
  userId,
  userName,
  template,
  onRemoteUpdate,
}: UseCollaborationProps) {
  // ── Prevents Convex → setTemplate → Convex save loops
  const isApplyingRemote = useRef(false);

  // ── Always-fresh ref to the callback — never stale inside effects
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  useEffect(() => { onRemoteUpdateRef.current = onRemoteUpdate; });

  // ── Stable ref to userId so effects don't go stale
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; });

  // ── Tracks last known cursor position for heartbeat re-use
  const lastCursor = useRef({ x: 0, y: 0 });

  // ── Debounce handle for saving editor state
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Heartbeat interval handle
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const color = userColor(userId);

  // ── Convex mutations (stable refs — won't trigger re-renders)
  const upsertPresence  = useMutation(api.presence.upsert);
  const removePresence  = useMutation(api.presence.remove);
  const updateSession   = useMutation(api.templateSession.update);

  // ── Convex reactive queries
  const activeUsers = useQuery(
    api.presence.list,
    templateId ? { templateId, tenantId } : 'skip',
  );

  const remoteSession = useQuery(
    api.templateSession.get,
    templateId ? { templateId, tenantId } : 'skip',
  );

  // ── Cursor update (called on mouse move — throttled at source)
  const updateCursor = useCallback((x: number, y: number) => {
    if (!templateId) return;
    lastCursor.current = { x, y };
    upsertPresence({ templateId, tenantId, userId, userName, color, cursorX: x, cursorY: y });
  }, [templateId, tenantId, userId, userName, color, upsertPresence]);

  // ── Presence lifecycle: join on mount, heartbeat every 3s, leave on unmount
  useEffect(() => {
    if (!templateId) return;

    upsertPresence({
      templateId, tenantId, userId, userName, color,
      cursorX: 0, cursorY: 0,
    });

    heartbeat.current = setInterval(() => {
      upsertPresence({
        templateId, tenantId, userId, userName, color,
        cursorX: lastCursor.current.x,
        cursorY: lastCursor.current.y,
      });
    }, 3_000);

    // Remove presence when tab closes / component unmounts
    const handleUnload = () => { removePresence({ templateId, userId }); };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeat.current) clearInterval(heartbeat.current);
      window.removeEventListener('beforeunload', handleUnload);
      removePresence({ templateId, userId });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, tenantId, userId]);

  // ── Save local changes to Convex (debounced 300ms)
  useEffect(() => {
    if (!templateId || isApplyingRemote.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateSession({
        templateId,
        tenantId,
        editorState: JSON.stringify(template),
        updatedBy: userIdRef.current,
      });
    }, 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  // ── Apply remote changes from other users
  useEffect(() => {
    if (!remoteSession) return;
    // Skip if this session was saved by the current user
    if (remoteSession.lastUpdatedBy === userIdRef.current) return;

    try {
      const incoming = JSON.parse(remoteSession.editorState) as TemplateData;
      // Set flag BEFORE applying so the save effect skips this change
      isApplyingRemote.current = true;
      onRemoteUpdateRef.current(incoming);
      // Reset after React has flushed the state update (next tick is enough)
      setTimeout(() => { isApplyingRemote.current = false; }, 0);
    } catch {
      // Malformed JSON — ignore silently
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSession?.updatedAt]);

  // Filter out self — cast is safe because Convex returns all CollabUser fields
  const otherUsers = (activeUsers ?? []).filter(
    (u) => u.userId !== userId,
  ) as CollabUser[];

  return { otherUsers, updateCursor, color };
}
