/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Heroes — أبطال الفصل
 * Express + Vite Development & Production Server
 * Prepared & Developed by Teacher Osama Al-Shehri (إعداد وتطوير المعلم أسامة الشهري)
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Direct download of the complete source code package for Xcode & Apple App Store
  app.get('/api/export-source', (_req, res) => {
    try {
      const archivePath = path.join('/tmp', 'class-heroes-source-code.tar.gz');
      const itemsToInclude = [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'capacitor.config.json',
        'index.html',
        'server.ts',
        'metadata.json',
        'public',
        'src',
        'server',
      ].filter((item) => fs.existsSync(path.join(__dirname, item)));

      execFileSync('tar', ['-czf', archivePath, ...itemsToInclude], {
        cwd: __dirname,
      });

      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="class-heroes-source-code.tar.gz"'
      );
      const stream = fs.createReadStream(archivePath);
      stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: 'تعذر تجهيز ملف البرمجة للتحميل: ' + err.message });
    }
  });

  // System status endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      appNameAr: 'أبطال الفصل',
      appNameEn: 'Class Heroes',
      developer: 'المطور: أسامة الشهري',
      serverTime: new Date().toISOString(),
    });
  });

  // Public HTML Privacy Policy Page for Apple App Store & Google Play Console Verification
  app.get('/privacy', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>سياسة الخصوصية وحماية البيانات — أبطال الفصل | Class Heroes</title>
  <style>
    body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 32px 16px; line-height: 1.8; }
    .card { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 24px; padding: 36px; box-shadow: 0 10px 30px rgba(15,23,42,0.06); border: 1px solid #e2e8f0; }
    h1 { color: #312e81; margin-top: 0; font-size: 26px; }
    h2 { color: #4338ca; font-size: 18px; margin-top: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: bold; }
    ul { padding-right: 20px; }
    li { margin-bottom: 10px; }
    .footer { margin-top: 32px; font-size: 13px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">متوافق مع نظام حماية البيانات الشخصية السعودي (PDPL) ومتطلبات App Store & Google Play</span>
    <h1>سياسة الخصوصية وحماية البيانات — تطبيق «أبطال الفصل (Class Heroes)»</h1>
    <p><strong>إعداد وتطوير:</strong> المعلم أسامة الشهري | <strong>معرّف الحزمة:</strong> <code>sa.classheroes.app</code></p>
    <h2>1. الحد الأدنى لجمع البيانات</h2>
    <ul>
      <li>يقتصر التطبيق على الاسم التربوي ورمز الدخول الصفي (مثل S101) دون جمع أي بيانات شخصية حساسة كالسجل المدني أو الموقع الجغرافي أو الصور الشخصية أو أرقام الهواتف للطلاب.</li>
    </ul>
    <h2>2. أمان القُصّر وبيئة الفصول الدراسية (Kids & Families Policy)</h2>
    <ul>
      <li>التطبيق خالٍ تمامًا من الإعلانات التجارية الخارجية أو أدوات التتبع الإعلاني أو غرف الدردشة المفتوحة.</li>
      <li>جميع الأنشطة والمسابقات والنقاط تدار بإشراف مباشر من معلم الفصل.</li>
    </ul>
    <h2>3. حفظ البيانات وحق الحذف الكامل</h2>
    <ul>
      <li>تُحفظ السجلات لأغراض تعليمية بحتة، ولا تُباع أو تُشارك مع أي طرف ثالث نهائيًا.</li>
      <li>يحق للمعلم أو ولي الأمر طلب تصدير البيانات أو حذف الحساب والسجلات بالكامل في أي وقت من داخل التطبيق.</li>
    </ul>
    <div class="footer">جميع الحقوق محفوظة للمعلم أسامة الشهري © 2026 — <a href="/">العودة إلى التطبيق الرئيسي</a></div>
  </div>
</body>
</html>`);
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Class Heroes server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
