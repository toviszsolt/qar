import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const isWatch = process.argv.includes('--watch');
const outDir = 'dist';
const common = {
  bundle: true,
  minify: true,
  sourcemap: false,
};

const runBuild = async (config) => {
  if (isWatch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log(`Watching: ${config.outfile || config.entryPoints}`);
  } else {
    console.log(`Building: ${config.outfile || config.entryPoints}`);
    await esbuild.build(config);
  }

  fs.copyFileSync('src/qar.d.ts', path.join(outDir, 'qar.d.ts'));
};

if (!isWatch) {
  fs.rmSync(outDir, { recursive: true, force: true });
}

(async () => {
  ['esm', 'cjs'].forEach(async (format) => {
    await runBuild({
      ...common,
      entryPoints: ['src/qar.js'],
      outfile: path.join(outDir, `qar.${format === 'esm' ? 'js' : 'cjs'}`),
      format: format,
      platform: 'node',
      target: ['node18'],
      legalComments: 'none',
    });
  });

  await runBuild({
    ...common,
    entryPoints: ['src/qar.js'],
    outfile: 'bundle-llm.js.txt',
    format: 'esm',
    minify: false,
    platform: 'node',
  });
})();
