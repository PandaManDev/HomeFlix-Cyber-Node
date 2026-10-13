const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

(async () => {
  const root = path.resolve(__dirname, '..');
  const build = path.join(root, 'build');
  fs.mkdirSync(build, { recursive: true });
  const png = path.join(build, 'homeflix-icon.png');
  const ico = path.join(build, 'homeflix.ico');
  await sharp(path.join(build, 'homeflix-icon.svg')).resize(256, 256).png().toFile(png);
  fs.writeFileSync(ico, await pngToIco(png));
  console.log('Generated HomeFlix Windows icon.');
})().catch(error => { console.error(error); process.exit(1); });
