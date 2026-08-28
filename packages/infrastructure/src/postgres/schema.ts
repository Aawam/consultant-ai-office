import { pgSchema } from "drizzle-orm/pg-core";

// The kickoff migration creates only the namespace. Business tables wait for
// contract-driven entity modeling so the bootstrap does not invent rules.
export const officeSchema = pgSchema("office");
