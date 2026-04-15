import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Save / update live editor state
export const update = mutation({
  args: {
    templateId:  v.string(),
    tenantId:    v.string(),
    editorState: v.string(), // JSON
    updatedBy:   v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("templateSessions")
      .withIndex("by_template", (q) =>
        q.eq("templateId", args.templateId).eq("tenantId", args.tenantId)
      )
      .first();

    const payload = {
      editorState:   args.editorState,
      lastUpdatedBy: args.updatedBy,
      updatedAt:     Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("templateSessions", {
        templateId: args.templateId,
        tenantId:   args.tenantId,
        ...payload,
      });
    }
  },
});

// ── Subscribe to live editor state
export const get = query({
  args: { templateId: v.string(), tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("templateSessions")
      .withIndex("by_template", (q) =>
        q.eq("templateId", args.templateId).eq("tenantId", args.tenantId)
      )
      .first();
  },
});
