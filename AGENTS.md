# AGENTS.md

تعليمات لأي وكيل ذكاء اصطناعي يعمل على هذا المشروع. المستخدمون مبتدئون، فاجعل كل شيء بسيطًا وواضحًا.

## قبل البناء
- اقرأ مجلد `skills/` واختر المهارة أو المهارات المناسبة للطلب:
  - `skills/create-web-motion/`: موشن جرافيك وحركة.
  - `skills/build-web-games/`: ألعاب فيها هدف وقواعد ونقاط.
  - `skills/build-interactive-web/`: صفحات ومواقع تفاعلية.
  - `skills/design-posters/`: تصاميم ثابتة وملصقات.
- اقرأ ملف `SKILL.md` الخاص بكل مهارة اخترتها قبل كتابة أي كود.

## أثناء البناء
- ابقَ على Vite بنمط vanilla (JavaScript بدون إطار عمل). لا تضف React أو TypeScript أو مكتبات ثقيلة. أضف مكتبة فقط إذا كانت ضرورية، واشرح السبب.
- ابدأ بنسخة أولى صغيرة، واعرض الخطة على المستخدم وراجعها معه قبل التوسع.
- اجعل الصفحة متجاوبة مع الجوال (لمس وشاشات صغيرة).
- ادعم تقليل الحركة تلقائيًا عبر `prefers-reduced-motion`.
- حافظ على اتجاه الصفحة العربي `dir="rtl"` إلا إذا طلب المستخدم غير ذلك.

## نظام التشغيل
المشاركون يستخدمون Windows و macOS و Linux.
- اعرف نظام المستخدم أولًا، واكتب الأوامر المناسبة لطرفيته: PowerShell على Windows، و zsh أو bash على macOS و Linux.
- لا تضع في `package.json` أوامر تعمل على نظام واحد فقط (مثل `rm -rf` أو `del` أو `cp`). استخدم سكربت Node بدلها.
- في الكود استخدم مسارات نسبية بشرطة `/`، وانتبه لحالة الأحرف في أسماء الملفات. `Logo.png` و `logo.png` ملفان مختلفان على Linux وعلى Cloudflare Pages.

## الأدوات الإضافية
القالب خفيف عمدًا. ثبّت الأداة فقط عندما تحتاجها المهمة فعلًا، واشرح السبب للمستخدم في جملة واحدة.
- **حزم npm** (مثل `three` للـ 3D، و`playwright` لتصدير الموشن أو الملصقات): ثبّتها بنفسك بـ `npm i three` أو `npm i -D playwright`. هذه تعمل بنفس الطريقة على كل الأنظمة.
- **متصفح Playwright**: استخدم متصفحًا موجودًا بدل التحميل إن أمكن. على Windows أضف `--channel msedge`، وعلى macOS و Linux أضف `--channel chrome` إذا كان Chrome مثبتًا. وإذا لم يوجد متصفح مناسب فنفّذ `npx playwright install chromium`.
- **برامج النظام** (مثل Blender و ffmpeg): تأكد أولًا هل هي مثبتة وما إصدارها، فهي غالبًا ليست في PATH. لا تثبّتها بصمت ولا تشغّل `sudo` أو أوامر المدير بدون إذن المستخدم. إذا لم تكن موجودة، أعطِ المستخدم أمر التثبيت المناسب لنظامه، أو أكمل ببديل (أشكال Three.js بدل نموذج Blender، أو إطارات صور بدل MP4) ووضّح ما بقي.

| | Windows | macOS | Linux |
| --- | --- | --- | --- |
| مكان Blender | `C:\Program Files\Blender Foundation\Blender <الإصدار>\blender.exe` | `/Applications/Blender.app/Contents/MacOS/Blender` | `blender` في PATH، أو `/snap/bin/blender`، أو `flatpak run org.blender.Blender` |
| تثبيت ffmpeg | `winget install Gyan.FFmpeg` | `brew install ffmpeg` (يحتاج Homebrew) | `sudo apt install ffmpeg` |

- **Blender** يشغّل سكربتات Python بنسخته المدمجة (`blender --background --python script.py`). لا تثبّت Python أو uv أو pip لأجله.

## قبل التسليم
- شغّل `npm run build` وتأكد أنه ينجح بدون أخطاء قبل أن تقول إن العمل انتهى.
- لا تشغّل `npm run deploy` أو `wrangler login` أو `git push` إلا إذا طلب المستخدم ذلك صراحة.

## ممنوع
- لا تحذف مجلد `skills/` ولا تعدّل أي ملف داخله.
