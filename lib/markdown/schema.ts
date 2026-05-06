import { z } from "zod";

export const ActivityTypeSchema = z.enum([
  "meal",
  "sightseeing",
  "transit",
  "accommodation",
  "activity",
]);

export const ActivitySchema = z.object({
  id: z.string(),
  time: z.string().optional(),
  title: z.string(),
  location: z.string().optional(),
  emoji: z.string().optional(),
  notes: z.array(z.string()).optional(),
  url: z.string().optional(),
  duration: z.string().optional(),
  price: z.string().optional(),
  tips: z.array(z.string()).optional(),
  type: ActivityTypeSchema.optional(),
});

export const DaySchema = z.object({
  index: z.number(),
  date: z.string(),
  label: z.string(),
  items: z.array(ActivitySchema),
});

export const ItineraryMetaSchema = z.object({
  title: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  travelers: z.number(),
  theme: z.string().optional(),
});

export const ItinerarySchema = z.object({
  meta: ItineraryMetaSchema,
  days: z.array(DaySchema),
  raw_markdown: z.string(),
});

export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Day = z.infer<typeof DaySchema>;
export type ItineraryMeta = z.infer<typeof ItineraryMetaSchema>;
export type Itinerary = z.infer<typeof ItinerarySchema>;
