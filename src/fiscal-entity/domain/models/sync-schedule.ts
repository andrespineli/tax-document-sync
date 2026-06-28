export class SyncSchedule {
  constructor(
    readonly lastDfeSequenceNumber: number,
    readonly nextSearchAt: Date | null,
  ) {
    if (!Number.isInteger(lastDfeSequenceNumber) || lastDfeSequenceNumber < 0) {
      throw new Error("Last DFe sequence number must be a non-negative integer");
    }
  }

  isSearchAllowed(now: Date): boolean {
    return this.nextSearchAt === null || this.nextSearchAt <= now;
  }

  updateLastDfeSequenceNumber(lastDfeSequenceNumber: number): SyncSchedule {
    return new SyncSchedule(lastDfeSequenceNumber, this.nextSearchAt);
  }

  retryAfter(minutes: number, now: Date): SyncSchedule {
    return new SyncSchedule(
      this.lastDfeSequenceNumber,
      new Date(now.getTime() + minutes * 60_000),
    );
  }
}
