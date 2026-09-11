/** The three levels the whole product uses. Declared once; imported everywhere. */
export const SEVERITIES = ["general", "contact_clinic", "urgent"] as const;
export type Severity = (typeof SEVERITIES)[number];
