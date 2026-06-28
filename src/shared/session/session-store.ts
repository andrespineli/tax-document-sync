export class SessionStore {
  private token: string | null = null;
  private username: string | null = null;

  start(token: string, username: string): void {
    this.token = token;
    this.username = username;
  }

  end(): void {
    this.token = null;
    this.username = null;
  }

  require(token: string | undefined): string {
    if (!token || token !== this.token || !this.username) {
      throw new Error("Unauthorized");
    }

    return this.username;
  }
}
