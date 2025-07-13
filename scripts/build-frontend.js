#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 環境を取得（デフォルト: dev）
const env = process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1] || 
           process.env.CDK_ENV || 'dev';

console.log(`Building frontend for environment: ${env}`);

// 環境別の.envファイルを読み込み
const envFile = `.env.${env}`;
if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
  console.log(`Loaded config from ${envFile}`);
} else {
  console.warn(`Warning: ${envFile} not found, using system environment variables`);
}

// テンプレートファイルを読み込み
const appJsTemplate = fs.readFileSync('public/app.js', 'utf8');
const indexHtmlTemplate = fs.readFileSync('public/index.html', 'utf8');

// 環境別のGoogle Client IDを取得
const googleClientId = process.env[`GOOGLE_CLIENT_ID_${env.toUpperCase()}`] || 
                      process.env.GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.error(`Error: GOOGLE_CLIENT_ID_${env.toUpperCase()} is not set in ${envFile}`);
  console.error('Available environment variables:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
  process.exit(1);
}

// テンプレート置換
const appJsContent = appJsTemplate.replace('{{GOOGLE_CLIENT_ID}}', googleClientId);

// ビルド出力ディレクトリを作成
const buildDir = 'build/frontend';
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// ファイルを出力
fs.writeFileSync(path.join(buildDir, 'app.js'), appJsContent);
fs.writeFileSync(path.join(buildDir, 'index.html'), indexHtmlTemplate);
fs.writeFileSync(path.join(buildDir, 'style.css'), fs.readFileSync('public/style.css', 'utf8'));

console.log(`✅ Frontend built successfully to ${buildDir}/`);
console.log(`   Environment: ${env}`);
console.log(`   Google Client ID: ${googleClientId.substring(0, 20)}...`);