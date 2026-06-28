export class MissingCertificate extends Error {
  constructor() {
    super("Certificate content and password are required");
  }
}
