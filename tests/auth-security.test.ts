import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { friendlyError, logError, PublicError } from "../src/lib/errors";
import { credentialsSchema, newPassword, registerSchema } from "../src/lib/validations/auth";
import { normalizeImage } from "../src/server/services/upload-image";
import { readBoundedBody, BodyLimitError } from "../src/lib/request-security";
import { escapeCsv } from "../src/lib/csv";
import { safeImageUrl, safeLink } from "../src/lib/safe-urls";
import { resetMailConfig } from "../src/server/services/reset-mail";

test("credentials use byte limits, canonical email and server-controlled roles", () => {
  assert.equal(newPassword.safeParse("বাংলা".repeat(12)).success, false);
  assert.equal(newPassword.safeParse("valid password long enough").success, true);
  assert.deepEqual(credentialsSchema.parse({email:" Buyer@Example.test ", password:"old-pass", role:"ADMIN"}), {email:"buyer@example.test",password:"old-pass",portal:"customer"});
  assert.equal("role" in registerSchema.parse({name:"Test Buyer", email:"buyer@example.test", phone:"01700000000", password:"fixture-only-pass", confirmPassword:"fixture-only-pass", role:"ADMIN"}),false);
});

test("error boundaries redact arbitrary application or provider error details", () => {
  const error = new Error("private fixture password and reset token");
  assert.equal(friendlyError(error,"Generic"),"Generic");
  assert.equal(friendlyError(new PublicError("No stock"),"Generic"),"No stock");
  const log = console.error;
  try {
    console.error = (...args: unknown[]) => assert.doesNotMatch(JSON.stringify(args), /fixture password|reset token/i);
    logError("unit.check", error);
  } finally { console.error = log; }
});

test("uploads require a real bounded raster and discard supplied names and payload tails", async () => {
  assert.equal(await normalizeImage("string multipart entry"),null);
  assert.equal(await normalizeImage(new File(["test content"], "invalid.png", {type:"image/png"})),null);
  const png = await sharp({create:{width:4,height:4,channels:3,background:"red"}}).png().toBuffer();
  assert.equal(await normalizeImage(new File([new Uint8Array(png)], "mismatch.jpg", {type:"image/jpeg"})),null);
  const result = await normalizeImage(new File([new Uint8Array(png),"fixture-marker"], "../../original-name.png", {type:"image/png"}));
  assert.match(result?.name ?? "",/^[a-f0-9-]{36}\.webp$/);
  assert.equal(result?.type,"image/webp");
  const body = Buffer.from(await result!.arrayBuffer());
  assert.equal(body.includes("fixture-marker"),false);
  assert.equal((await sharp(body).metadata()).width,4);
  const huge = await sharp({create:{width:4097,height:1,channels:3,background:"red"}}).png().toBuffer();
  assert.equal(await normalizeImage(new File([new Uint8Array(huge)],"big.png",{type:"image/png"})),null);
});

test("request bodies enforce a cap without trusting declared length", async () => {
  await assert.rejects(readBoundedBody(new Request("https://shop.example.test", {method:"POST", body:"123456",headers:{"content-length":"1"}}),4),BodyLimitError);
  assert.equal(new TextDecoder().decode(await readBoundedBody(new Request("https://shop.example.test",{method:"POST",body:"123"}),4)),"123");
});

test("export cells are inert text and external image sources are allowlisted", () => {
  assert.equal(escapeCsv("\t=1+1"),`"'\t=1+1"`);
  assert.equal(escapeCsv('test, "field"'),'"test, ""field"""');
  assert.equal(safeLink("javascript:void(0)"),null);
  assert.equal(safeLink("//other.example.test"),null);
  assert.equal(safeImageUrl("/uploads/item.webp"),"/uploads/item.webp");
  assert.equal(safeImageUrl("/uploads/../item.webp"),null);
  assert.equal(safeImageUrl("https://unconfigured.example.test/image.png"),null);
});

test("password recovery requires an explicit delivery configuration and canonical HTTPS", () => {
  assert.equal(resetMailConfig({AUTH_URL:"https://example.test"}),null);
  assert.equal(resetMailConfig({NODE_ENV:"production",AUTH_URL:"http://localhost:3000",RESEND_API_KEY:"synthetic",PASSWORD_RESET_FROM:"sender@example.test"}),null);
  assert.equal(resetMailConfig({NODE_ENV:"production",AUTH_URL:"https://shop.example.test",RESEND_API_KEY:"synthetic",PASSWORD_RESET_FROM:"sender@example.test"})?.origin,"https://shop.example.test");
});


test("checked-in product media can be retained on edit without opening arbitrary paths", () => {
  const product = "/uploads/products/premium-leather-notebook-a5.jpg";
  assert.equal(safeImageUrl(product), product);
  for (const path of ["/uploads/products/../item.jpg", "/uploads/products/%2e%2e/item.jpg", "/uploads/products/child/item.jpg", "/uploads/other/item.jpg", "/uploads/products/item.svg", "/uploads/products/item.jpg?x=1"]) {
    assert.equal(safeImageUrl(path), null);
  }
});
