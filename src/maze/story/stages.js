// قصة 03:17 · The Last Memory
// كل مرحلة هنا عبارة عن بيانات: النصوص، الغرض الأساسي، الأحداث، شكل المتاهة، وحالة الفندق.
// عدّل النصوص من هذا الملف مباشرة؛ الكود يقرأها ويوزعها داخل المتاهة.

export const GAME_TITLE = '03:17';
export const GAME_SUBTITLE = 'The Last Memory';
export const GAME_TAGLINE = 'Some memories never leave.';

// من يتكلم (يظهر فوق الجملة). "me" بدون اسم لأنها أفكار البطل.
export const SPEAKERS = {
  me: '',
  layan: 'ليان',
  girl: 'صوت طفلة',
  child: 'طفلة',
  mom: 'صوت أمي',
  young: 'أنا (قبل سنين)',
  far: 'صوت بعيد',
  record: 'تسجيل',
  sign: 'لوحة',
  note: 'ورقة',
  drawing: 'رسمة',
};

// الرسالة التي تبدأ بها القصة
export const PROLOGUE = {
  app: 'رسالة جديدة',
  from: 'رقم غير معروف',
  time: '03:17',
  text: 'أنا لسه هنا.',
  after: 'صورة لفندق قديم، وجملة وحدة. ما أعرف المرسل... بس أعرف أني لازم أروح.',
};

export const ENDING = {
  lines: [
    'بعض الأبواب لا نحتاج أن نجد طريقنا للخروج منها...',
    'نحتاج فقط أن نتذكر لماذا دخلناها.',
  ],
  time: '03:17',
  end: 'THE END',
};

export const STAGES = [
  // ───────────────────────── المرحلة الأولى ─────────────────────────
  {
    id: 'arrival',
    ordinal: 'المرحلة الأولى',
    name: 'الوصول',
    place: 'الطابق الأول · الممر الشرقي',
    intro:
      'بعد رحلة طويلة، قررت أن أتوقف في هذا الفندق وأرتاح قليلا. المكان هادئ، والإضاءة دافئة، لكن هناك شيء غريب... أشعر أنني أعرف هذا المكان، رغم أنني متأكد أنني لم أزره من قبل.',
    objective: { find: 'دوّر على مفتاح غرفة', exit: 'دوّر على باب المخرج' },
    maze: { cells: 5, straight: 0.55, braid: 0 },
    time: { factor: 3.2, bonus: 40 },
    rooms: { from: 101, exitDoor: 108 },
    env: {
      lamp: 0xffb066, lampIntensity: 7, flicker: 'soft',
      hemi: 0x6a3328, hemiIntensity: 0.55,
      fog: 0x0c0505, fogDensity: 0.07,
      ceiling: 2.2, wallTint: 0xffffff, exposure: 1.15,
      flowers: 'fresh', soot: false, ambience: 'calm', clock: 'ticking',
    },
    signs: { style: 'brass', ratio: 1 },
    pictures: [
      { art: 's1-hotel', lines: [{ who: 'me', text: 'لوحة للفندق من برّا. كل الشبابيك طافية... إلا شباك واحد في الطابق الثاني.' }] },
      { art: 's1-sea', lines: [{ who: 'me', text: 'بحر وقت الغروب. لوحة عادية، بس أحس أني وقفت قدام هذا البحر قبل.' }] },
      { art: 's1-field', lines: [{ who: 'me', text: 'شجرة في نص حقل، وتحتها شخصين صغار. بالكاد يبانون.' }] },
    ],
    props: [
      { kind: 'clock', near: 'start', lines: [{ who: 'me', text: 'الساعة على 03:17. بس جوالي يقول تسعة ونص بالليل... وعقرب الثواني يمشي، والوقت ما يتغير.' }] },
      { kind: 'notice', lines: [{ who: 'sign', text: 'تنبيه للنزلاء: الرجاء عدم ترك الأطفال في الممرات بدون مرافق.' }] },
      { kind: 'suitcase', lines: [{ who: 'me', text: 'شنطة أطفال صغيرة. عليها ملصق باسم ممسوح... ما بقي منه إلا حرف «ل».' }] },
      { kind: 'ribbonTable', lines: [{ who: 'me', text: 'شريطة حمرا مربوطة على مقبض الطاولة. كأن أحد ربطها علامة عشان يرجع لها.' }] },
      { kind: 'vase', count: 2, lines: [{ who: 'me', text: 'ورد أبيض. شكله مقطوف اليوم.' }] },
    ],
    layan: { progress: 0.4, mode: 'run', line: { who: 'girl', text: 'يلا! تأخرت عليّ!' } },
    events: [
      { progress: 0.68, sound: 'murmur', lines: [{ who: 'me', text: 'فيه أصوات... ناس يضحكون ويتكلمون. بس ما شفت أحد من دخلت.' }] },
    ],
    item: {
      id: 'key214', site: 'table', art: 'item-key',
      name: 'مفتاح الغرفة 214',
      desc: 'مفتاح الغرفة 214... غريب، أشعر أن هذا الرقم مألوف لي.',
    },
    outro: 'كل ما أحاول أطلع من هنا، أرجع لنفس المكان. والأغرب أني أشعر أني أعرف هذا الفندق، مع أني متأكد أني ما زرته من قبل.',
    next: { place: 'الطابق الثاني', teaser: 'الصور على الجدران بدأت تتغير... وفيها وجوه أعرفها.' },
  },

  // ───────────────────────── المرحلة الثانية ─────────────────────────
  {
    id: 'photo',
    ordinal: 'المرحلة الثانية',
    name: 'الصورة',
    place: 'الطابق الثاني · جناح الغرف',
    intro:
      'لم أعد متأكدا مما أراه. بعض التفاصيل هنا تبدو وكأنها تنتمي إلى حياتي، لكنني لا أتذكر متى رأيتها من قبل.',
    objective: { find: 'دوّر على الصورة القديمة', exit: 'دوّر على باب المخرج' },
    maze: { cells: 6, straight: 0.75, braid: 0 },
    time: { factor: 2.9, bonus: 35 },
    rooms: { from: 201, exitDoor: 206 },
    env: {
      lamp: 0xffa45c, lampIntensity: 6, flicker: 'soft',
      hemi: 0x553a34, hemiIntensity: 0.45,
      fog: 0x0b0606, fogDensity: 0.075,
      ceiling: 1.6, wallTint: 0xe6d8d0, exposure: 1.12,
      flowers: 'wilting', soot: false, ambience: 'uneasy', clock: 'ticking',
    },
    signs: { style: 'brass', ratio: 0.75 },
    pictures: [
      { art: 's2-parents', lines: [{ who: 'me', text: 'رجل وامرأة قدام مدخل نفس الفندق. شكلهم صغار... أبوي وأمي؟' }] },
      { art: 's2-baby', lines: [{ who: 'me', text: 'ولد صغير شايل بيبي ملفوف ببطانية. الولد... هذا أنا.' }] },
      { art: 's2-beach', lines: [{ who: 'me', text: 'طفلين يركضون على البحر. نفس البحر اللي في لوحة الطابق الأول.' }] },
    ],
    props: [
      { kind: 'clock', near: 'start', lines: [{ who: 'me', text: 'لسه 03:17.' }] },
      { kind: 'drawerNote', lines: [{ who: 'note', text: 'ورقة من دفتر الفندق، بخط أمي: «حجزنا 212 لنا، و214 للعيال. لا تسهرون.»' }] },
      { kind: 'roomDoor', number: 212, lines: [{ who: 'me', text: 'الغرفة 212. أعرف هذا الباب... أبوي كان يدق عليه مرتين قبل ما يدخل.' }] },
      { kind: 'vase', count: 2, lines: [{ who: 'me', text: 'الورد الأبيض ذبلان. قبل شوي كان كأنه مقطوف اليوم.' }] },
    ],
    layan: { progress: 0.3, mode: 'stand', line: { who: 'child', text: 'تذكرني؟' } },
    events: [
      {
        progress: 0.6, sound: 'distantVoices',
        lines: [
          { who: 'mom', text: 'ليان! تعالي، لا تبتعدين.' },
          { who: 'girl', text: 'لحظة ماما! أبغى آخذ أغراضي.' },
        ],
      },
    ],
    item: {
      id: 'familyPhoto', site: 'wallPhoto', art: 'item-family',
      name: 'الصورة العائلية',
      desc: 'هذه عائلتي... بدأت أتذكر ملامحهم. لكن البنت الصغيرة ما زلت عاجزا عن تذكر اسمها.',
      before: [{ who: 'me', text: 'لحظة... هذا أنا؟ وهذه عائلتي؟ ومن البنت اللي واقفة بجانبي؟' }],
    },
    outro: 'ليان... الاسم هذا ما عاد غريبا عليّ.',
    next: { place: 'جناح العائلات', teaser: 'ضحكة طفلة جاية من آخر الممر... وأحد يعدّ.' },
  },

  // ───────────────────────── المرحلة الثالثة ─────────────────────────
  {
    id: 'hide',
    ordinal: 'المرحلة الثالثة',
    name: 'الغميضة',
    place: 'الطابق الثاني · جناح العائلات',
    intro:
      'كلما تقدمت أكثر، أصبحت الذكريات أوضح. أتذكر ضحكات وأصواتا وأشياء صغيرة... أشياء كنت أظن أنني نسيتها تماما.',
    objective: { find: 'الغميضة: دوّر على اللي خبّته ليان · اتبع الصوت', exit: 'دوّر على باب المخرج' },
    maze: { cells: 7, straight: 0.15, braid: 0.08 },
    time: { factor: 2.7, bonus: 35 },
    rooms: { from: 207, exitDoor: 210 },
    env: {
      lamp: 0xffb070, lampIntensity: 6.5, flicker: 'soft',
      hemi: 0x5e3a2c, hemiIntensity: 0.5,
      fog: 0x0c0605, fogDensity: 0.072,
      ceiling: 1.8, wallTint: 0xf0e4da, exposure: 1.15,
      flowers: 'fresh', soot: false, ambience: 'nostalgic', clock: 'ticking',
    },
    signs: { style: 'star', ratio: 0.6 },
    pictures: [
      { art: 's3-star-note', near: 'start', lines: [{ who: 'drawing', text: 'بخط طفل: «إذا ضعت، اتبع النجمة.»' }] },
      { art: 's3-family', lines: [{ who: 'me', text: 'أربعة ماسكين يدين بعض، وتحتهم: «بابا، ماما، أخوي، أنا». هذي رسمة ليان.' }] },
      { art: 's3-hideseek', lines: [{ who: 'me', text: 'ولد مغطي عيونه، وبنت مستخبية ورا الكنب. نفس اللعبة اللي كنا نلعبها هنا.' }] },
      { art: 's3-corridor', lines: [{ who: 'me', text: 'صورة قديمة لهذا الممر. نفس السجادة ونفس الإضاءة... وفي آخره ظل صغير.' }] },
      { art: 's3-smoke', lines: [{ who: 'me', text: 'بنت واقفة قدام باب عليه نجمة، ووراه دخان رمادي. ليش ترسم شي زي كذا؟' }] },
    ],
    props: [
      { kind: 'clock', near: 'start', lines: [{ who: 'me', text: '03:17. حتى هنا.' }] },
      { kind: 'brokenVase', lines: [{ who: 'me', text: 'مزهرية مكسورة، والورد على الأرض. كأن أحد ركض وطاح فيها.' }] },
      { kind: 'starDoors', count: 3 },
      { kind: 'vase', count: 1, lines: [{ who: 'me', text: 'ورد أبيض جديد. أحد يهتم بهالمكان... أو كان يهتم.' }] },
    ],
    layan: null,
    events: [
      { at: 1.5, sound: 'giggle', lines: [{ who: 'layan', text: 'واحد... اثنين... ثلاثة... لا تغش!' }] },
      { at: 6.5, lines: [{ who: 'layan', text: 'عشرة... تسعة... ثمانية... سبعة... ستة...' }] },
      { at: 11, lines: [{ who: 'layan', text: 'خمسة... أربعة... ثلاثة... اثنين... واحد!' }], startItemSound: true },
    ],
    item: {
      id: 'bunny', site: 'hidden', art: 'item-bunny',
      name: 'دمية الأرنب',
      desc: 'دمية الأرنب... الآن تذكرت. كانت ليان تأخذها معها في كل مكان، حتى أنها كانت تنام وهي تحتضنها.',
      before: [
        { who: 'layan', text: 'لقيته! الحين دورك تدور عليّ.' },
        { who: 'young', text: 'لا تروحين بعيد، اتفقنا؟' },
        { who: 'layan', text: 'وعد!' },
      ],
    },
    outro: 'كنت ألعب معها هنا... لكن لماذا أشعر أن آخر مرة لعبنا فيها لم تنته بشكل جيد؟',
    next: { place: 'الممر المحروق', teaser: 'ريحة دخان... وصوت إنذار ما سمعته من سنين.' },
  },

  // ───────────────────────── المرحلة الرابعة ─────────────────────────
  {
    id: 'fire',
    ordinal: 'المرحلة الرابعة',
    name: '03:17',
    place: 'الطابق الثاني · الممر المحروق',
    intro:
      'بدأت أتذكر تلك الليلة... الأصوات، الدخان، والخوف. لم يكن هذا مجرد فندق قديم، بل المكان الذي حدث فيه كل شيء.',
    objective: { find: 'اتبع آثار الأيادي الصغيرة', exit: 'دوّر على باب المخرج' },
    maze: { cells: 8, straight: 0.35, braid: 0 },
    time: { factor: 2.5, bonus: 35 },
    rooms: { from: 209, exitDoor: 212 },
    env: {
      lamp: 0xff4d1f, lampIntensity: 8, flicker: 'strong',
      hemi: 0x5a1608, hemiIntensity: 0.5,
      fog: 0x140806, fogDensity: 0.085,
      ceiling: 0.2, wallTint: 0x8c7a72, exposure: 1.2,
      flowers: 'broken', soot: true, ambience: 'fire', clock: 'stopped',
    },
    signs: { style: 'emergency', ratio: 0.5 },
    pictures: [
      { art: 's4-burnt-parents', lines: [{ who: 'me', text: 'صورة أبوي وأمي... نصها محروق.' }] },
      { art: 's4-burnt-hideseek', lines: [{ who: 'me', text: 'رسمة الغميضة. النار أكلت الولد... وما بقي إلا البنت.' }] },
      { art: 's4-evac', lines: [{ who: 'sign', text: 'خطة الإخلاء: الطريق للدرج بالأحمر. وغرفة 214 في آخر الممر... أبعد غرفة عن الدرج.' }] },
    ],
    props: [
      { kind: 'clock', near: 'start', lines: [{ who: 'me', text: 'الساعة واقفة على 03:17. المرة هذي فعلًا واقفة.' }] },
      { kind: 'phone', lines: [{ who: 'record', text: '«...إلى جميع النزلاء، الرجاء التوجه للدرج فورًا. لا تستخدمون المصعد. أكرر...»' }] },
      { kind: 'brokenVase', count: 2, lines: [{ who: 'me', text: 'كل شي هنا مكسور.' }] },
      { kind: 'ajarDoors', count: 3 },
    ],
    layan: { progress: 0.45, mode: 'scared', line: { who: 'layan', text: 'لا تروح... انتظرني!' } },
    events: [
      { at: 2, sound: 'alarmUp', lines: [{ who: 'me', text: 'هذا الصوت... إنذار حريق.' }] },
      { progress: 0.25, sound: 'distantVoices', lines: [{ who: 'far', text: 'الكل ينزل من الدرج! بسرعة!' }] },
    ],
    item: {
      id: 'bracelet', site: 'starDoor', art: 'item-bracelet',
      name: 'السوار الأحمر',
      desc: 'هذا سوار ليان... أتذكر الآن. كنت أمسك يدها في تلك الليلة، لكنني تركتها للحظة لأبحث عن المساعدة. وعدتها أني برجع.',
      before: [
        { who: 'young', text: 'ليان، خليك هنا. بروح أجيب المساعدة وبرجع لك.' },
        { who: 'layan', text: 'بس لا تتأخر... وعد؟' },
        { who: 'young', text: 'وعد.' },
      ],
    },
    outro: 'كانت الساعة 03:17... هذا هو الوقت الذي افترقنا فيه. لكن ماذا حدث بعد ذلك؟',
    next: { place: 'الغرفة 214', teaser: 'باقي شي واحد ما تذكرته.' },
  },

  // ───────────────────────── المرحلة الخامسة ─────────────────────────
  {
    id: 'promise',
    ordinal: 'المرحلة الخامسة',
    name: 'الوعد الأخير',
    place: 'الطابق الثاني · الغرفة 214',
    intro:
      'لم أعد أبحث عن مخرج فقط. أريد أن أتذكر كل شيء. أريد أن أعرف ماذا حدث في تلك الليلة، ولماذا ما زلت أسمع صوتها حتى الآن.',
    objective: { find: 'روح للغرفة 214', exit: 'دوّر على باب المخرج' },
    maze: { cells: 9, straight: 0.4, braid: 0.12 },
    time: { factor: 2.4, bonus: 40 },
    rooms: { from: 211, exitDoor: 216 },
    env: {
      lamp: 0xffc27a, lampIntensity: 7.5, flicker: 'none',
      hemi: 0x7a4a36, hemiIntensity: 0.65,
      fog: 0x100806, fogDensity: 0.055,
      ceiling: 2.4, wallTint: 0xffffff, exposure: 1.18,
      flowers: 'fresh', soot: false, ambience: 'lullaby', clock: 'ticking',
    },
    signs: { style: 'star', ratio: 0.4 },
    pictures: [
      { art: 's5-family', lines: [{ who: 'me', text: 'كلنا مع بعض. هذي آخر صورة أخذناها قبل تلك الليلة.' }] },
      { art: 's5-layan', lines: [{ who: 'me', text: 'ليان ماسكة أرنبها وتضحك. كانت تضحك على أي شي.' }] },
      { art: 's5-sea-kids', lines: [{ who: 'me', text: 'لوحة البحر... بس المرة هذي فيها طفلين ماسكين يدين بعض.' }] },
    ],
    props: [
      { kind: 'clock', near: 'start', lines: [{ who: 'me', text: 'الساعة رجعت تمشي.' }] },
      { kind: 'vase', count: 2, lines: [{ who: 'me', text: 'الورد الأبيض رجع زي ما كان.' }] },
    ],
    layan: { progress: 0.3, mode: 'point', line: { who: 'layan', text: 'تأخرت كثير... كنت أحسبك نسيتني.' } },
    events: [
      { at: 3, sound: 'lullaby' },
      { progress: 0.8, lines: [{ who: 'me', text: 'هذي التهويدة... أمي كانت تغنيها لها كل ليلة.' }] },
    ],
    item: {
      id: 'drawing', site: 'room214', art: 'item-drawing',
      name: 'رسمة لطفلين تحت النجوم',
      desc: 'هذه أنا وليان... كنا نرسم نفس الرسمة دائما. الآن تذكرت كل شيء.',
      letter: {
        title: 'رسالة مخبّاة في الغرفة 214',
        lines: ['إلى أخوي...', 'إذا ضعت مني، لا تخاف. أنا أعرف الطريق.', 'بس لا تنسى وعدك، قلت لي إننا بنرجع البيت سوا.'],
      },
    },
    finale: { who: 'layan', text: 'الحين نقدر نروح.' },
    outro: null,
    next: null,
  },
];

// لافتة وحيدة يقرأها اللاعب عند الباب المقفل
export const LOCKED_DOOR_LINE = { who: 'me', text: 'الباب ما ينفتح... كأن فيه شي لازم ألقاه قبل.' };
