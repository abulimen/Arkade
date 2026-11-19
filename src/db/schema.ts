import { bigint, boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { GameHistoryEntry } from "@/shared/types";
import type { Snapshot } from "@/server/rooms/Room";

export const arkadeRooms = pgTable("arkade_rooms", {
  code: text("code").primaryKey(),
  snapshot: jsonb("snapshot").$type<Snapshot>().notNull(),
  rev: integer("rev").notNull().default(0),
  endsAt: bigint("ends_at", { mode: "number" }),
  closed: boolean("closed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const arkadeHistory = pgTable(
  "arkade_history",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    entry: jsonb("entry").$type<GameHistoryEntry>().notNull(),
    endedAt: bigint("ended_at", { mode: "number" }).notNull(),
  },
  (t) => [index("arkade_history_ended_at_idx").on(t.endedAt)],
);
