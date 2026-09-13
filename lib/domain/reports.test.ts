import { describe, expect, it } from "vitest";
import {
  REPORT_MAX_SIZE_BYTES,
  assessPhotoQuality,
  looksLikeDuplicate,
  mimeGroup,
  sanitiseFilename,
  sizeBucket,
  sortReportsByDate,
  storagePath,
  validateReportFile,
  validateReportTitle,
  type ReportRecord,
} from "@/lib/domain/reports";

describe("validateReportFile", () => {
  it("accepts every allowed image type and application/pdf", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]) {
      expect(validateReportFile({ name: "x", type, size: 1000 })).toEqual({ ok: true, mimeGroup: "image" });
    }
    expect(validateReportFile({ name: "x.pdf", type: "application/pdf", size: 1000 })).toEqual({
      ok: true,
      mimeGroup: "pdf",
    });
  });

  it("rejects any other type with reason type", () => {
    expect(validateReportFile({ name: "x.gif", type: "image/gif", size: 1000 })).toEqual({ ok: false, reason: "type" });
    expect(validateReportFile({ name: "x.txt", type: "text/plain", size: 1000 })).toEqual({ ok: false, reason: "type" });
  });

  it("rejects a file over 20 MB with reason size", () => {
    expect(validateReportFile({ name: "x.jpg", type: "image/jpeg", size: REPORT_MAX_SIZE_BYTES + 1 })).toEqual({
      ok: false,
      reason: "size",
    });
    expect(validateReportFile({ name: "x.jpg", type: "image/jpeg", size: REPORT_MAX_SIZE_BYTES })).toEqual({
      ok: true,
      mimeGroup: "image",
    });
  });

  it("rejects a zero-byte file with reason empty, checked before type or size", () => {
    expect(validateReportFile({ name: "x.jpg", type: "image/jpeg", size: 0 })).toEqual({ ok: false, reason: "empty" });
    expect(validateReportFile({ name: "x.jpg", type: "image/gif", size: 0 })).toEqual({ ok: false, reason: "empty" });
  });
});

describe("mimeGroup", () => {
  it("classifies pdf and everything else as image", () => {
    expect(mimeGroup("application/pdf")).toBe("pdf");
    expect(mimeGroup("image/heic")).toBe("image");
  });
});

describe("sizeBucket", () => {
  it("buckets small, medium, and large by byte thresholds", () => {
    expect(sizeBucket(500_000)).toBe("small");
    expect(sizeBucket(4_000_000)).toBe("medium");
    expect(sizeBucket(15_000_000)).toBe("large");
  });
});

describe("storagePath", () => {
  it("produces {userId}/{reportId}/{filename} with no leading slash", () => {
    expect(storagePath({ userId: "u1", reportId: "r1", filename: "scan.jpg" })).toBe("u1/r1/scan.jpg");
  });
});

describe("sanitiseFilename", () => {
  it("strips path separators", () => {
    expect(sanitiseFilename("a/b\\c.jpg")).toBe("a-b-c.jpg");
  });

  it("strips leading dots", () => {
    expect(sanitiseFilename(".hidden.jpg")).toBe("hidden.jpg");
  });

  it("collapses whitespace to hyphens", () => {
    expect(sanitiseFilename("my   report copy.pdf")).toBe("my-report-copy.pdf");
  });

  it("preserves the extension and keeps Devanagari characters intact", () => {
    expect(sanitiseFilename("रिपोर्ट.jpg")).toBe("रिपोर्ट.jpg");
  });

  it("truncates a very long name to 80 characters plus the extension", () => {
    const result = sanitiseFilename(`${"a".repeat(200)}.jpg`);
    expect(result).toBe(`${"a".repeat(80)}.jpg`);
  });

  it("never returns an empty string, falling back to a generic name", () => {
    expect(sanitiseFilename("...jpg")).toBe("report.jpg");
    expect(sanitiseFilename("")).toBe("report");
  });
});

describe("assessPhotoQuality", () => {
  it("flags a small image file as unclear", () => {
    expect(assessPhotoQuality({ mimeGroup: "image", sizeBytes: 20_000 })).toBe("unclear");
  });

  it("accepts a normally-sized image as clear", () => {
    expect(assessPhotoQuality({ mimeGroup: "image", sizeBytes: 500_000 })).toBe("clear");
  });

  it("never flags a pdf, since the quality check is about photo capture", () => {
    expect(assessPhotoQuality({ mimeGroup: "pdf", sizeBytes: 20_000 })).toBe("clear");
  });
});

describe("looksLikeDuplicate", () => {
  const existing = [{ sizeBytes: 512_000, mimeType: "image/jpeg" }];

  it("flags a file matching an existing report's exact size and type", () => {
    expect(looksLikeDuplicate({ sizeBytes: 512_000, mimeType: "image/jpeg" }, existing)).toBe(true);
  });

  it("does not flag a different size or a different type", () => {
    expect(looksLikeDuplicate({ sizeBytes: 512_001, mimeType: "image/jpeg" }, existing)).toBe(false);
    expect(looksLikeDuplicate({ sizeBytes: 512_000, mimeType: "image/png" }, existing)).toBe(false);
  });
});

describe("validateReportTitle", () => {
  it("trims the outside", () => {
    expect(validateReportTitle("  Ultrasound scan  ")).toEqual({ ok: true, value: "Ultrasound scan" });
  });

  it("returns field errors for blank, overlong, and malformed values", () => {
    expect(validateReportTitle("   ")).toEqual({ ok: false, error: "empty" });
    expect(validateReportTitle("x".repeat(141))).toEqual({ ok: false, error: "too_long" });
    expect(validateReportTitle(null)).toEqual({ ok: false, error: "invalid" });
  });
});

describe("sortReportsByDate", () => {
  it("orders reports reverse-chronologically by report date, without mutating the input", () => {
    const reports: ReportRecord[] = [
      { id: "1", title: "Oldest", reportType: null, reportDate: "2026-08-01", mimeType: "image/jpeg", sizeBytes: 1000, pageCount: null, createdAt: "2026-08-01T00:00:00Z" },
      { id: "2", title: "Newest", reportType: null, reportDate: "2026-09-10", mimeType: "image/jpeg", sizeBytes: 1000, pageCount: null, createdAt: "2026-09-10T00:00:00Z" },
    ];
    const sorted = sortReportsByDate(reports);
    expect(sorted.map((r) => r.id)).toEqual(["2", "1"]);
    expect(reports.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("breaks a same-date tie by most recently uploaded first", () => {
    const reports: ReportRecord[] = [
      { id: "1", title: "Uploaded first", reportType: null, reportDate: "2026-09-10", mimeType: "image/jpeg", sizeBytes: 1000, pageCount: null, createdAt: "2026-09-10T09:00:00Z" },
      { id: "2", title: "Uploaded second", reportType: null, reportDate: "2026-09-10", mimeType: "image/jpeg", sizeBytes: 1000, pageCount: null, createdAt: "2026-09-10T10:00:00Z" },
    ];
    expect(sortReportsByDate(reports).map((r) => r.id)).toEqual(["2", "1"]);
  });
});
