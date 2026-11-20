import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import bcrypt from "bcryptjs";

const raw = process.env.SHOPBD_SECURITY_TEST_DATABASE_URL;
if (!raw) throw new Error("Set SHOPBD_SECURITY_TEST_DATABASE_URL to a disposable loopback shopbd_security_test database");
const url = new URL(raw);
if (!["postgres:","postgresql:"].includes(url.protocol) || !["localhost","127.0.0.1","[::1]"].includes(url.hostname) || url.pathname !== "/shopbd_security_test" || url.search || url.hash) throw new Error("Disposable local DB required");
process.env.DATABASE_URL = raw;
process.env.AUTH_SECRET ||= randomUUID();
const password = "synthetic fixture passphrase";
const nextPassword = "different synthetic password";

test("PostgreSQL authentication and session policy", async (t) => {
  const { prisma } = await import("../src/lib/prisma");
  const { issueSession, readSession, revokeSession, verifyCredentials, createPasswordResetToken, resetPassword, changePassword } = await import("../src/server/services/auth-security");
  const { consumeRateLimit, limitKey } = await import("../src/lib/shared-rate-limit");
  const { registerCustomer, updateCustomerAddress } = await import("../src/server/services/account.service");
  const { setCustomerBlocked } = await import("../src/server/services/customer.service");
  const { registerSchema } = await import("../src/lib/validations/auth");
  const { updateStoreSettings } = await import("../src/server/repositories/settings.repo");
  const { saveSettingsAction, deleteProductAction } = await import("../src/server/actions/admin");
  const { changePasswordAction } = await import("../src/server/actions/account");
  t.after(() => prisma.$disconnect());
  const hash = await bcrypt.hash(password, 4);
  const create = (role: "ADMIN" | "CUSTOMER" = "CUSTOMER") => prisma.user.create({ data: { email:`${randomUUID()}@example.test`, role, passwordHash: hash } });
  const h = new Headers();
  const admin = await create("ADMIN");

  await t.test("roles are independent of client registration/login claims and sessions", async () => {
    const input = registerSchema.parse({name:"Customer", phone:"01700000000", email:`${randomUUID()}@example.test`, password, confirmPassword:password, role:"ADMIN"});
    const { id } = await registerCustomer(input);
    const account = await prisma.user.findUniqueOrThrow({where:{id}});
    assert.equal(account.role,"CUSTOMER");
    assert.equal(await verifyCredentials({email:account.email,password,portal:"admin"},h),null);
    assert.equal(await verifyCredentials({email:admin.email,password},h),null);
    assert.equal((await verifyCredentials({email:admin.email,password,portal:"admin"},h))?.role,"ADMIN");
    assert.equal(await createPasswordResetToken(admin.email),null);
    const address = await prisma.address.create({ data: { userId: account.id, fullName: "Fixture", phone: "01700000000", address: "Fixture road", district: "Dhaka", city: "Dhaka" } });
    await assert.rejects(updateCustomerAddress((await create()).id,address.id,{fullName:"Changed",phone:"01700000000",address:"Other fixture road",district:"Dhaka",city:"Dhaka",isDefault:false}),/Address not found/);
    assert.equal((await prisma.address.findUniqueOrThrow({where:{id:address.id}})).fullName,"Fixture");
  });

  await t.test("operator provisioning never promotes a customer and rotation revokes the admin session", async () => {
    const provision = async (email: string, rotate: boolean, value: string) => {
      const child = spawn("npm", ["run", "auth:provision-admin", "--", ...(rotate ? ["--rotate"] : [])],
        { env: { ...process.env, SHOPBD_ADMIN_EMAIL: email }, stdio: ["pipe", "ignore", "ignore"] });
      child.stdin.end(`${value}\n`);
      return (await once(child, "exit"))[0];
    };
    const customer = await create();
    assert.equal(await provision(customer.email, true, password), 1);
    assert.equal((await prisma.user.findUniqueOrThrow({where:{id:customer.id}})).role, "CUSTOMER");
    const email = `${randomUUID()}@example.test`;
    assert.equal(await provision(email, false, password), 0);
    const operator = await prisma.user.findUniqueOrThrow({where:{email}});
    assert.equal(operator.role, "ADMIN");
    const session = await issueSession(operator);
    assert.equal(await provision(email, true, nextPassword), 0);
    assert.equal(await readSession(session.handle, operator), null);
    assert.equal((await verifyCredentials({email,password:nextPassword,portal:"admin"},h))?.id, operator.id);
  });

  await t.test("persisted sessions have absolute expiration and are revocable on logout", async () => {
    const start = new Date();
    const { handle, expires } = await issueSession(admin,start);
    assert.equal(expires.getTime()-start.getTime(),4*3600*1000);
    assert.ok(await readSession(handle,admin,start));
    assert.equal(await readSession(handle,admin,expires),null);
    assert.equal(await prisma.authSession.findUnique({where:{tokenHash:handle}}),null);
    await revokeSession(handle);
    assert.equal(await readSession(handle,admin,start),null);
  });

  await t.test("deactivation and role changes revoke existing sessions even if restored", async () => {
    const user = await create();
    const customer = await prisma.customer.create({data:{userId:user.id,fullName:"Fixture",phone:"01700000000"}});
    const {handle} = await issueSession(user);
    await setCustomerBlocked(customer.id,true,admin.id);
    await setCustomerBlocked(customer.id,false,admin.id);
    assert.equal(await readSession(handle,user),null);
    const current = await prisma.user.findUniqueOrThrow({where:{id:user.id}});
    const renewed = await issueSession(current);
    await prisma.user.update({where:{id:user.id},data:{role:"ADMIN"}});
    await prisma.user.update({where:{id:user.id},data:{role:"CUSTOMER"}});
    assert.equal(await readSession(renewed.handle,current),null);
    const badLink = await prisma.customer.create({data:{userId:admin.id,fullName:"Fixture",phone:"01700000000"}});
    assert.equal(await setCustomerBlocked(badLink.id,true,admin.id),null);
  });

  await t.test("atomic shared limits, generic bad credentials and one throttle event", async () => {
    const user = await create();
    const key = limitKey("test", randomUUID());
    const batches = await Promise.all(Array.from({length:12}, () => consumeRateLimit(key,4,60)));
    assert.equal(batches.filter((row) => row.allowed).length,4);
    assert.equal(batches.filter((row) => row.firstDenied).length,1);
    await prisma.securityRateBucket.update({where:{key},data:{expiresAt:new Date(0)}});
    assert.equal((await consumeRateLimit(key,4,60)).allowed,true);
    for (let i = 0; i < 8; i++) assert.equal(await verifyCredentials({email:user.email, password:"invalid"},h),null);
    assert.equal(await verifyCredentials({email:user.email,password},h),null);
    assert.equal(await verifyCredentials({email:user.email,password},h),null);
    assert.equal(await prisma.auditLog.count({where:{action:"LOGIN_THROTTLED",entityId:limitKey("login",`email:${user.email}`)}}),1);
  });

  await t.test("recovery is single-use under concurrency and rejects expired or superseded tokens", async () => {
    const user = await create();
    const session = await issueSession(user);
    const expired = (await createPasswordResetToken(user.email,new Date(0)))!;
    const reset = (token: string) => resetPassword({token,password:nextPassword,confirmPassword:nextPassword});
    assert.equal(await reset(expired.token),false);
    const first = (await createPasswordResetToken(user.email))!;
    const last = (await createPasswordResetToken(user.email))!;
    assert.equal(await reset(first.token),false);
    const results = await Promise.all([reset(last.token),reset(last.token)]);
    assert.equal(results.filter(Boolean).length,1);
    assert.equal(await reset(last.token),false);
    assert.equal(await readSession(session.handle,user),null);
    assert.ok(await verifyCredentials({email:user.email,password:nextPassword},h));
  });

  await t.test("configured mail integration sends a fragment link; no clear token is persisted", async () => {
    const { sendCustomerReset } = await import("../src/server/services/reset-mail");
    const user = await create();
    const env = { AUTH_URL: "https://shop.example.test", RESEND_API_KEY: "synthetic-provider-config", PASSWORD_RESET_FROM: "support@example.test" };
    const prior = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
    const originalFetch = globalThis.fetch;
    let link: URL | undefined;
    try {
      Object.assign(process.env, env);
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "https://api.resend.com/emails");
        assert.equal(init?.redirect, "error");
        const message = JSON.parse(String(init?.body));
        assert.deepEqual(message.to, [user.email]);
        link = new URL(message.text.match(/https:\/\/[^\s]+/)[0]);
        return new Response("", { status: 200 });
      };
      await sendCustomerReset(user.email);
      assert.ok(link);
      assert.equal(link.origin, env.AUTH_URL);
      assert.equal(link.pathname, "/reset-password");
      assert.equal(link.search, "");
      const token = new URLSearchParams(link.hash.slice(1)).get("token")!;
      assert.match(token, /^[0-9a-f]{64}$/);
      const row = await prisma.passwordResetToken.findUniqueOrThrow({ where: { userId: user.id } });
      assert.notEqual(row.tokenHash, token);
    } finally {
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  });

  await t.test("password change requires current credential and invalidates other sessions and recovery tokens", async () => {
    const user = await create();
    const sessions = await Promise.all([issueSession(user),issueSession(user)]);
    const reset = (await createPasswordResetToken(user.email))!;
    assert.equal(await changePassword(user.id,"wrong",nextPassword),false);
    assert.equal(await changePassword(user.id,password,nextPassword),true);
    for (const {handle} of sessions) assert.equal(await readSession(handle,user),null);
    assert.equal(await resetPassword({token:reset.token,password,confirmPassword:password}),false);
  });

  await t.test("sensitive actions deny no-session requests and settings changes have actor audit records", async () => {
    assert.equal((await saveSettingsAction(new FormData())).success,false);
    assert.equal((await deleteProductAction("fixture")).success,false);
    assert.equal((await changePasswordAction({currentPassword:password,password:nextPassword,confirmPassword:nextPassword})).success,false);
    await updateStoreSettings({storeName:"Synthetic fixture", codEnabled:false},admin.id);
    const event = await prisma.auditLog.findFirstOrThrow({where:{action:"STORE_SETTINGS_UPDATE",userId:admin.id}});
    assert.equal(event.entityId,"1");
    assert.doesNotMatch(JSON.stringify(event.detail),/Synthetic fixture|password/i);
  });
});
