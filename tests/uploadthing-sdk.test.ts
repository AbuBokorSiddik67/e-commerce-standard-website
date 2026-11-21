import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UTApi } from 'uploadthing/server';

test('UploadThing SDK still uploads and rolls back with the pinned Effect release (mock transport)', async () => {
  const methods: string[] = [];
  const cleanupBodies: unknown[] = [];
  const publicUrl = 'https://fixture.ufs.sh/f/fixture.webp';
  const api = new UTApi({
    token: Buffer.from(JSON.stringify({ apiKey: 'sk_fixture_only', appId: 'fixture', regions: ['local'], ingestHost: 'ingest.example.invalid' })).toString('base64'),
    apiUrl: 'https://api.example.invalid',
    logLevel: 'Error',
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      methods.push(request.method);
      if (request.method === 'PUT') {
        assert.equal(url.hostname, 'local.ingest.example.invalid');
        const uploaded = (await request.formData()).get('file');
        assert(uploaded instanceof File);
        assert.equal(await uploaded.text(), 'offline fixture');
        return Response.json({ url: publicUrl, appUrl: publicUrl, ufsUrl: publicUrl, fileHash: 'fixture' });
      }
      assert.equal(url.origin, 'https://api.example.invalid');
      assert.equal(url.pathname, '/v6/deleteFiles');
      cleanupBodies.push(await request.json());
      return Response.json({ success: true, deletedCount: 1 });
    },
  });
  const [result] = await api.uploadFiles([new File(['offline fixture'], 'fixture.webp', { type: 'image/webp' })]);
  assert.equal(result.error, null);
  assert.equal(result.data?.ufsUrl, publicUrl);
  assert(result.data?.key);
  const fileKey = result.data.key;
  const resultOfCleanup = await api.deleteFiles(fileKey);
  assert.equal(resultOfCleanup.success, true);
  assert.equal(resultOfCleanup.deletedCount, 1);
  assert.deepEqual(methods, ['PUT', 'POST']);
  assert.deepEqual(cleanupBodies, [{ fileKeys: [fileKey] }]);
});
