import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Tracks who is currently editing a template (presence + cursor)
  presence: defineTable({
    templateId: v.string(),
    tenantId:   v.string(),
    userId:     v.string(),
    userName:   v.string(),
    color:      v.string(),
    cursorX:    v.number(), // percentage 0-100 of canvas width
    cursorY:    v.number(), // percentage 0-100 of canvas height
    lastSeen:   v.number(), // timestamp ms — used for heartbeat timeout
  })
    .index("by_template",      ["templateId", "tenantId"])
    .index("by_user_template", ["userId", "templateId"]),

  // Live editor state synced between collaborators
  templateSessions: defineTable({
    templateId:     v.string(),
    tenantId:       v.string(),
    editorState:    v.string(), // JSON.stringify(TemplateData)
    lastUpdatedBy:  v.string(), // userId — used to skip own updates
    updatedAt:      v.number(), // timestamp ms
  })
    .index("by_template", ["templateId", "tenantId"]),
});
