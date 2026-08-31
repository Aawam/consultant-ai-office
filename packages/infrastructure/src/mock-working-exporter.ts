import { ApplicationError, type RabWorkbookExporterPort } from "@consultant-ai-office/application";

export interface VersionedWorkingExportFixture {
  readonly fixtureVersion: string;
  readonly bytes: Uint8Array;
}

export class MockWorkingRabWorkbookExporter implements RabWorkbookExporterPort {
  readonly fixtureVersion: string;

  constructor(private readonly fixture: VersionedWorkingExportFixture) {
    this.fixtureVersion = fixture.fixtureVersion;
  }

  async build(input: Parameters<RabWorkbookExporterPort["build"]>[0]): Promise<Uint8Array> {
    if (input.exportType !== "WORKING") {
      throw new ApplicationError("VALIDATION_ERROR", "Mock working exporter only supports WORKING output");
    }
    return this.fixture.bytes.slice();
  }
}
