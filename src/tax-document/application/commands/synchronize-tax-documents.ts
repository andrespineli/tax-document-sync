import { randomUUID } from "node:crypto";

export class SynchronizeTaxDocuments {
  constructor(
    readonly requestedAt: Date = new Date(),
    readonly runId: string = randomUUID(),
  ) {}
}
