import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAdminAuthorized } from "../src/lib/admin-auth";

function req(token?: string) {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: token === undefined ? {} : { "x-admin-token": token },
  });
}

describe("isAdminAuthorized", () => {
  const original = process.env.ADMIN_TOKEN;
  beforeEach(() => {
    process.env.ADMIN_TOKEN = "secret-token";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = original;
  });

  it("rejects when ADMIN_TOKEN is unset, even with no header", () => {
    delete process.env.ADMIN_TOKEN;
    expect(isAdminAuthorized(req())).toBe(false);
    expect(isAdminAuthorized(req(""))).toBe(false);
  });

  it("rejects when ADMIN_TOKEN is empty", () => {
    process.env.ADMIN_TOKEN = "";
    expect(isAdminAuthorized(req(""))).toBe(false);
  });

  it("rejects a missing or wrong token", () => {
    expect(isAdminAuthorized(req())).toBe(false);
    expect(isAdminAuthorized(req("secret-tokeX"))).toBe(false);
  });

  it("does not throw on different-length tokens", () => {
    expect(isAdminAuthorized(req("short"))).toBe(false);
    expect(isAdminAuthorized(req("secret-token-but-much-longer"))).toBe(false);
  });

  it("accepts the correct token", () => {
    expect(isAdminAuthorized(req("secret-token"))).toBe(true);
  });
});
