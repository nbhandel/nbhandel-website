import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const site = resolve(root, 'site');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/restored-existing-videos.json'),'utf8'));
const home = readFileSync(resolve(site, 'index.html'),'utf8');
const categories = readFileSync(resolve(site, 'produkte.html'),'utf8');
const motion = readFileSync(resolve(site, 'assets/productfinder/story-motion.mjs'),'utf8');
const gallery = readFileSync(resolve(site, 'assets/productfinder/featured-gallery.mjs'),'utf8');

test('all six previously referenced Pexels videos are preserved locally with MP4, WebM and poster', () => {
  assert.equal(manifest.schema,'nbh.media.story.v1');
  assert.deepEqual(Object.keys(manifest.clips).sort(), ['buyer','comparison','method','partner','scanner','tools']);
  for(const [key,meta] of Object.entries(manifest.clips)){
    assert.ok(meta.source_from_previous_nbhandel_site.startsWith('https://'),key);
    assert.equal(meta.license,'https://www.pexels.com/legal-pages/license/');
    for(const [fileKey,sizeKey,hashKey] of [
      ['src','bytes','sha256'], ['webm_src','webm_bytes','webm_sha256'],['poster','poster_bytes','poster_sha256'],
    ]){
      const publicRef=meta[fileKey];
      assert.match(publicRef,/^\/media\/story\/[a-z-]+\.(mp4|webm|jpg)$/);
      const data=readFileSync(resolve(site,publicRef.slice(1)));
      assert.equal(data.length,meta[sizeKey],key+' '+fileKey+' size');
      assert.equal(createHash('sha256').update(data).digest('hex'),meta[hashKey],key+' '+fileKey+' hash');
      if(fileKey==='src') assert.equal(data.subarray(4,8).toString('ascii'),'ftyp');
      if(fileKey==='webm_src') assert.deepEqual([...data.subarray(0,4)], [0x1a,0x45,0xdf,0xa3]);
      if(fileKey==='poster') assert.deepEqual([...data.subarray(0,2)], [0xff,0xd8]);
    }
  }
});

test('six motion modules appear in the actual homepage layout, not HTML overlays', () => {
  assert.equal((home.match(/<video class="nbl-film-video"/g)||[]).length,6);
  assert.equal((categories.match(/<video class="nbl-film-video"/g)||[]).length,1);
  assert.ok(home.includes('class="pf-wrap nbl-story-grid"'));
  assert.ok(home.includes('class="nbl-tool-grid nbl-tool-motion-grid"'));
  assert.ok(home.includes('class="nbl-partner-copy"'));
  assert.ok(home.includes('id="nbl-gallery-track"'));
  for(const key of Object.keys(manifest.clips)){
    const mp4='/media/story/'+key+'.mp4';
    const webm='/media/story/'+key+'.webm';
    assert.ok(home.includes('data-src="'+mp4+'"') && home.includes('data-webm="'+webm+'"'),key);
  }
  assert.ok(categories.includes('data-webm="/media/story/scanner.webm"'));
  for(const page of [home,categories]){
    assert.ok(page.includes('story-sections.css'));
    assert.ok(page.includes('story-motion.mjs'));
    assert.ok(!page.includes('https://videos.pexels.com'));
    assert.ok(!page.includes('https://www.pexels.com/download/video'));
    assert.ok(!page.includes('nbh-desktop-v34-guard-js'));
  }
});

test('motion controller supports still-frame, reduced-motion and data-saver paths', () => {
  assert.ok(motion.includes("IntersectionObserver"));
  assert.ok(motion.includes('reduceMotion.matches'));
  assert.ok(motion.includes('connection?.saveData'));
  assert.ok(motion.includes("document.hidden"));
  assert.ok(motion.includes('button.addEventListener'));
  assert.ok(motion.includes("video.canPlayType"));
  assert.ok(motion.includes('max'));
  assert.ok(!motion.includes('https://'));
});

test('interactive product gallery uses the existing sample catalog with no affiliate click shortcuts', () => {
  assert.ok(home.includes('featured-gallery.mjs'));
  assert.ok(gallery.includes('/data/productfinder/sample-catalog.v1.json'));
  assert.ok(gallery.includes("dataset.mode !== 'sample'"));
  assert.ok(gallery.includes('dataset.offers.length'));
  assert.ok(gallery.includes('product.imageCreditUrl'));
  assert.ok(gallery.includes("product.title"));
  assert.ok(!gallery.includes('https://videos.pexels.com'));
  assert.ok(!gallery.includes('window.location.assign('));
});
