import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogIndex, categoryPath, excerpt, productPath, serializeJsonLd, siteOrigin } from '../src/lib/seo';

test('canonical origin is explicit, normalized and HTTPS in production', () => {
  assert.equal(siteOrigin({})?.href, undefined);
  assert.equal(siteOrigin({ NODE_ENV: 'production', AUTH_URL: 'http://shop.example' }), undefined);
  assert.equal(siteOrigin({ NEXT_PUBLIC_APP_URL: 'https://shop.example/my-site' }), undefined);
  assert.equal(siteOrigin({ NEXT_PUBLIC_APP_URL: 'https://one:two@shop.example' }), undefined);
  assert.equal(siteOrigin({ NEXT_PUBLIC_APP_URL: 'https://shop.example?tracking=yes' }), undefined);
  assert.equal(siteOrigin({ NEXT_PUBLIC_APP_URL: 'https://shop.example', AUTH_URL: 'https://auth.example' })?.href, 'https://shop.example/');
});

test('clean category and real pagination are canonical; facets and repeated parameters are not', () => {
  assert.deepEqual(catalogIndex({category:'office',page:'2',utm_source:'newsletter'}, 'office'), {index:true,path:'/products?category=office&page=2',page:2});
  assert.equal(catalogIndex({category:'office',inStock:'true'}, 'office').index, false);
  assert.equal(catalogIndex({category:'office',page:'2',search:'pen'}, 'office').path, '/products?category=office');
  assert.equal(catalogIndex({category:['office','hidden']}, 'office').index, false);
  assert.equal(catalogIndex({category:'archived'}).index, false);
  assert.equal(catalogIndex({page:'-1'}).index, false);
  assert.equal(categoryPath('a&b'), '/products?category=a%26b');
  assert.equal(productPath('a/b'), '/product/a%2Fb');
});

test('JSON-LD cannot close its script and descriptions have bounded Unicode text', () => {
  const name = '</script><div>shop</div>';
  assert.equal(serializeJsonLd({name}).includes('<'), false);
  assert.equal(JSON.parse(serializeJsonLd({name})).name, name);
  assert.equal(excerpt('  A\n B 👍 end ', 6), 'A B 👍…');
});
