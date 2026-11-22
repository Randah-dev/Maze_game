# ورشة الموشن جرافيك والألعاب الخفيفة

قالب جاهز لتعلّم بناء **موشن جرافيك** و**ألعاب خفيفة** تعمل على المتصفح بمساعدة الذكاء الاصطناعي، ثم نشرها مجانًا على **Cloudflare Pages**.

المشروع مبني على [Vite](https://vite.dev) بـ JavaScript عادي (بدون أطر عمل)، ومعه مجلد `skills/` فيه مهارات جاهزة يقرؤها وكيل الذكاء الاصطناعي قبل البناء.

يعمل على **Windows** و **macOS** و **Linux**. الأوامر نفسها على كل الأنظمة إلا إذا ذُكر غير ذلك.

## محتويات المشروع

| الملف / المجلد | الوصف |
| --- | --- |
| `skills/` | مهارات الوكيل (موشن، ألعاب، صفحات تفاعلية، ملصقات). لا تعدّلها. |
| `src/main.js` | كود JavaScript للصفحة. |
| `src/style.css` | تنسيق الصفحة. |
| `index.html` | الصفحة الرئيسية. |
| `PROMPTS.md` | قوالب برومبت جاهزة، عدّل الفكرة فقط. |
| `AGENTS.md` | تعليمات لوكيل الذكاء الاصطناعي. |

## المتطلبات

1. **Node.js** بإصدار LTS من [nodejs.org](https://nodejs.org) (الحد الأدنى مكتوب في `package.json` تحت `engines`):
   - **Windows**: حمّل ملف `.msi` وثبّته بالضغط على Next.
   - **macOS**: حمّل ملف `.pkg` وثبّته. (أو `brew install node` إذا عندك Homebrew.)
   - **Linux**: اتبع تعليمات مدير الحزم في صفحة التحميل نفسها.
2. **حساب Cloudflare مجاني**: سجّل من [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).

### فتح الطرفية (Terminal)

| النظام | الطريقة |
| --- | --- |
| Windows | افتح قائمة ابدأ واكتب **Terminal** أو **PowerShell** |
| macOS | اضغط `Cmd + Space` واكتب **Terminal** |
| Linux | `Ctrl + Alt + T` في أغلب التوزيعات |

> الأسهل للجميع: افتح مجلد المشروع في محرر مثل VS Code، ثم من القائمة **Terminal** ← **New Terminal**. ستفتح الطرفية داخل المجلد مباشرة.

للتأكد من تثبيت Node.js اكتب:

```bash
node -v
npm -v
```

## تحميل القالب

- **بدون Git**: من صفحة المستودع على GitHub اضغط **Code** ← **Download ZIP**، ثم فك الضغط.
- **باستخدام Git**:

  ```bash
  git clone https://github.com/cl0udz1/sdc_web_workshop.git
  cd sdc_web_workshop
  ```

> على macOS: إذا ظهرت نافذة تطلب تثبيت **Command Line Developer Tools** عند أول استخدام لـ `git`، اضغط **Install** وانتظر حتى ينتهي ثم أعد الأمر.

## التشغيل

داخل مجلد المشروع:

```bash
npm install
npm run dev
```

افتح الرابط الذي يظهر (غالبًا `http://localhost:5173`). إذا رأيت كلمة **ويب بلاحدود** تتحرك بألوانها، فكل شيء يعمل.

لإيقاف التشغيل اضغط `Ctrl + C` في الطرفية (على macOS أيضًا `Ctrl` وليس `Cmd`).

## البدء مع الذكاء الاصطناعي

افتح [PROMPTS.md](PROMPTS.md)، انسخ القالب المناسب، عدّل ما بين الأقواس المربعة `[ ]`، وألصقه في محادثة الوكيل.

## أدوات اختيارية (فقط عند الحاجة)

القالب لا يحتاج غير Node.js. هذه الأدوات يثبّتها الوكيل أو أنت فقط إذا احتاجتها فكرتك:

| الأداة | متى تحتاجها | التثبيت |
| --- | --- | --- |
| three | رسومات وألعاب ثلاثية الأبعاد | `npm i three` (يثبّتها الوكيل، نفس الأمر لكل الأنظمة) |
| Playwright | تصدير الموشن لإطارات/فيديو أو الملصق لصورة PNG | `npm i -D playwright` (يثبّتها الوكيل، نفس الأمر لكل الأنظمة) |
| Blender | صنع نماذج 3D وتصديرها GLB | حمّله من [blender.org](https://www.blender.org/download/). على macOS اسحبه إلى مجلد Applications. لا يحتاج Python منفصل |
| ffmpeg | تحويل إطارات الموشن إلى فيديو MP4 | Windows: `winget install Gyan.FFmpeg` · macOS: `brew install ffmpeg` · Linux: `sudo apt install ffmpeg` |

## البناء

```bash
npm run build
```

ينشئ مجلد `dist/` وفيه النسخة الجاهزة للنشر. لمعاينتها محليًا:

```bash
npm run preview
```

## النشر على Cloudflare Pages

**مرة واحدة فقط**: سجّل الدخول إلى Cloudflare (سيفتح المتصفح):

```bash
npx wrangler login
```

**في كل مرة تريد النشر**:

```bash
npm run deploy
```

في أول مرة سيسألك عن اسم المشروع: اختر اسمًا بالإنجليزية بحروف صغيرة وشرطات (مثل `my-first-game`). بعد الانتهاء يظهر لك رابط موقعك بالشكل `https://my-first-game.pages.dev`.

### الخطة البديلة: الرفع اليدوي (Direct Upload)

إذا لم ينجح الأمر السابق:

1. شغّل `npm run build` لإنشاء مجلد `dist/`.
2. ادخل إلى [لوحة Cloudflare](https://dash.cloudflare.com) ثم **Workers & Pages** ثم **Create** ثم اختر **Pages** ثم **Upload assets** (Direct Upload).
3. اكتب اسمًا للمشروع، ثم **اسحب مجلد `dist` كاملًا** وأفلته في الصفحة.
4. اضغط **Deploy** وانتظر حتى يظهر الرابط.

> أسماء الأزرار في لوحة Cloudflare قد تتغير قليلًا مع الوقت، لكن الفكرة واحدة: إنشاء مشروع Pages ورفع مجلد `dist`.
>
> على macOS: مجلد `dist` يظهر في Finder داخل مجلد المشروع. إذا لم تجده، تأكد أنك شغّلت `npm run build`.

## أشهر المشاكل وحلولها

### أمر غير معروف
الرسالة تختلف حسب النظام:
- Windows: `'npm' is not recognized`
- macOS: `zsh: command not found: npm`
- Linux: `npm: command not found`

الحل:
- Node.js غير مثبت أو لم تُعِد فتح الطرفية بعد تثبيته. ثبّته من [nodejs.org](https://nodejs.org)، ثم **أغلق الطرفية وافتحها من جديد**.
- تأكد أنك داخل مجلد المشروع (المجلد الذي فيه `package.json`) قبل تشغيل أي أمر.
- **Windows فقط**: إذا ظهرت في PowerShell رسالة عن `running scripts is disabled`، استخدم `npm.cmd` بدل `npm`، أو افتح **Command Prompt** بدل PowerShell.

### فشل `npm install`
- أسطر `npm warn` (تحذيرات) طبيعية ولا تعني أن التثبيت فشل. الفشل الحقيقي يظهر بكلمة `npm error`.
- تأكد من اتصال الإنترنت.
- تأكد أن إصدار Node.js حديث (`node -v`) ولا يقل عن المكتوب في `engines`.
- **macOS و Linux**: إذا ظهر خطأ `EACCES` (صلاحيات)، **لا تستخدم `sudo`**. تأكد أن المشروع داخل مجلدك الشخصي (مثل Desktop أو Documents) وليس في مجلد نظام.
- احذف مجلد `node_modules` ثم أعد المحاولة:

  ```bash
  npm install
  ```
- لا تحذف `package-lock.json`، فهو يضمن تثبيت نفس الإصدارات للجميع.

### فشل تسجيل الدخول (`wrangler login`)
- تأكد أنك سجّلت حساب Cloudflare وفعّلت بريدك الإلكتروني.
- إذا لم يفتح المتصفح تلقائيًا، انسخ الرابط الظاهر في الطرفية وافتحه يدويًا، ثم اضغط **Allow**.
- إذا بقي عالقًا، أوقفه بـ `Ctrl + C` ثم شغّل:

  ```bash
  npx wrangler logout
  npx wrangler login
  ```
- للتأكد من نجاح تسجيل الدخول:

  ```bash
  npx wrangler whoami
  ```
- إذا استمرت المشكلة، استخدم **الخطة البديلة** (الرفع اليدوي) بالأعلى.
