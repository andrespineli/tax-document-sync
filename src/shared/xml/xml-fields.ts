import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

export class XmlFields {
  parse(xml: string): unknown {
    return parser.parse(xml);
  }

  findString(value: unknown, key: string): string | undefined {
    const found = this.find(value, key);
    if (typeof found === "string") {
      return found;
    }
    if (typeof found === "number") {
      return String(found);
    }
    return undefined;
  }

  private find(value: unknown, key: string): unknown {
    if (value === null || typeof value !== "object") {
      return undefined;
    }

    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return (value as Record<string, unknown>)[key];
    }

    for (const child of Object.values(value as Record<string, unknown>)) {
      const found = this.find(child, key);
      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }
}
