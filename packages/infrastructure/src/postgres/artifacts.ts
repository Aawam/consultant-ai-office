import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type { ArtifactRecord, ArtifactStoragePort } from "@consultant-ai-office/application";
import { exportArtifacts, postgresSchema } from "./schema";
import { FileArtifactStorage } from "../excel-exporter";

export class PostgresArtifactStorage implements ArtifactStoragePort {
  private readonly files: FileArtifactStorage;
  constructor(pool: Pool, root: string) { this.database = drizzle(pool, { schema: postgresSchema }); this.files = new FileArtifactStorage(root); }
  private readonly database: ReturnType<typeof drizzle<typeof postgresSchema>>;
  async save(record: ArtifactRecord, bytes: Uint8Array): Promise<ArtifactRecord> {
    const saved = await this.files.save(record, bytes);
    await this.database.insert(exportArtifacts).values(saved);
    return saved;
  }
}
