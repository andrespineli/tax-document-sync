import { MissingCertificate } from "../exceptions/missing-certificate";

export class Certificate {
  constructor(
    readonly contentBase64: string,
    readonly password: string,
  ) {
    if (!contentBase64.trim() || !password.trim()) {
      throw new MissingCertificate();
    }
  }
}
