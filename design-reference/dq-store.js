/* Oqoudi prototype — shared mock data + actions (localStorage-backed, shared across all pages). */
(function () {
  const KEY = 'dq_proto_v1';
  const D = '٠١٢٣٤٥٦٧٨٩';
  const toAr = s => String(s).replace(/[0-9]/g, d => D[d]);
  const num = n => new Intl.NumberFormat('ar-EG').format(n);
  const egp = n => num(n) + ' ج.م';
  const TZ = 'Africa/Cairo';
  const fmt = (iso, o) => new Intl.DateTimeFormat('ar-EG', Object.assign({ timeZone: TZ }, o)).format(new Date(iso));
  const fmtDate = iso => fmt(iso, { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = iso => fmt(iso, { day: 'numeric', month: 'short' });
  const fmtDateTime = iso => fmt(iso, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const ymdDate = ymd => new Date(ymd + 'T12:00:00+03:00');
  const fmtDay = ymd => fmt(ymdDate(ymd), { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtTime = hm => { const [h, m] = hm.split(':').map(Number); const hh = ((h + 11) % 12) + 1; return toAr(hh + ':' + String(m).padStart(2, '0')) + (h >= 12 ? ' م' : ' ص'); };
  const addMin = (hm, n) => { let [h, m] = hm.split(':').map(Number); m += n; h += Math.floor(m / 60); m %= 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
  const nowIso = () => new Date().toISOString();
  const ago = (d, h) => new Date(Date.parse('2026-10-12T10:00:00+03:00') - (d * 24 + (h || 0)) * 3600e3).toISOString();

  const STATUS = {
    new:            { label: 'طلب جديد', client: 'تم استلام طلبك', tone: 'neutral', hint: 'استلمنا طلبك وسيتم تحويله للدفع.' },
    awaiting_payment:{ label: 'بانتظار الدفع', client: 'بانتظار الدفع', tone: 'caution', hint: 'أكمل الدفع حتى يبدأ المحامي مراجعة طلبك.', action: true },
    under_review:   { label: 'قيد المراجعة', client: 'قيد المراجعة', tone: 'accent', hint: 'يراجع المحامي بياناتك ومرفقاتك الآن. لا يلزمك أي إجراء.' },
    in_progress:    { label: 'قيد التنفيذ', client: 'جارٍ العمل على طلبك', tone: 'accent', hint: 'المحامي يعمل على طلبك. سنخطرك فور التسليم.' },
    awaiting_info:  { label: 'بانتظار معلومات العميل', client: 'مطلوب معلومات منك', tone: 'caution', hint: 'طلب المحامي معلومات إضافية. راجع الرسائل وأرسل المطلوب.', action: true },
    delivered:      { label: 'تم التسليم', client: 'تم التسليم — بانتظار قرارك', tone: 'positive', hint: 'راجع المستند المسلَّم، ثم اقبله أو اطلب تعديلًا.', action: true },
    revision:       { label: 'مطلوب تعديل', client: 'جارٍ تنفيذ التعديل', tone: 'caution', hint: 'استلم المحامي طلب التعديل ويعمل على نسخة جديدة.' },
    completed:      { label: 'مكتمل', client: 'مكتمل', tone: 'positive', hint: 'اكتملت الخدمة. يمكنك تحميل ملفاتك في أي وقت.' },
    cancelled:      { label: 'ملغي', client: 'ملغي', tone: 'critical', hint: 'تم إلغاء هذا الطلب.' }
  };
  const PAY = {
    unpaid:   { label: 'غير مدفوع', tone: 'neutral' },
    failed:   { label: 'فشل الدفع', tone: 'critical' },
    paid:     { label: 'مدفوع', tone: 'positive' },
    refunded: { label: 'مسترد', tone: 'neutral' },
    partial_refund: { label: 'مسترد جزئيًا', tone: 'caution' }
  };
  const FLOW = [['awaiting_payment', 'الدفع'], ['under_review', 'المراجعة'], ['in_progress', 'التنفيذ'], ['delivered', 'التسليم'], ['completed', 'الاكتمال']];
  const FLOW_IDX = { new: 0, awaiting_payment: 0, under_review: 1, awaiting_info: 1, in_progress: 2, revision: 2, delivered: 3, completed: 4, cancelled: -1 };

  const CATS = [
    { id: 'individuals', label: 'خدمات الأفراد', desc: 'عقود الإيجار والبيع، الإنذارات، ومسائل الأسرة والعمل.' },
    { id: 'companies', label: 'خدمات الشركات', desc: 'تأسيس الشركات، عقود العمل والتوريد، ومراجعة الاتفاقيات.' },
    { id: 'consultations', label: 'الاستشارات القانونية', desc: 'استشارة كتابية مفصلة أو اجتماع مرئي مدته ٣٠ دقيقة.' }
  ];

  const SECTION_LABELS = { about: 'وصف الخدمة', who: 'لمن هذه الخدمة', included: 'ما تشمله الخدمة', deliverables: 'ما ستستلمه', docs: 'المستندات المطلوبة', steps: 'خطوات التنفيذ', duration: 'مدة الإنجاز', pricing: 'التسعير', faq: 'أسئلة شائعة', reviews: 'تقييمات العملاء' };
  const S = (keys, off) => keys.map(k => ({ key: k, on: !(off || []).includes(k) }));

  const services = [
    { id: 'contract-drafting', cat: 'companies', cats: ['companies', 'individuals'], title: 'صياغة عقد', short: 'صياغة عقد مخصص لاتفاقك، يغطي الالتزامات والمدد وآليات فض النزاع.', price: 2500, priceType: 'fixed', days: '٣–٥ أيام عمل', status: 'published', formVersion: 3, featured: true,
      sections: S(['about', 'who', 'included', 'deliverables', 'docs', 'steps', 'duration', 'pricing', 'faq', 'reviews']),
      content: {
        about: 'نصيغ لك عقدًا متكاملًا وفق القانون المصري يعكس اتفاقك بدقة، بدءًا من تعريف الأطراف وحتى بنود الإنهاء وفض النزاعات. يمكنك متابعة كل مرحلة واستلام المسودة النهائية داخل حسابك.',
        who: ['أصحاب الأعمال الذين يبرمون عقود توريد أو خدمات', 'الشركاء المؤسسون عند تنظيم علاقة شراكة', 'الأفراد عند بيع أو شراء أصل ذي قيمة'],
        included: ['جلسة فهم متطلبات عبر الرسائل', 'صياغة كاملة للعقد باللغة العربية', 'مراجعة واحدة مجانية بعد التسليم', 'ملاحظات توضيحية على البنود الجوهرية'],
        deliverables: ['ملف العقد بصيغة Word قابل للتعديل', 'نسخة PDF جاهزة للتوقيع', 'مذكرة مختصرة بأهم البنود'],
        docs: ['بيانات الأطراف (الاسم، الرقم القومي أو السجل التجاري)', 'أي مراسلات أو عروض أسعار سابقة', 'نسخة من عقد سابق إن وجد'],
        steps: ['تعبئة نموذج الطلب ورفع المستندات', 'الدفع الآمن', 'مراجعة المحامي وطلب أي توضيحات', 'استلام المسودة داخل حسابك', 'قبول العقد أو طلب تعديل'],
        faq: [['هل يمكنني طلب تعديل بعد التسليم؟', 'نعم، تشمل الخدمة مراجعة واحدة مجانية خلال ١٤ يومًا من التسليم.'], ['هل يُصاغ العقد بالإنجليزية؟', 'يمكن إضافة نسخة إنجليزية كخدمة إضافية عند الطلب.'], ['هل يشمل السعر التوثيق في الشهر العقاري؟', 'لا، الخدمة تشمل الصياغة فقط. يمكن طلب المساعدة في التوثيق كخدمة منفصلة.']]
      },
      addons: [{ id: 'en', label: 'نسخة باللغة الإنجليزية', price: 1200 }, { id: 'rush', label: 'تسليم عاجل خلال ٤٨ ساعة', price: 800 }] },
    { id: 'contract-review', cat: 'companies', cats: ['companies', 'individuals'], title: 'مراجعة عقد', short: 'مراجعة عقد قائم وتحديد المخاطر والبنود غير المتوازنة مع مقترحات تعديل.', price: 1500, priceType: 'fixed', days: '٢–٣ أيام عمل', status: 'published', formVersion: 2, featured: true,
      sections: S(['about', 'included', 'deliverables', 'steps', 'duration', 'pricing', 'faq', 'reviews'], ['steps']),
      content: { about: 'نقرأ العقد المرسل إليك قبل التوقيع ونحدد البنود التي قد تضر بمصلحتك، مع صياغة بديلة مقترحة لكل بند.', included: ['قراءة كاملة للعقد حتى ٢٠ صفحة', 'تعليقات على كل بند جوهري', 'صياغة بديلة مقترحة'], deliverables: ['نسخة من العقد بتعليقات المحامي', 'تقرير مخاطر مختصر'], steps: [], faq: [['ماذا لو كان العقد أطول من ٢٠ صفحة؟', 'يتم تحديد سعر إضافي بعد الاطلاع على العقد وقبل البدء.']] },
      addons: [{ id: 'rush', label: 'تسليم عاجل خلال ٢٤ ساعة', price: 600 }] },
    { id: 'employment-contract', cat: 'companies', cats: ['companies'], title: 'عقد عمل', short: 'عقد عمل متوافق مع قانون العمل المصري لموظف أو أكثر.', price: 1800, priceType: 'fixed', days: '٣ أيام عمل', status: 'published', formVersion: 1, featured: true,
      sections: S(['about', 'who', 'included', 'deliverables', 'pricing', 'reviews']),
      content: { about: 'نعد عقد عمل يحدد الأجر والمهام وساعات العمل والإجازات وشروط الإنهاء، بما يتوافق مع قانون العمل.', who: ['الشركات الناشئة عند تعيين أول موظفين', 'الشركات التي تحدّث نماذج عقودها'], included: ['نموذج عقد قابل لإعادة الاستخدام', 'بند السرية وعدم الإفصاح'], deliverables: ['عقد عمل بصيغة Word وPDF'] },
      addons: [] },
    { id: 'company-formation', cat: 'companies', cats: ['companies'], title: 'المساعدة في تأسيس شركة', short: 'إرشاد ومساعدة في اختيار الكيان القانوني وإعداد مستندات التأسيس.', price: 8000, priceType: 'quote', days: 'يحدد بعد المراجعة', status: 'published', formVersion: 1,
      sections: S(['about', 'who', 'included', 'docs', 'steps', 'pricing', 'faq']),
      content: { about: 'نساعدك في المفاضلة بين أشكال الشركات المتاحة وإعداد عقد التأسيس والمستندات المطلوبة للتقديم.', who: ['رواد الأعمال قبل بدء النشاط', 'الشركاء الراغبون في تحويل الكيان القانوني'], included: ['استشارة حول الشكل القانوني الأنسب', 'إعداد عقد التأسيس', 'قائمة بالمستندات والخطوات'], docs: ['صور بطاقات الشركاء', 'الاسم التجاري المقترح', 'بيان النشاط ورأس المال'], steps: ['تعبئة النموذج', 'استلام عرض سعر نهائي', 'الدفع وبدء التنفيذ'], faq: [['لماذا السعر يبدأ من ٨٬٠٠٠ ج.م؟', 'يختلف الجهد حسب نوع الشركة وعدد الشركاء، ويصلك عرض سعر نهائي قبل الدفع.']] },
      addons: [] },
    { id: 'lease-agreement', cat: 'individuals', cats: ['individuals'], title: 'عقد إيجار', short: 'عقد إيجار سكني أو تجاري يحفظ حقوق المؤجر والمستأجر.', price: 1200, priceType: 'fixed', days: '٢ أيام عمل', status: 'published', formVersion: 2, featured: true,
      sections: S(['about', 'included', 'docs', 'duration', 'pricing', 'reviews']),
      content: { about: 'عقد إيجار واضح يحدد القيمة الإيجارية والمدة والتأمين والصيانة وحالات الإخلاء.', included: ['صياغة عقد إيجار كامل', 'ملحق باستلام العين وحالتها'], docs: ['بيانات المؤجر والمستأجر', 'عنوان العين ووصفها'] },
      addons: [] },
    { id: 'legal-notice', cat: 'individuals', cats: ['individuals', 'companies'], title: 'إنذار قانوني', short: 'صياغة إنذار رسمي للمطالبة بحق أو إثبات واقعة قبل اتخاذ إجراء قضائي.', price: 900, priceType: 'fixed', days: 'يوم عمل واحد', status: 'published', formVersion: 1,
      sections: S(['about', 'deliverables', 'docs', 'pricing', 'faq']),
      content: { about: 'نصيغ إنذارًا قانونيًا واضحًا بلغة رسمية، جاهزًا للإعلان عبر المحضرين.', deliverables: ['نص الإنذار بصيغة PDF وWord'], docs: ['بيانات المُنذَر إليه وعنوانه', 'المستندات المثبتة للحق'], faq: [['هل تشمل الخدمة الإعلان عبر المحضر؟', 'لا، تشمل الخدمة الصياغة. يمكن مساعدتك في الإعلان كخدمة منفصلة.']] },
      addons: [] },
    { id: 'written-consultation', cat: 'consultations', cats: ['consultations'], kind: 'written', title: 'استشارة قانونية كتابية', short: 'اشرح مسألتك وأرفق مستنداتك، واستلم ردًا مكتوبًا مفصلًا داخل حسابك.', price: 750, priceType: 'fixed', days: 'خلال ٤٨ ساعة عمل', status: 'published', formVersion: 4, featured: true,
      sections: S(['about', 'included', 'steps', 'duration', 'pricing', 'faq', 'reviews']),
      content: { about: 'استشارة مكتوبة يعدها محامٍ بعد قراءة وصفك ومستنداتك، تتضمن التكييف القانوني للمسألة والخيارات المتاحة لك.', included: ['رد مكتوب مفصل', 'سؤال متابعة واحد خلال ٧ أيام'], steps: ['اشرح المسألة وأرفق الملفات', 'ادفع رسوم الاستشارة', 'تابع حالة الطلب', 'اقرأ الرد بأمان داخل حسابك'], faq: [['هل الرد سري؟', 'نعم، يظهر الرد داخل حسابك فقط ولا يُرسل عبر البريد الإلكتروني.']] },
      addons: [{ id: 'followup', label: 'سؤالا متابعة إضافيان', price: 300 }] },
    { id: 'video-consultation', cat: 'consultations', cats: ['consultations'], kind: 'meeting', title: 'استشارة عبر اجتماع مرئي', short: 'اجتماع مدته ٣٠ دقيقة بالضبط مع محامٍ عبر Google Meet في موعد تختاره.', price: 1000, priceType: 'fixed', days: '٣٠ دقيقة', status: 'published', formVersion: 2, featured: true,
      sections: S(['about', 'included', 'steps', 'pricing', 'faq', 'reviews']),
      content: { about: 'اختر موعدًا متاحًا، واشرح ما تود مناقشته، وسيضيف المحامي رابط الاجتماع في حسابك قبل الموعد.', included: ['اجتماع مرئي مدته ٣٠ دقيقة', 'ملخص مكتوب مختصر بعد الاجتماع'], steps: ['اختر اليوم والوقت', 'أضف سياق الاجتماع والملفات', 'ادفع رسوم الاستشارة', 'استلم رابط الاجتماع في حسابك'], faq: [['متى يظهر رابط الاجتماع؟', 'يضيف المحامي الرابط يدويًا قبل الموعد، وستصلك إشارة داخل المنصة فور إضافته.'], ['هل يمكن إعادة الجدولة؟', 'نعم، حتى ٢٤ ساعة قبل الموعد من صفحة الموعد.']] },
      addons: [] },
    { id: 'company-governance', cat: 'companies', cats: ['companies'], title: 'لائحة داخلية للشركة', short: 'إعداد لائحة تنظيم داخلي للموارد البشرية والجزاءات.', price: 4500, priceType: 'fixed', days: '٧ أيام عمل', status: 'draft', formVersion: 1,
      sections: S(['about', 'pricing']), content: { about: 'لائحة داخلية متوافقة مع قانون العمل.' }, addons: [] }
  ];

  const F = (id, type, label, extra) => Object.assign({ id, type, label, placeholder: '', required: false, help: '' }, extra || {});
  const forms = {
    'contract-drafting': [
      F('h1', 'section', 'بيانات الأطراف', { help: 'أدخل الأسماء كما ستظهر في العقد.' }),
      F('p1', 'text', 'اسم الطرف الأول', { required: true, placeholder: 'شخص أو شركة' }),
      F('p2', 'text', 'اسم الطرف الثاني', { required: true, placeholder: 'شخص أو شركة' }),
      F('ctype', 'select', 'نوع العقد', { required: true, placeholder: 'اختر نوع العقد', options: ['عقد توريد', 'عقد تقديم خدمات', 'عقد شراكة', 'عقد بيع', 'أخرى'] }),
      F('lang', 'radio', 'لغة العقد', { required: true, options: ['العربية', 'العربية والإنجليزية'] }),
      F('h2', 'section', 'تفاصيل الاتفاق'),
      F('desc', 'textarea', 'وصف موضوع العقد', { required: true, minLength: 30, placeholder: 'ما الذي سيقدمه كل طرف؟ وما المدة وشروط الدفع؟', help: '٣٠ حرفًا على الأقل.' }),
      F('value', 'number', 'القيمة التقريبية للعقد (ج.م)', { min: 0, placeholder: 'اختياري' }),
      F('start', 'date', 'تاريخ البدء المتوقع'),
      F('clauses', 'checkbox', 'بنود إضافية مطلوبة', { options: ['السرية وعدم الإفصاح', 'عدم المنافسة', 'التحكيم', 'الشرط الجزائي'] }),
      F('files', 'file', 'مستندات داعمة', { accept: ['pdf', 'docx', 'jpg', 'png'], maxMB: 10, maxFiles: 5, help: 'عروض أسعار، مراسلات، أو عقود سابقة.' })
    ],
    'written-consultation': [
      F('area', 'select', 'مجال المسألة', { required: true, placeholder: 'اختر المجال', options: ['أحوال شخصية', 'علاقات عمل', 'عقود ومعاملات', 'شركات', 'عقارات وإيجارات', 'أخرى'] }),
      F('title', 'text', 'عنوان مختصر للمسألة', { required: true, placeholder: 'مثال: تأخر المالك في رد التأمين' }),
      F('desc', 'textarea', 'اشرح المسألة بالتفصيل', { required: true, minLength: 50, placeholder: 'ما الذي حدث؟ ومتى؟ وما الذي تريد معرفته؟', help: 'كلما كان الوصف أوضح كان الرد أدق. ٥٠ حرفًا على الأقل.' }),
      F('dispute', 'radio', 'هل يوجد نزاع قضائي قائم؟', { required: true, options: ['نعم', 'لا', 'لست متأكدًا'] }),
      F('files', 'file', 'مرفقات', { accept: ['pdf', 'docx', 'jpg', 'png'], maxMB: 10, maxFiles: 5 })
    ],
    'video-consultation': [
      F('topics', 'multiselect', 'محاور الاجتماع', { required: true, options: ['عقود', 'علاقات عمل', 'تأسيس شركة', 'عقارات', 'أحوال شخصية', 'نزاع قائم'] }),
      F('desc', 'textarea', 'ما الذي تود مناقشته؟', { required: true, minLength: 20, placeholder: 'اكتب ملخصًا يساعد المحامي على التحضير للاجتماع.' }),
      F('files', 'file', 'ملفات داعمة', { accept: ['pdf', 'docx', 'jpg', 'png'], maxMB: 10, maxFiles: 3 })
    ]
  };
  const genericForm = [F('desc', 'textarea', 'صف ما تحتاجه', { required: true, minLength: 20 }), F('files', 'file', 'مستندات', { accept: ['pdf', 'docx', 'jpg', 'png'], maxMB: 10, maxFiles: 5 })];

  const ME = { id: 'u1', name: 'أحمد سامي', full: 'أحمد سامي عبد الله', phone: '+20 100 123 4567', email: 'ahmed.samy@example.com', city: 'القاهرة' };
  const clients = { u1: ME, u2: { id: 'u2', name: 'شركة نيل للحلول التقنية', phone: '+20 122 555 0198', email: 'legal@nile-tech.example', city: 'الجيزة' }, u3: { id: 'u3', name: 'منى حسن', phone: '+20 111 234 8890', email: 'mona.h@example.com', city: 'الإسكندرية' }, u4: { id: 'u4', name: 'مصنع الدلتا للتعبئة', phone: '+20 100 777 4120', email: 'hr@delta-pack.example', city: 'المنصورة' }, u5: { id: 'u5', name: 'يوسف عادل', phone: '+20 127 300 1144', email: 'youssef.a@example.com', city: 'القاهرة' } };
  const LAWYER = 'أ. كريم حلمي';

  const T = (at, label, by, detail) => ({ at, label, by, detail: detail || '' });
  const orders = [
    { id: 'DQ-10231', client: 'u1', service: 'contract-drafting', status: 'delivered', pay: 'paid', total: 2500, created: ago(6, 3), formVersion: 3, lawyer: LAWYER,
      answers: [['اسم الطرف الأول', 'أحمد سامي عبد الله'], ['اسم الطرف الثاني', 'شركة الأمل للتوريدات'], ['نوع العقد', 'عقد توريد'], ['لغة العقد', 'العربية'], ['وصف موضوع العقد', 'توريد مستلزمات مكتبية شهريًا لمدة سنة، الدفع خلال ٣٠ يومًا من الفاتورة.'], ['بنود إضافية مطلوبة', 'الشرط الجزائي، التحكيم']],
      files: [{ name: 'عرض-سعر-الأمل.pdf', size: '٣٤٠ ك.ب' }],
      deliverables: [{ v: 1, name: 'عقد-توريد-مستلزمات-v1.docx', size: '٨٤ ك.ب', at: ago(0, 20), note: 'المسودة الأولى. راجعت مدة الإشعار في البند السابع.' }, { v: 1, name: 'عقد-توريد-مستلزمات-v1.pdf', size: '٢١٠ ك.ب', at: ago(0, 20), note: '' }],
      messages: [{ from: 'lawyer', text: 'مرحبًا أ. أحمد، هل يتحمل المورد تكلفة النقل؟', at: ago(4, 2) }, { from: 'client', text: 'نعم، النقل على المورد داخل القاهرة الكبرى.', at: ago(4, 1) }, { from: 'lawyer', text: 'تم رفع المسودة الأولى. يسعدني تلقي ملاحظاتك.', at: ago(0, 20) }],
      timeline: [T(ago(6, 3), 'تم إنشاء الطلب', 'client'), T(ago(6, 3), 'تم الدفع بنجاح', 'system', 'إيصال RC-55821'), T(ago(5, 8), 'بدأت المراجعة', 'lawyer'), T(ago(4, 2), 'رسالة من المحامي', 'lawyer'), T(ago(3, 0), 'بدأ التنفيذ', 'lawyer'), T(ago(0, 20), 'تم تسليم الإصدار ١', 'lawyer')], notes: [{ text: 'العميل يفضل مدة إشعار ٦٠ يومًا.', at: ago(4, 0) }] },
    { id: 'DQ-10244', client: 'u1', service: 'video-consultation', status: 'under_review', pay: 'paid', total: 1000, created: ago(1, 5), formVersion: 2, lawyer: LAWYER,
      meeting: { date: '2026-10-15', time: '11:00', link: '' },
      answers: [['محاور الاجتماع', 'تأسيس شركة، عقود'], ['ما الذي تود مناقشته؟', 'أرغب في تأسيس شركة ذات مسؤولية محدودة مع شريكين وأحتاج فهم الخيارات.']], files: [],
      deliverables: [], messages: [], timeline: [T(ago(1, 5), 'تم حجز الموعد', 'client', 'الخميس ١٥ أكتوبر، ١١:٠٠ ص'), T(ago(1, 5), 'تم الدفع بنجاح', 'system')], notes: [] },
    { id: 'DQ-10247', client: 'u1', service: 'written-consultation', status: 'in_progress', pay: 'paid', total: 750, created: ago(0, 22), formVersion: 4, lawyer: LAWYER,
      answers: [['مجال المسألة', 'عقارات وإيجارات'], ['عنوان مختصر للمسألة', 'تأخر المالك في رد مبلغ التأمين'], ['اشرح المسألة بالتفصيل', 'انتهى عقد الإيجار منذ شهرين وسلمت الشقة بحالة جيدة، والمالك يرفض رد التأمين ويطلب خصم تكاليف دهان.'], ['هل يوجد نزاع قضائي قائم؟', 'لا']],
      files: [{ name: 'عقد-الإيجار.pdf', size: '١٫٢ م.ب' }, { name: 'صور-الشقة-عند-التسليم.jpg', size: '٢٫٤ م.ب' }],
      deliverables: [], messages: [], response: null, timeline: [T(ago(0, 22), 'تم إرسال الاستشارة', 'client'), T(ago(0, 22), 'تم الدفع بنجاح', 'system'), T(ago(0, 6), 'بدأ المحامي إعداد الرد', 'lawyer')], notes: [] },
    { id: 'DQ-10198', client: 'u1', service: 'lease-agreement', status: 'completed', pay: 'paid', total: 1200, created: ago(24), formVersion: 1, lawyer: LAWYER, rating: 5,
      answers: [['نوع الإيجار', 'سكني']], files: [], deliverables: [{ v: 1, name: 'عقد-إيجار-سكني-v1.pdf', size: '١٥٠ ك.ب', at: ago(22), note: '' }, { v: 2, name: 'عقد-إيجار-سكني-v2.pdf', size: '١٥٤ ك.ب', at: ago(21), note: 'تعديل مدة العقد إلى سنتين.' }],
      messages: [], timeline: [T(ago(24), 'تم إنشاء الطلب', 'client'), T(ago(24), 'تم الدفع بنجاح', 'system'), T(ago(22), 'تم تسليم الإصدار ١', 'lawyer'), T(ago(22), 'طلب العميل تعديلًا', 'client'), T(ago(21), 'تم تسليم الإصدار ٢', 'lawyer'), T(ago(20), 'قبل العميل التسليم واكتمل الطلب', 'client')], notes: [] },
    { id: 'DQ-10252', client: 'u1', service: 'contract-review', status: 'awaiting_payment', pay: 'failed', total: 1500, created: ago(0, 3), formVersion: 2, lawyer: '',
      answers: [['نوع العقد', 'عقد عمل'], ['عدد الصفحات', '٨']], files: [{ name: 'عقد-العمل-المقترح.pdf', size: '٤٤٠ ك.ب' }], deliverables: [], messages: [], timeline: [T(ago(0, 3), 'تم إنشاء الطلب', 'client'), T(ago(0, 3), 'فشلت عملية الدفع', 'system', 'رفضت البطاقة من البنك المصدر')], notes: [] },
    { id: 'DQ-10249', client: 'u2', service: 'company-formation', status: 'new', pay: 'unpaid', total: 8000, created: ago(0, 9), formVersion: 1, lawyer: '', answers: [['الشكل القانوني المقترح', 'شركة ذات مسؤولية محدودة'], ['عدد الشركاء', '٣']], files: [{ name: 'بطاقات-الشركاء.pdf', size: '٢٫١ م.ب' }], deliverables: [], messages: [], timeline: [T(ago(0, 9), 'تم إنشاء الطلب', 'client')], notes: [] },
    { id: 'DQ-10250', client: 'u4', service: 'employment-contract', status: 'awaiting_info', pay: 'paid', total: 1800, created: ago(2, 4), formVersion: 1, lawyer: LAWYER, answers: [['عدد الموظفين', '١٢'], ['نوع التعاقد', 'محدد المدة']], files: [], deliverables: [], messages: [{ from: 'lawyer', text: 'نحتاج نسخة من اللائحة الداخلية الحالية إن وجدت.', at: ago(1, 2) }], timeline: [T(ago(2, 4), 'تم إنشاء الطلب', 'client'), T(ago(2, 4), 'تم الدفع بنجاح', 'system'), T(ago(1, 2), 'طلب المحامي معلومات إضافية', 'lawyer')], notes: [] },
    { id: 'DQ-10251', client: 'u3', service: 'legal-notice', status: 'in_progress', pay: 'paid', total: 900, created: ago(1, 1), formVersion: 1, lawyer: LAWYER, answers: [['موضوع الإنذار', 'المطالبة بمبلغ مستحق']], files: [{ name: 'إيصال-أمانة.jpg', size: '٩٠٠ ك.ب' }], deliverables: [], messages: [], timeline: [T(ago(1, 1), 'تم إنشاء الطلب', 'client'), T(ago(1, 1), 'تم الدفع بنجاح', 'system')], notes: [] },
    { id: 'DQ-10245', client: 'u5', service: 'video-consultation', status: 'in_progress', pay: 'paid', total: 1000, created: ago(3), formVersion: 2, lawyer: LAWYER, meeting: { date: '2026-10-12', time: '13:00', link: 'https://meet.google.com/qwe-rtyu-iop' }, answers: [['محاور الاجتماع', 'علاقات عمل']], files: [], deliverables: [], messages: [], timeline: [T(ago(3), 'تم حجز الموعد', 'client'), T(ago(3), 'تم الدفع بنجاح', 'system'), T(ago(1), 'أضاف المحامي رابط الاجتماع', 'lawyer')], notes: [] },
    { id: 'DQ-10240', client: 'u3', service: 'video-consultation', status: 'under_review', pay: 'paid', total: 1000, created: ago(2), formVersion: 2, lawyer: LAWYER, meeting: { date: '2026-10-13', time: '10:30', link: '' }, answers: [['محاور الاجتماع', 'أحوال شخصية']], files: [], deliverables: [], messages: [], timeline: [T(ago(2), 'تم حجز الموعد', 'client'), T(ago(2), 'تم الدفع بنجاح', 'system')], notes: [] },
    { id: 'DQ-10233', client: 'u2', service: 'contract-review', status: 'completed', pay: 'partial_refund', total: 1500, created: ago(9), formVersion: 2, lawyer: LAWYER, rating: 4, answers: [], files: [], deliverables: [{ v: 1, name: 'مراجعة-اتفاقية-SaaS.pdf', size: '٣٢٠ ك.ب', at: ago(7), note: '' }], messages: [], timeline: [T(ago(9), 'تم إنشاء الطلب', 'client'), T(ago(7), 'اكتمل الطلب', 'client')], notes: [] },
    { id: 'DQ-10229', client: 'u5', service: 'written-consultation', status: 'cancelled', pay: 'refunded', total: 750, created: ago(11), formVersion: 3, lawyer: '', answers: [], files: [], deliverables: [], messages: [], timeline: [T(ago(11), 'تم إنشاء الطلب', 'client'), T(ago(10), 'ألغى العميل الطلب واسترد المبلغ', 'system')], notes: [] }
  ];

  const reviews = [
    { id: 'r1', service: 'lease-agreement', order: 'DQ-10198', name: 'أحمد س.', stars: 5, text: 'العقد واضح جدًا، والتعديل وصل في نفس اليوم.', at: ago(20), reply: 'شكرًا لثقتك، يسعدنا خدمتك دائمًا.' },
    { id: 'r2', service: 'contract-drafting', order: 'DQ-10190', name: 'هالة م.', stars: 5, text: 'شرح المحامي كل بند قبل التسليم، وتابعت كل خطوة من حسابي.', at: ago(14), reply: '' },
    { id: 'r3', service: 'contract-review', order: 'DQ-10233', name: 'شركة نيل', stars: 4, text: 'ملاحظات دقيقة على بنود المسؤولية. تمنيت تسليمًا أسرع بيوم.', at: ago(7), reply: '' },
    { id: 'r4', service: 'written-consultation', order: 'DQ-10180', name: 'عمر ف.', stars: 5, text: 'رد مفصل ومنظم، وفهمت خياراتي بوضوح.', at: ago(18), reply: '' },
    { id: 'r5', service: 'video-consultation', order: 'DQ-10175', name: 'سارة ك.', stars: 4, text: 'الاجتماع كان في موعده والمحامي كان مستعدًا.', at: ago(25), reply: '' },
    { id: 'r6', service: 'contract-drafting', order: 'DQ-10166', name: 'محمود ر.', stars: 3, text: 'العقد جيد لكن احتجت إلى توضيحات أكثر في الرسائل.', at: ago(30), reply: '' }
  ];

  const notifications = [
    { id: 'n1', to: 'client', order: 'DQ-10231', text: 'تم تسليم الإصدار ١ من «صياغة عقد». راجعه واقبله أو اطلب تعديلًا.', at: ago(0, 20), read: false },
    { id: 'n2', to: 'client', order: 'DQ-10252', text: 'فشلت عملية الدفع لطلب «مراجعة عقد». يمكنك المحاولة مرة أخرى.', at: ago(0, 3), read: false },
    { id: 'n3', to: 'client', order: 'DQ-10244', text: 'تم تأكيد حجز الاستشارة المرئية يوم الخميس ١٥ أكتوبر. سيظهر الرابط هنا فور إضافته.', at: ago(1, 5), read: true },
    { id: 'n4', to: 'admin', order: 'DQ-10249', text: 'طلب جديد: المساعدة في تأسيس شركة — شركة نيل للحلول التقنية', at: ago(0, 9), read: false },
    { id: 'n5', to: 'admin', order: 'DQ-10240', text: 'موعد غدًا ١٠:٣٠ ص بدون رابط اجتماع', at: ago(0, 2), read: false }
  ];

  const settings = {
    hours: [['السبت', true, '10:00', '16:00'], ['الأحد', true, '10:00', '16:00'], ['الاثنين', true, '10:00', '16:00'], ['الثلاثاء', true, '10:00', '16:00'], ['الأربعاء', true, '10:00', '16:00'], ['الخميس', true, '10:00', '14:00'], ['الجمعة', false, '', '']],
    blocked: ['2026-10-22'], blockedSlots: { '2026-10-14': ['12:00', '12:30'] }
  };

  function seed() { return JSON.parse(JSON.stringify({ services, forms, orders, reviews, notifications, settings, seq: 10253 })); }
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { state = seed(); }
  const subs = new Set();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} subs.forEach(f => f()); };
  window.addEventListener('storage', e => { if (e.key === KEY && e.newValue) { state = JSON.parse(e.newValue); subs.forEach(f => f()); } });

  const svc = id => state.services.find(s => s.id === id);
  const form = id => state.forms[id] || genericForm;
  const order = id => state.orders.find(o => o.id === id);
  const tl = (o, label, by, detail) => o.timeline.push(T(nowIso(), label, by, detail));
  const notify = (to, orderId, text) => state.notifications.unshift({ id: 'n' + Date.now() + Math.random(), to, order: orderId, text, at: nowIso(), read: false });

  // weekday index in settings.hours: Sat=0 ... Fri=6 ; JS getDay: Sun=0..Sat=6
  const dayRow = ymd => state.settings.hours[(ymdDate(ymd).getUTCDay() + 1) % 7];
  function slots(ymd) {
    const r = dayRow(ymd); if (!r[1] || state.settings.blocked.includes(ymd)) return [];
    const out = []; let t = r[2];
    const taken = state.orders.filter(o => o.meeting && o.meeting.date === ymd && o.status !== 'cancelled').map(o => o.meeting.time);
    const blk = state.settings.blockedSlots[ymd] || [];
    while (t < r[3]) { out.push({ time: t, label: fmtTime(t), end: fmtTime(addMin(t, 30)), available: !taken.includes(t) && !blk.includes(t) && ymd >= '2026-10-13' }); t = addMin(t, 30); }
    return out;
  }
  function validate(f, v) {
    if (['section', 'help'].includes(f.type)) return '';
    const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
    if (f.required && empty) return f.type === 'file' ? 'يرجى إرفاق ملف واحد على الأقل.' : (['select', 'radio'].includes(f.type) ? 'يرجى اختيار قيمة.' : 'هذا الحقل مطلوب.');
    if (!empty && f.minLength && String(v).trim().length < f.minLength) return 'يجب ألا يقل النص عن ' + toAr(f.minLength) + ' حرفًا.';
    if (!empty && f.type === 'number' && f.min != null && Number(v) < f.min) return 'القيمة أقل من الحد المسموح.';
    return '';
  }
  // Turns a field list into template-ready view models
  function fieldVM(fields, values, errors, set, setErr) {
    return fields.map(f => {
      const v = values[f.id];
      const err = errors[f.id] || '';
      const t = f.type;
      const vm = Object.assign({}, f, {
        reqMark: f.required ? '*' : '', labelFull: f.label + (f.required ? ' *' : ''), error: err, showHelp: !!f.help && !err,
        selectOptions: [{ value: '', label: f.placeholder || 'اختر' }].concat((f.options || []).map(o => ({ value: o, label: o }))), hasError: !!err, hasHelp: !!f.help,
        isSection: t === 'section', isHelp: t === 'help', isText: t === 'text', isTextarea: t === 'textarea', isNumber: t === 'number', isDate: t === 'date',
        isSelect: t === 'select', isRadio: t === 'radio', isCheckbox: t === 'checkbox', isMulti: t === 'multiselect', isFile: t === 'file', isInput: ['text', 'number', 'date'].includes(t),
        value: v == null ? '' : v, inputType: t === 'text' ? 'text' : t,
        border: err ? 'var(--critical-500)' : 'var(--border-default)',
        onInput: e => set(f.id, e.target.value)
      });
      const opts = f.options || [];
      vm.optionList = opts.map(o => {
        const sel = Array.isArray(v) ? v.includes(o) : v === o;
        return { label: o, value: o, selected: sel, mark: sel ? '✓' : '', bg: sel ? 'var(--ink-900)' : 'var(--surface-card)', fg: sel ? 'var(--cream-100)' : 'var(--text-body)', bd: sel ? 'var(--ink-900)' : 'var(--border-default)', dot: sel ? 'var(--ink-900)' : 'transparent',
          onPick: () => { if (t === 'checkbox' || t === 'multiselect') { const a = Array.isArray(v) ? v.slice() : []; const i = a.indexOf(o); i >= 0 ? a.splice(i, 1) : a.push(o); set(f.id, a); } else set(f.id, o); } };
      });
      if (t === 'file') {
        const files = Array.isArray(v) ? v : [];
        vm.fileList = files.map((x, i) => ({ name: x.name, size: x.size, onRemove: () => set(f.id, files.filter((_, j) => j !== i)) }));
        vm.hasFiles = files.length > 0;
        vm.acceptLabel = (f.accept || []).map(a => a.toUpperCase()).join('، ');
        vm.maxLabel = toAr(f.maxMB || 10) + ' م.ب';
        vm.acceptAttr = (f.accept || []).map(a => '.' + a).join(',');
        const add = list => {
          const acc = f.accept || []; const max = (f.maxMB || 10) * 1048576; const out = files.slice(); let e = '';
          Array.from(list).forEach(file => {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            if (acc.length && !acc.includes(ext)) e = 'نوع الملف «' + file.name + '» غير مسموح. الأنواع المسموحة: ' + vm.acceptLabel;
            else if (file.size > max) e = 'حجم «' + file.name + '» يتجاوز ' + vm.maxLabel;
            else if (out.length >= (f.maxFiles || 5)) e = 'الحد الأقصى ' + toAr(f.maxFiles || 5) + ' ملفات.';
            else out.push({ name: file.name, size: file.size > 1048576 ? toAr((file.size / 1048576).toFixed(1)) + ' م.ب' : toAr(Math.max(1, Math.round(file.size / 1024))) + ' ك.ب' });
          });
          set(f.id, out); if (setErr) setErr(f.id, e);
        };
        vm.onFiles = e => { add(e.target.files || []); e.target.value = ''; };
        vm.onDrop = e => { e.preventDefault(); add(e.dataTransfer.files || []); };
        vm.onDragOver = e => e.preventDefault();
        vm.onSample = () => add([{ name: 'مستند-تجريبي.pdf', size: 420000 }]);
        vm.onBadSample = () => add([{ name: 'ملف-تنفيذي.exe', size: 1000 }]);
      }
      return vm;
    });
  }
  function answersFrom(fields, values) {
    return fields.filter(f => !['section', 'help', 'file'].includes(f.type) && values[f.id] != null && values[f.id] !== '' && !(Array.isArray(values[f.id]) && !values[f.id].length))
      .map(f => [f.label, Array.isArray(values[f.id]) ? values[f.id].join('، ') : (f.type === 'date' ? fmtDate(values[f.id] + 'T12:00:00+03:00') : String(values[f.id]))]);
  }

  const A = {
    createOrder({ service, values, addons, meeting, total }) {
      const s = svc(service); const fields = form(service);
      const files = [].concat(...fields.filter(f => f.type === 'file').map(f => values[f.id] || []));
      const o = { id: 'DQ-' + (state.seq++), client: 'u1', service, status: s.priceType === 'quote' ? 'new' : 'awaiting_payment', pay: 'unpaid', total, created: nowIso(), formVersion: s.formVersion, lawyer: '', answers: answersFrom(fields, values), files, addons: addons || [], deliverables: [], messages: [], timeline: [], notes: [] };
      if (meeting) o.meeting = { date: meeting.date, time: meeting.time, link: '' };
      tl(o, s.kind === 'meeting' ? 'تم حجز الموعد مبدئيًا' : 'تم إنشاء الطلب', 'client', meeting ? fmtDay(meeting.date) + '، ' + fmtTime(meeting.time) : '');
      if (s.priceType === 'quote') notify('admin', o.id, 'طلب عرض سعر جديد: ' + s.title + ' — ' + clients[o.client].name);
      state.orders.unshift(o); save(); return o.id;
    },
    pay(id, ok) {
      const o = order(id); const s = svc(o.service);
      if (ok) { o.pay = 'paid'; o.status = 'under_review'; o.lawyer = o.lawyer || LAWYER; o.receipt = 'RC-' + Math.floor(55000 + Math.random() * 999); tl(o, 'تم الدفع بنجاح', 'system', 'إيصال ' + o.receipt); notify('admin', id, (s.kind === 'meeting' ? 'حجز جديد: ' : 'طلب جديد مدفوع: ') + s.title + ' — ' + clients[o.client].name); notify('client', id, 'تم استلام الدفع لطلب «' + s.title + '». بدأت المراجعة.'); }
      else { o.pay = 'failed'; tl(o, 'فشلت عملية الدفع', 'system', 'رفضت البطاقة من البنك المصدر'); }
      save();
    },
    setStatus(id, st) { const o = order(id); if (o.status === st) return; o.status = st; tl(o, 'تغيّرت الحالة إلى «' + STATUS[st].label + '»', 'lawyer'); notify('client', id, 'تحديث على طلبك ' + id + ': ' + STATUS[st].client); save(); },
    deliver(id, name, note) {
      const o = order(id); const v = (o.deliverables.reduce((m, d) => Math.max(m, d.v), 0)) + 1;
      o.deliverables.push({ v, name: name || ('مستند-' + id + '-v' + v + '.pdf'), size: '١٩٨ ك.ب', at: nowIso(), note: note || '' });
      o.status = 'delivered'; tl(o, 'تم تسليم الإصدار ' + toAr(v), 'lawyer', name); notify('client', id, 'تم تسليم الإصدار ' + toAr(v) + ' من «' + svc(o.service).title + '». يمكنك معاينته وتحميله الآن.'); save();
    },
    accept(id) { const o = order(id); o.status = 'completed'; tl(o, 'قبل العميل التسليم واكتمل الطلب', 'client'); notify('admin', id, 'اكتمل الطلب ' + id + ' بعد قبول العميل'); save(); },
    revise(id, text) { const o = order(id); o.status = 'revision'; o.messages.push({ from: 'client', text: 'طلب تعديل: ' + text, at: nowIso() }); tl(o, 'طلب العميل تعديلًا', 'client', text); notify('admin', id, 'طلب تعديل على ' + id); save(); },
    rate(id, stars, text) { const o = order(id); o.rating = stars; state.reviews.unshift({ id: 'r' + Date.now(), service: o.service, order: id, name: 'أحمد س.', stars, text, at: nowIso(), reply: '' }); tl(o, 'أضاف العميل تقييمًا', 'client', '★'.repeat(stars)); notify('admin', id, 'تقييم جديد ' + toAr(stars) + '/٥ على ' + svc(o.service).title); save(); },
    message(id, from, text, files) { const o = order(id); o.messages.push({ from, text, files: files || [], at: nowIso() }); if (files && files.length && from === 'client') o.files.push(...files); notify(from === 'client' ? 'admin' : 'client', id, 'رسالة جديدة على الطلب ' + id); if (from === 'client' && o.status === 'awaiting_info') { o.status = 'under_review'; tl(o, 'أرسل العميل المعلومات المطلوبة', 'client'); } save(); },
    note(id, text) { order(id).notes.push({ text, at: nowIso() }); save(); },
    setLink(id, url) { const o = order(id); const had = !!o.meeting.link; o.meeting.link = url; o.status = 'in_progress'; tl(o, had ? 'حدّث المحامي رابط الاجتماع' : 'أضاف المحامي رابط الاجتماع', 'lawyer'); notify('client', id, 'رابط اجتماعك يوم ' + fmtDay(o.meeting.date) + ' أصبح متاحًا في حسابك.'); save(); },
    reschedule(id, date, time, by) { const o = order(id); o.meeting.date = date; o.meeting.time = time; tl(o, 'تمت إعادة جدولة الموعد', by || 'lawyer', fmtDay(date) + '، ' + fmtTime(time)); notify(by === 'client' ? 'admin' : 'client', id, 'تم تغيير موعد الاستشارة إلى ' + fmtDay(date) + '، ' + fmtTime(time)); save(); },
    cancel(id, by) { const o = order(id); o.status = 'cancelled'; if (o.pay === 'paid') o.pay = 'refunded'; tl(o, 'تم إلغاء الطلب', by || 'lawyer', o.pay === 'refunded' ? 'سيتم رد المبلغ إلى وسيلة الدفع' : ''); notify(by === 'client' ? 'admin' : 'client', id, 'تم إلغاء الطلب ' + id); save(); },
    complete(id) { const o = order(id); o.status = 'completed'; tl(o, 'تم إنهاء الاستشارة', 'lawyer'); notify('client', id, 'اكتملت استشارتك. يسعدنا تقييمك للخدمة.'); save(); },
    respond(id, text, files) { const o = order(id); o.response = { text, files: files || [], at: nowIso(), by: LAWYER }; o.status = 'delivered'; tl(o, 'أرسل المحامي الرد المكتوب', 'lawyer'); notify('client', id, 'وصل رد المحامي على استشارتك «' + (o.answers[1] ? o.answers[1][1] : '') + '». اقرأه الآن في حسابك.'); save(); },
    reply(rid, text) { state.reviews.find(r => r.id === rid).reply = text; save(); },
    readAll(to) { state.notifications.forEach(n => { if (n.to === to) n.read = true; }); save(); },
    saveService(s, fields, publish) {
      const i = state.services.findIndex(x => x.id === s.id);
      if (publish) { s.status = 'published'; s.formVersion = (s.formVersion || 0) + (fields ? 1 : 0); }
      if (i >= 0) state.services[i] = s; else state.services.push(s);
      if (fields) state.forms[s.id] = fields; save();
    },
    setSettings(fn) { fn(state.settings); save(); },
    reset() { state = seed(); save(); }
  };

  window.DQ = Object.assign(A, {
    get state() { return state; }, subscribe(f) { subs.add(f); return () => subs.delete(f); },
    STATUS, PAY, FLOW, FLOW_IDX, CATS, SECTION_LABELS, clients, ME, LAWYER,
    svc, form, order, slots, validate, fieldVM, answersFrom, dayRow,
    toAr, num, egp, fmtDate, fmtShort, fmtDateTime, fmtDay, fmtTime, addMin, ymdDate,
    stars: n => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n)),
    rating(serviceId) { const r = state.reviews.filter(x => !serviceId || x.service === serviceId); return r.length ? { avg: r.reduce((a, b) => a + b.stars, 0) / r.length, n: r.length } : { avg: 0, n: 0 }; },
    priceLabel: s => (s.priceType === 'quote' ? 'يبدأ من ' : '') + egp(s.price),
    meetValid: u => /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(String(u).trim())
  });
})();
