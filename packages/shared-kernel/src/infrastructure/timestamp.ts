export class TimestampHelper {
  static toUnixSeconds(date: Date | undefined | null): number | null {
    if (!date) return null;
    return Math.floor(new Date(date).getTime() / 1000);
  }

  static fromUnixSeconds(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }
}
