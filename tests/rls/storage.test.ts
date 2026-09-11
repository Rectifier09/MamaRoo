// @vitest-environment node
// jsdom's Blob loses the constructor's `type` on upload (supabase-js storage saw
// text/plain instead of image/png, tripping the bucket's allowed_mime_types check),
// same reason tests/rls/waitlist.test.ts pins the node environment.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("alice"));
  bob = await asUser(uniqueEmail("bob"));
});
afterAll(resetUsers);

const file = () => new Blob(["fake-image-bytes"], { type: "image/png" });

describe("reports bucket", () => {
  it("lets a user upload into her own folder", async () => {
    const { error } = await alice.client.storage.from("reports").upload(`${alice.userId}/r1/scan.png`, file());
    expect(error).toBeNull();
  });

  it("refuses an upload into another user's folder", async () => {
    const { error } = await bob.client.storage.from("reports").upload(`${alice.userId}/r2/sneaky.png`, file());
    expect(error).not.toBeNull();
  });

  it("refuses to download another user's file", async () => {
    const { error } = await bob.client.storage.from("reports").download(`${alice.userId}/r1/scan.png`);
    expect(error).not.toBeNull();
  });

  it("refuses a file type outside the allowed list", async () => {
    const exe = new Blob(["MZ"], { type: "application/x-msdownload" });
    const { error } = await alice.client.storage.from("reports").upload(`${alice.userId}/r3/x.exe`, exe);
    expect(error).not.toBeNull();
  });

  it("issues a signed URL for her own file", async () => {
    const { data, error } = await alice.client.storage.from("reports").createSignedUrl(`${alice.userId}/r1/scan.png`, 60);
    expect(error).toBeNull();
    expect(data?.signedUrl).toContain("token=");
  });
});
