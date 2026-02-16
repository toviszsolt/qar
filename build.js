import esbuild from 'esbuild';
import fs, { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import path from 'path/posix';

const pathSrc = 'src';
const pathOutput = 'dist';
const withWatch = process.argv.includes('--watch');
const commonConfig = { bundle: true, minify: true, sourcemap: false };

const cleanBuild = () => {
  if (fs.existsSync(pathOutput)) {
    fs.rmSync(pathOutput, { recursive: true, force: true });
  }

  fs.mkdirSync(pathOutput);
  console.log(`[Build] Clean directory: ${path.sep}${pathOutput}`);
};

const runBuild = async (config) => {
  if (withWatch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log(`[Build] Watching: ${path.sep}${config.outfile || config.entryPoints}`);
  } else {
    console.log(`[Build] Building: ${path.sep}${config.outfile || config.entryPoints}`);
    await esbuild.build(config);
  }
};

const createLLMBundle = () => {
  const getFiles = (dir, files = []) => {
    readdirSync(dir).forEach((f) => {
      const filePath = path.join(dir, f);
      statSync(filePath).isDirectory() ? getFiles(filePath, files) : f.endsWith('.js') && files.push(filePath);
    });
    return files;
  };

  const bundleFileName = 'bundle-llm.js.txt';
  const bundle = getFiles(pathSrc)
    .map((f) => `// ${f}\n${readFileSync(f, 'utf-8')}`)
    .join('\n\n');

  writeFileSync(bundleFileName, bundle, 'utf-8');
  console.log(`[Build] Building: ${path.sep}${bundleFileName}`);
};

const copyTypeDefinitions = () => {
  const src = path.join(pathSrc, 'qar.d.ts');
  const dest = path.join(pathOutput, 'qar.d.ts');
  fs.copyFileSync(src, dest);
  console.log(`[Build] Copy definitions: ${path.sep}${dest}`);
};

try {
  if (!withWatch) {
    cleanBuild();
    copyTypeDefinitions();
    createLLMBundle();
  }

  for (const format of ['esm', 'cjs']) {
    const basename = format === 'esm' ? 'qar.js' : 'qar.cjs';
    await runBuild({
      ...commonConfig,
      entryPoints: [path.join(pathSrc, 'qar.js')],
      outfile: path.join(pathOutput, basename),
      format: format,
      platform: 'node',
      legalComments: 'none',
    });
  }
} catch (err) {
  console.error('[Build] Failed:', err);
  process.exit(1);
}
