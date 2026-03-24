const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(context) {
  if (!context || context.electronPlatformName !== 'win32') {
    return;
  }

  const productFileName = context.packager && context.packager.appInfo
    ? context.packager.appInfo.productFilename
    : 'FrowCRRD';
  const exePath = path.join(context.appOutDir, `${productFileName}.exe`);
  const iconPath = path.join(context.packager.info.projectDir, 'build', 'icon.ico');

  if (!fs.existsSync(exePath)) {
    console.warn(`[afterPack] EXE not found, icon patch skipped: ${exePath}`);
    return;
  }

  if (!fs.existsSync(iconPath)) {
    console.warn(`[afterPack] icon.ico not found, icon patch skipped: ${iconPath}`);
    return;
  }

  const { rcedit } = await import('rcedit');
  await rcedit(exePath, { icon: iconPath });
  console.log(`[afterPack] Applied icon to ${exePath}`);
};
