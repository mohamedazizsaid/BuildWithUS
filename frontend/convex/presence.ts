import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Users absent for more than 10s are considered offline
const OFFLINE_MS = 10_000;

// ── Upsert presence (called every 3s as heartbeat + on cursor move)
export const upsert = mutation({
  args: {
    templateId: v.string(),
    tenantId:   v.string(),
    userId:     v.string(),
    userName:   v.string(),
    color:      v.string(),
    cursorX:    v.number(),
    cursorY:    v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_template", (q) =>
        q.eq("userId", args.userId).eq("templateId", args.templateId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        cursorX:  args.cursorX,
        cursorY:  args.cursorY,
        userName: args.userName,
        color:    args.color,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.insert("presence", { ...args, lastSeen: Date.now() });
    }
  },
});

// ── Remove presence (called on unmount / tab close)
export const remove = mutation({
  args: { templateId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_template", (q) =>
        q.eq("userId", args.userId).eq("templateId", args.templateId)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ── List active users for a template (excludes stale / offline)
export const list = query({
  args: { templateId: v.string(), tenantId: v.string() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - OFFLINE_MS;
    const users = await ctx.db
      .query("presence")
      .withIndex("by_template", (q) =>
        q.eq("templateId", args.templateId).eq("tenantId", args.tenantId)
      )
      .collect();
    return users.filter((u) => u.lastSeen >= cutoff);
  },
});
