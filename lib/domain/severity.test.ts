import { describe, expect, it } from "vitest";
import { SEVERITIES } from "@/lib/domain/severity";

describe("SEVERITIES", () => {
  it("declares exactly the three levels the product uses, in escalation order", () => {
    expect(SEVERITIES).toEqual(["general", "contact_clinic", "urgent"]);
  });
});
