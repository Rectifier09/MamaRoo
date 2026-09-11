import { describe, expect, it } from "vitest";
import { addDays, diffDays, isValidDateString, todayInAppZone } from "@/lib/domain/dates";

describe("todayInAppZone", () => {
  it("returns the Indian calendar day, not the machine's", () => {
    // 2026-09-11T19:30:00Z is already 2026-09-12 in Asia/Kolkata (UTC+5:30).
    expect(todayInAppZone(new Date("2026-09-11T19:30:00Z"))).toBe("2026-09-12");
  });

  it("returns the same day just before the Indian midnight boundary", () => {
    expect(todayInAppZone(new Date("2026-09-11T18:29:00Z"))).toBe("2026-09-11");
  });

  it("formats as YYYY-MM-DD with leading zeroes", () => {
    expect(todayInAppZone(new Date("2026-01-05T06:00:00Z"))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("adds days across a year boundary", () => {
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("subtracts with a negative count", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("adds the full gestation length correctly", () => {
    expect(addDays("2026-01-01", 280)).toBe("2026-10-08");
  });
});

describe("diffDays", () => {
  it("counts forward days as positive", () => {
    expect(diffDays("2026-09-01", "2026-09-11")).toBe(10);
  });

  it("counts backward days as negative", () => {
    expect(diffDays("2026-09-11", "2026-09-01")).toBe(-10);
  });

  it("returns zero for the same day", () => {
    expect(diffDays("2026-09-11", "2026-09-11")).toBe(0);
  });

  it("is unaffected by daylight-saving transitions elsewhere in the world", () => {
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("isValidDateString", () => {
  it.each(["2026-09-11", "2028-02-29"])("accepts %s", (value) => {
    expect(isValidDateString(value)).toBe(true);
  });

  it.each(["2026-13-01", "2026-02-30", "11-09-2026", "2026-9-1", "", "not a date"])(
    "rejects %s",
    (value) => {
      expect(isValidDateString(value)).toBe(false);
    },
  );
});
