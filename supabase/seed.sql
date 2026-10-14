-- =====================================================================
-- OQOUDI local seed — catalog, content, settings, demo accounts.
-- Demo accounts are for LOCAL DEVELOPMENT ONLY (password: Oqoudi123).
-- No real client data. Demo orders are created by `npm run db:seed-demo`
-- through the real business functions + storage.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, is_public) values
  ('booking', '{"slot_minutes": 30, "lead_minutes": 120, "horizon_days": 60, "hold_minutes": 15}', true),
  ('contact', '{
     "phone": "+20 2 2345 6789",
     "email": "hello@oqoudi.example",
     "hours": {"ar": "السبت – الخميس، ١٠ ص – ٤ م (بتوقيت القاهرة)", "en": "Saturday – Thursday, 10 AM – 4 PM (Cairo time)"},
     "address": {"ar": "القاهرة، جمهورية مصر العربية", "en": "Cairo, Egypt"}
   }', true),
  ('assignment.default_lawyer', '{"lawyer_id": null}', false);

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------
insert into public.service_categories (id, slug, title, description, icon, sort_order) values
  ('10000000-0000-4000-8000-000000000001', 'individuals',
   '{"ar": "خدمات الأفراد", "en": "Services for individuals"}',
   '{"ar": "عقود الإيجار والبيع، الإنذارات، ومسائل الأسرة والعمل.", "en": "Lease and sale contracts, legal notices, family and employment matters."}',
   'user', 1),
  ('10000000-0000-4000-8000-000000000002', 'companies',
   '{"ar": "خدمات الشركات", "en": "Services for companies"}',
   '{"ar": "تأسيس الشركات، عقود العمل والتوريد، ومراجعة الاتفاقيات.", "en": "Company formation, employment and supply contracts, agreement reviews."}',
   'building', 2),
  ('10000000-0000-4000-8000-000000000003', 'consultations',
   '{"ar": "الاستشارات القانونية", "en": "Legal consultations"}',
   '{"ar": "استشارة كتابية مفصلة أو اجتماع مرئي مدته ٣٠ دقيقة.", "en": "A detailed written opinion or a 30-minute video meeting."}',
   'scale', 3);

-- ---------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------
insert into public.services (id, slug, kind, primary_category_id, title, short_description, delivery_estimate, pricing_type, base_price_minor, meeting_duration_minutes, status, is_featured, sort_order, published_at) values
  ('20000000-0000-4000-8000-000000000001', 'contract-drafting', 'standard', '10000000-0000-4000-8000-000000000002',
   '{"ar": "صياغة عقد", "en": "Contract drafting"}',
   '{"ar": "صياغة عقد مخصص لاتفاقك، يغطي الالتزامات والمدد وآليات فض النزاع.", "en": "A contract tailored to your deal, covering obligations, terms and dispute resolution."}',
   '{"ar": "٣–٥ أيام عمل", "en": "3–5 business days"}', 'fixed', 250000, null, 'published', true, 1, now()),
  ('20000000-0000-4000-8000-000000000002', 'contract-review', 'standard', '10000000-0000-4000-8000-000000000002',
   '{"ar": "مراجعة عقد", "en": "Contract review"}',
   '{"ar": "مراجعة عقد قائم وتحديد المخاطر والبنود غير المتوازنة مع مقترحات تعديل.", "en": "Review of an existing contract, highlighting risks and unbalanced clauses with suggested edits."}',
   '{"ar": "٢–٣ أيام عمل", "en": "2–3 business days"}', 'fixed', 150000, null, 'published', true, 2, now()),
  ('20000000-0000-4000-8000-000000000003', 'employment-contract', 'standard', '10000000-0000-4000-8000-000000000002',
   '{"ar": "عقد عمل", "en": "Employment contract"}',
   '{"ar": "عقد عمل متوافق مع قانون العمل المصري لموظف أو أكثر.", "en": "An employment contract compliant with Egyptian labour law for one or more employees."}',
   '{"ar": "٣ أيام عمل", "en": "3 business days"}', 'fixed', 180000, null, 'published', true, 3, now()),
  ('20000000-0000-4000-8000-000000000004', 'company-formation', 'standard', '10000000-0000-4000-8000-000000000002',
   '{"ar": "المساعدة في تأسيس شركة", "en": "Company formation assistance"}',
   '{"ar": "إرشاد ومساعدة في اختيار الكيان القانوني وإعداد مستندات التأسيس.", "en": "Guidance on choosing the legal entity and preparing incorporation documents."}',
   '{"ar": "يحدد بعد المراجعة", "en": "Set after review"}', 'quote', 800000, null, 'published', false, 4, now()),
  ('20000000-0000-4000-8000-000000000005', 'lease-agreement', 'standard', '10000000-0000-4000-8000-000000000001',
   '{"ar": "عقد إيجار", "en": "Lease agreement"}',
   '{"ar": "عقد إيجار سكني أو تجاري يحفظ حقوق المؤجر والمستأجر.", "en": "A residential or commercial lease protecting both landlord and tenant."}',
   '{"ar": "يوما عمل", "en": "2 business days"}', 'fixed', 120000, null, 'published', true, 5, now()),
  ('20000000-0000-4000-8000-000000000006', 'legal-notice', 'standard', '10000000-0000-4000-8000-000000000001',
   '{"ar": "إنذار قانوني", "en": "Legal notice"}',
   '{"ar": "صياغة إنذار رسمي للمطالبة بحق أو إثبات واقعة قبل اتخاذ إجراء قضائي.", "en": "A formal notice to claim a right or record a fact before legal action."}',
   '{"ar": "يوم عمل واحد", "en": "1 business day"}', 'fixed', 90000, null, 'published', false, 6, now()),
  ('20000000-0000-4000-8000-000000000007', 'written-consultation', 'written_consultation', '10000000-0000-4000-8000-000000000003',
   '{"ar": "استشارة قانونية كتابية", "en": "Written legal consultation"}',
   '{"ar": "اشرح مسألتك وأرفق مستنداتك، واستلم ردًا مكتوبًا مفصلًا داخل حسابك.", "en": "Describe your matter, attach documents and receive a detailed written answer in your account."}',
   '{"ar": "خلال ٤٨ ساعة عمل", "en": "Within 48 business hours"}', 'fixed', 75000, null, 'published', true, 7, now()),
  ('20000000-0000-4000-8000-000000000008', 'video-consultation', 'video_consultation', '10000000-0000-4000-8000-000000000003',
   '{"ar": "استشارة عبر اجتماع مرئي", "en": "Video consultation"}',
   '{"ar": "اجتماع مدته ٣٠ دقيقة بالضبط مع محامٍ عبر Google Meet في موعد تختاره.", "en": "A 30-minute Google Meet session with a lawyer at a time you choose."}',
   '{"ar": "٣٠ دقيقة", "en": "30 minutes"}', 'fixed', 100000, 30, 'published', true, 8, now()),
  ('20000000-0000-4000-8000-000000000009', 'company-governance', 'standard', '10000000-0000-4000-8000-000000000002',
   '{"ar": "لائحة داخلية للشركة", "en": "Company internal regulations"}',
   '{"ar": "إعداد لائحة تنظيم داخلي للموارد البشرية والجزاءات.", "en": "Internal HR and disciplinary regulations for your company."}',
   '{"ar": "٧ أيام عمل", "en": "7 business days"}', 'fixed', 450000, null, 'draft', false, 9, null);

insert into public.service_category_links (service_id, category_id) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002');

insert into public.service_addons (service_id, title, price_minor, sort_order) values
  ('20000000-0000-4000-8000-000000000001', '{"ar": "نسخة باللغة الإنجليزية", "en": "English version"}', 120000, 1),
  ('20000000-0000-4000-8000-000000000001', '{"ar": "تسليم عاجل خلال ٤٨ ساعة", "en": "Express delivery within 48 hours"}', 80000, 2),
  ('20000000-0000-4000-8000-000000000002', '{"ar": "تسليم عاجل خلال ٢٤ ساعة", "en": "Express delivery within 24 hours"}', 60000, 1),
  ('20000000-0000-4000-8000-000000000007', '{"ar": "سؤالا متابعة إضافيان", "en": "Two extra follow-up questions"}', 30000, 1);

-- ---------------------------------------------------------------------
-- Page sections (content per docs/database-schema.md)
-- ---------------------------------------------------------------------
-- contract-drafting
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000001', 'about', 1, true, '{"ar": "نصيغ لك عقدًا متكاملًا وفق القانون المصري يعكس اتفاقك بدقة، بدءًا من تعريف الأطراف وحتى بنود الإنهاء وفض النزاعات. يمكنك متابعة كل مرحلة واستلام المسودة النهائية داخل حسابك.", "en": "We draft a complete contract under Egyptian law that reflects your agreement precisely, from defining the parties to termination and dispute-resolution clauses. Follow every stage and receive the final draft in your account."}'),
  ('20000000-0000-4000-8000-000000000001', 'who', 2, true, '[{"ar": "أصحاب الأعمال الذين يبرمون عقود توريد أو خدمات", "en": "Business owners entering supply or service agreements"}, {"ar": "الشركاء المؤسسون عند تنظيم علاقة شراكة", "en": "Co-founders formalising a partnership"}, {"ar": "الأفراد عند بيع أو شراء أصل ذي قيمة", "en": "Individuals buying or selling a valuable asset"}]'),
  ('20000000-0000-4000-8000-000000000001', 'included', 3, true, '[{"ar": "جلسة فهم متطلبات عبر الرسائل", "en": "Requirements discussion via messages"}, {"ar": "صياغة كاملة للعقد باللغة العربية", "en": "Full contract drafting in Arabic"}, {"ar": "مراجعة واحدة مجانية بعد التسليم", "en": "One free revision after delivery"}, {"ar": "ملاحظات توضيحية على البنود الجوهرية", "en": "Explanatory notes on key clauses"}]'),
  ('20000000-0000-4000-8000-000000000001', 'deliverables', 4, true, '[{"ar": "ملف العقد بصيغة Word قابل للتعديل", "en": "Editable Word contract file"}, {"ar": "نسخة PDF جاهزة للتوقيع", "en": "Signature-ready PDF"}, {"ar": "مذكرة مختصرة بأهم البنود", "en": "Short memo on the main clauses"}]'),
  ('20000000-0000-4000-8000-000000000001', 'docs', 5, true, '[{"ar": "بيانات الأطراف (الاسم، الرقم القومي أو السجل التجاري)", "en": "Party details (name, national ID or commercial register)"}, {"ar": "أي مراسلات أو عروض أسعار سابقة", "en": "Any previous correspondence or quotations"}, {"ar": "نسخة من عقد سابق إن وجد", "en": "A previous contract, if any"}]'),
  ('20000000-0000-4000-8000-000000000001', 'steps', 6, true, '[{"ar": "تعبئة نموذج الطلب ورفع المستندات", "en": "Fill in the request form and upload documents"}, {"ar": "الدفع الآمن", "en": "Secure payment"}, {"ar": "مراجعة المحامي وطلب أي توضيحات", "en": "Lawyer review and clarifications"}, {"ar": "استلام المسودة داخل حسابك", "en": "Receive the draft in your account"}, {"ar": "قبول العقد أو طلب تعديل", "en": "Accept the contract or request a revision"}]'),
  ('20000000-0000-4000-8000-000000000001', 'duration', 7, true, null),
  ('20000000-0000-4000-8000-000000000001', 'pricing', 8, true, null),
  ('20000000-0000-4000-8000-000000000001', 'faq', 9, true, '[{"q": {"ar": "هل يمكنني طلب تعديل بعد التسليم؟", "en": "Can I request a revision after delivery?"}, "a": {"ar": "نعم، تشمل الخدمة مراجعة واحدة مجانية خلال ١٤ يومًا من التسليم.", "en": "Yes, one free revision within 14 days of delivery is included."}}, {"q": {"ar": "هل يُصاغ العقد بالإنجليزية؟", "en": "Can the contract be drafted in English?"}, "a": {"ar": "يمكن إضافة نسخة إنجليزية كخدمة إضافية عند الطلب.", "en": "An English version can be added as an optional extra."}}, {"q": {"ar": "هل يشمل السعر التوثيق في الشهر العقاري؟", "en": "Does the price include notarisation?"}, "a": {"ar": "لا، الخدمة تشمل الصياغة فقط. يمكن طلب المساعدة في التوثيق كخدمة منفصلة.", "en": "No, the service covers drafting only. Notarisation help is a separate service."}}]'),
  ('20000000-0000-4000-8000-000000000001', 'reviews', 10, true, null);

-- contract-review
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000002', 'about', 1, true, '{"ar": "نقرأ العقد المرسل إليك قبل التوقيع ونحدد البنود التي قد تضر بمصلحتك، مع صياغة بديلة مقترحة لكل بند.", "en": "We read the contract you were sent before you sign and flag clauses that may harm you, with a suggested alternative wording for each."}'),
  ('20000000-0000-4000-8000-000000000002', 'included', 2, true, '[{"ar": "قراءة كاملة للعقد حتى ٢٠ صفحة", "en": "Full read of contracts up to 20 pages"}, {"ar": "تعليقات على كل بند جوهري", "en": "Comments on every material clause"}, {"ar": "صياغة بديلة مقترحة", "en": "Suggested alternative wording"}]'),
  ('20000000-0000-4000-8000-000000000002', 'deliverables', 3, true, '[{"ar": "نسخة من العقد بتعليقات المحامي", "en": "The contract annotated by the lawyer"}, {"ar": "تقرير مخاطر مختصر", "en": "Short risk report"}]'),
  ('20000000-0000-4000-8000-000000000002', 'steps', 4, false, '[]'),
  ('20000000-0000-4000-8000-000000000002', 'duration', 5, true, null),
  ('20000000-0000-4000-8000-000000000002', 'pricing', 6, true, null),
  ('20000000-0000-4000-8000-000000000002', 'faq', 7, true, '[{"q": {"ar": "ماذا لو كان العقد أطول من ٢٠ صفحة؟", "en": "What if the contract is longer than 20 pages?"}, "a": {"ar": "يتم تحديد سعر إضافي بعد الاطلاع على العقد وقبل البدء.", "en": "An additional price is agreed after reviewing the contract and before starting."}}]'),
  ('20000000-0000-4000-8000-000000000002', 'reviews', 8, true, null);

-- employment-contract
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000003', 'about', 1, true, '{"ar": "نعد عقد عمل يحدد الأجر والمهام وساعات العمل والإجازات وشروط الإنهاء، بما يتوافق مع قانون العمل.", "en": "We prepare an employment contract setting pay, duties, working hours, leave and termination terms in line with labour law."}'),
  ('20000000-0000-4000-8000-000000000003', 'who', 2, true, '[{"ar": "الشركات الناشئة عند تعيين أول موظفين", "en": "Start-ups hiring their first employees"}, {"ar": "الشركات التي تحدّث نماذج عقودها", "en": "Companies updating their contract templates"}]'),
  ('20000000-0000-4000-8000-000000000003', 'included', 3, true, '[{"ar": "نموذج عقد قابل لإعادة الاستخدام", "en": "Reusable contract template"}, {"ar": "بند السرية وعدم الإفصاح", "en": "Confidentiality and non-disclosure clause"}]'),
  ('20000000-0000-4000-8000-000000000003', 'deliverables', 4, true, '[{"ar": "عقد عمل بصيغة Word وPDF", "en": "Employment contract in Word and PDF"}]'),
  ('20000000-0000-4000-8000-000000000003', 'pricing', 5, true, null),
  ('20000000-0000-4000-8000-000000000003', 'reviews', 6, true, null);

-- company-formation (quote)
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000004', 'about', 1, true, '{"ar": "نساعدك في المفاضلة بين أشكال الشركات المتاحة وإعداد عقد التأسيس والمستندات المطلوبة للتقديم.", "en": "We help you compare the available company forms and prepare the articles and filing documents."}'),
  ('20000000-0000-4000-8000-000000000004', 'who', 2, true, '[{"ar": "رواد الأعمال قبل بدء النشاط", "en": "Entrepreneurs before starting their activity"}, {"ar": "الشركاء الراغبون في تحويل الكيان القانوني", "en": "Partners converting their legal entity"}]'),
  ('20000000-0000-4000-8000-000000000004', 'included', 3, true, '[{"ar": "استشارة حول الشكل القانوني الأنسب", "en": "Advice on the most suitable legal form"}, {"ar": "إعداد عقد التأسيس", "en": "Drafting the articles of incorporation"}, {"ar": "قائمة بالمستندات والخطوات", "en": "Checklist of documents and steps"}]'),
  ('20000000-0000-4000-8000-000000000004', 'docs', 4, true, '[{"ar": "صور بطاقات الشركاء", "en": "Partners'' ID copies"}, {"ar": "الاسم التجاري المقترح", "en": "Proposed trade name"}, {"ar": "بيان النشاط ورأس المال", "en": "Activity and capital statement"}]'),
  ('20000000-0000-4000-8000-000000000004', 'steps', 5, true, '[{"ar": "تعبئة النموذج", "en": "Fill in the form"}, {"ar": "استلام عرض سعر نهائي", "en": "Receive a final quote"}, {"ar": "الدفع وبدء التنفيذ", "en": "Pay and start"}]'),
  ('20000000-0000-4000-8000-000000000004', 'pricing', 6, true, null),
  ('20000000-0000-4000-8000-000000000004', 'faq', 7, true, '[{"q": {"ar": "لماذا السعر يبدأ من ٨٬٠٠٠ ج.م؟", "en": "Why does the price start from EGP 8,000?"}, "a": {"ar": "يختلف الجهد حسب نوع الشركة وعدد الشركاء، ويصلك عرض سعر نهائي قبل الدفع.", "en": "Effort depends on the company type and number of partners; you receive a final quote before paying."}}]');

-- lease-agreement
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000005', 'about', 1, true, '{"ar": "عقد إيجار واضح يحدد القيمة الإيجارية والمدة والتأمين والصيانة وحالات الإخلاء.", "en": "A clear lease setting rent, term, deposit, maintenance and eviction cases."}'),
  ('20000000-0000-4000-8000-000000000005', 'included', 2, true, '[{"ar": "صياغة عقد إيجار كامل", "en": "Full lease drafting"}, {"ar": "ملحق باستلام العين وحالتها", "en": "Hand-over and condition annex"}]'),
  ('20000000-0000-4000-8000-000000000005', 'docs', 3, true, '[{"ar": "بيانات المؤجر والمستأجر", "en": "Landlord and tenant details"}, {"ar": "عنوان العين ووصفها", "en": "Property address and description"}]'),
  ('20000000-0000-4000-8000-000000000005', 'duration', 4, true, null),
  ('20000000-0000-4000-8000-000000000005', 'pricing', 5, true, null),
  ('20000000-0000-4000-8000-000000000005', 'reviews', 6, true, null);

-- legal-notice
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000006', 'about', 1, true, '{"ar": "نصيغ إنذارًا قانونيًا واضحًا بلغة رسمية، جاهزًا للإعلان عبر المحضرين.", "en": "We draft a clear, formal legal notice ready to be served by a bailiff."}'),
  ('20000000-0000-4000-8000-000000000006', 'deliverables', 2, true, '[{"ar": "نص الإنذار بصيغة PDF وWord", "en": "Notice text in PDF and Word"}]'),
  ('20000000-0000-4000-8000-000000000006', 'docs', 3, true, '[{"ar": "بيانات المُنذَر إليه وعنوانه", "en": "Recipient details and address"}, {"ar": "المستندات المثبتة للحق", "en": "Documents proving the claim"}]'),
  ('20000000-0000-4000-8000-000000000006', 'pricing', 4, true, null),
  ('20000000-0000-4000-8000-000000000006', 'faq', 5, true, '[{"q": {"ar": "هل تشمل الخدمة الإعلان عبر المحضر؟", "en": "Does the service include service by a bailiff?"}, "a": {"ar": "لا، تشمل الخدمة الصياغة. يمكن مساعدتك في الإعلان كخدمة منفصلة.", "en": "No, it covers drafting. Help with service of the notice is available separately."}}]');

-- written-consultation
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000007', 'about', 1, true, '{"ar": "استشارة مكتوبة يعدها محامٍ بعد قراءة وصفك ومستنداتك، تتضمن التكييف القانوني للمسألة والخيارات المتاحة لك.", "en": "A written opinion prepared by a lawyer after reading your description and documents, covering the legal characterisation and your options."}'),
  ('20000000-0000-4000-8000-000000000007', 'included', 2, true, '[{"ar": "رد مكتوب مفصل", "en": "Detailed written answer"}, {"ar": "سؤال متابعة واحد خلال ٧ أيام", "en": "One follow-up question within 7 days"}]'),
  ('20000000-0000-4000-8000-000000000007', 'steps', 3, true, '[{"ar": "اشرح المسألة وأرفق الملفات", "en": "Describe the matter and attach files"}, {"ar": "ادفع رسوم الاستشارة", "en": "Pay the consultation fee"}, {"ar": "تابع حالة الطلب", "en": "Track the request"}, {"ar": "اقرأ الرد بأمان داخل حسابك", "en": "Read the answer securely in your account"}]'),
  ('20000000-0000-4000-8000-000000000007', 'duration', 4, true, null),
  ('20000000-0000-4000-8000-000000000007', 'pricing', 5, true, null),
  ('20000000-0000-4000-8000-000000000007', 'faq', 6, true, '[{"q": {"ar": "هل الرد سري؟", "en": "Is the answer confidential?"}, "a": {"ar": "نعم، يظهر الرد داخل حسابك فقط ولا يُرسل عبر البريد الإلكتروني.", "en": "Yes, the answer is shown only in your account and is never sent by email."}}]'),
  ('20000000-0000-4000-8000-000000000007', 'reviews', 7, true, null);

-- video-consultation
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000008', 'about', 1, true, '{"ar": "اختر موعدًا متاحًا، واشرح ما تود مناقشته، وسيضيف المحامي رابط الاجتماع في حسابك قبل الموعد.", "en": "Pick an available time, describe what you want to discuss, and the lawyer will add the meeting link to your account before the appointment."}'),
  ('20000000-0000-4000-8000-000000000008', 'included', 2, true, '[{"ar": "اجتماع مرئي مدته ٣٠ دقيقة", "en": "30-minute video meeting"}, {"ar": "ملخص مكتوب مختصر بعد الاجتماع", "en": "Short written summary after the meeting"}]'),
  ('20000000-0000-4000-8000-000000000008', 'steps', 3, true, '[{"ar": "اختر اليوم والوقت", "en": "Choose the day and time"}, {"ar": "أضف سياق الاجتماع والملفات", "en": "Add context and files"}, {"ar": "ادفع رسوم الاستشارة", "en": "Pay the consultation fee"}, {"ar": "استلم رابط الاجتماع في حسابك", "en": "Get the meeting link in your account"}]'),
  ('20000000-0000-4000-8000-000000000008', 'pricing', 4, true, null),
  ('20000000-0000-4000-8000-000000000008', 'faq', 5, true, '[{"q": {"ar": "متى يظهر رابط الاجتماع؟", "en": "When does the meeting link appear?"}, "a": {"ar": "يضيف المحامي الرابط يدويًا قبل الموعد، وستصلك إشارة داخل المنصة فور إضافته.", "en": "The lawyer adds it manually before the appointment and you are notified in the platform as soon as it is added."}}, {"q": {"ar": "هل يمكن إعادة الجدولة؟", "en": "Can I reschedule?"}, "a": {"ar": "نعم، حتى ٢٤ ساعة قبل الموعد من صفحة الموعد.", "en": "Yes, up to 24 hours before the appointment from the appointment page."}}]'),
  ('20000000-0000-4000-8000-000000000008', 'reviews', 6, true, null);

-- company-governance (draft)
insert into public.service_sections (service_id, key, sort_order, is_enabled, content) values
  ('20000000-0000-4000-8000-000000000009', 'about', 1, true, '{"ar": "لائحة داخلية متوافقة مع قانون العمل.", "en": "Internal regulations compliant with labour law."}'),
  ('20000000-0000-4000-8000-000000000009', 'pricing', 2, true, null);

-- ---------------------------------------------------------------------
-- Form versions (field schema: shared/domain/formSchema.ts)
-- ---------------------------------------------------------------------
insert into public.service_form_versions (id, service_id, version, status, fields, published_at) values
('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 'published', '[
  {"id": "parties_heading", "type": "section", "label": {"ar": "بيانات الأطراف", "en": "Parties"}, "help": {"ar": "أدخل الأسماء كما ستظهر في العقد.", "en": "Enter names exactly as they should appear in the contract."}},
  {"id": "party_one", "type": "text", "label": {"ar": "اسم الطرف الأول", "en": "First party name"}, "placeholder": {"ar": "شخص أو شركة", "en": "Person or company"}, "required": true, "maxLength": 160},
  {"id": "party_two", "type": "text", "label": {"ar": "اسم الطرف الثاني", "en": "Second party name"}, "placeholder": {"ar": "شخص أو شركة", "en": "Person or company"}, "required": true, "maxLength": 160},
  {"id": "contract_type", "type": "select", "label": {"ar": "نوع العقد", "en": "Contract type"}, "placeholder": {"ar": "اختر نوع العقد", "en": "Choose a contract type"}, "required": true, "options": [
    {"value": "supply", "label": {"ar": "عقد توريد", "en": "Supply contract"}},
    {"value": "services", "label": {"ar": "عقد تقديم خدمات", "en": "Services contract"}},
    {"value": "partnership", "label": {"ar": "عقد شراكة", "en": "Partnership contract"}},
    {"value": "sale", "label": {"ar": "عقد بيع", "en": "Sale contract"}},
    {"value": "other", "label": {"ar": "أخرى", "en": "Other"}}]},
  {"id": "language", "type": "radio", "label": {"ar": "لغة العقد", "en": "Contract language"}, "required": true, "options": [
    {"value": "ar", "label": {"ar": "العربية", "en": "Arabic"}},
    {"value": "ar_en", "label": {"ar": "العربية والإنجليزية", "en": "Arabic and English"}}]},
  {"id": "details_heading", "type": "section", "label": {"ar": "تفاصيل الاتفاق", "en": "Agreement details"}},
  {"id": "description", "type": "textarea", "label": {"ar": "وصف موضوع العقد", "en": "Describe the contract"}, "placeholder": {"ar": "ما الذي سيقدمه كل طرف؟ وما المدة وشروط الدفع؟", "en": "What does each party provide? What are the term and payment terms?"}, "help": {"ar": "٣٠ حرفًا على الأقل.", "en": "At least 30 characters."}, "required": true, "minLength": 30, "maxLength": 4000},
  {"id": "value", "type": "number", "label": {"ar": "القيمة التقريبية للعقد (ج.م)", "en": "Approximate contract value (EGP)"}, "placeholder": {"ar": "اختياري", "en": "Optional"}, "min": 0},
  {"id": "start_date", "type": "date", "label": {"ar": "تاريخ البدء المتوقع", "en": "Expected start date"}},
  {"id": "clauses", "type": "checkbox", "label": {"ar": "بنود إضافية مطلوبة", "en": "Additional clauses"}, "options": [
    {"value": "nda", "label": {"ar": "السرية وعدم الإفصاح", "en": "Confidentiality / NDA"}},
    {"value": "non_compete", "label": {"ar": "عدم المنافسة", "en": "Non-compete"}},
    {"value": "arbitration", "label": {"ar": "التحكيم", "en": "Arbitration"}},
    {"value": "penalty", "label": {"ar": "الشرط الجزائي", "en": "Penalty clause"}}]},
  {"id": "files", "type": "file", "label": {"ar": "مستندات داعمة", "en": "Supporting documents"}, "help": {"ar": "عروض أسعار، مراسلات، أو عقود سابقة.", "en": "Quotations, correspondence or previous contracts."}, "accept": ["pdf", "docx", "jpg", "png"], "maxSizeMb": 10, "maxFiles": 5}
]', now()),
('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 1, 'published', '[
  {"id": "contract_type", "type": "select", "label": {"ar": "نوع العقد", "en": "Contract type"}, "placeholder": {"ar": "اختر نوع العقد", "en": "Choose a contract type"}, "required": true, "options": [
    {"value": "employment", "label": {"ar": "عقد عمل", "en": "Employment contract"}},
    {"value": "supply", "label": {"ar": "عقد توريد", "en": "Supply contract"}},
    {"value": "lease", "label": {"ar": "عقد إيجار", "en": "Lease"}},
    {"value": "other", "label": {"ar": "أخرى", "en": "Other"}}]},
  {"id": "pages", "type": "number", "label": {"ar": "عدد الصفحات", "en": "Number of pages"}, "required": true, "min": 1, "max": 200},
  {"id": "concerns", "type": "textarea", "label": {"ar": "ما الذي يقلقك في العقد؟", "en": "What concerns you about the contract?"}, "required": true, "minLength": 20, "maxLength": 4000},
  {"id": "contract_file", "type": "file", "label": {"ar": "ملف العقد", "en": "Contract file"}, "required": true, "accept": ["pdf", "docx"], "maxSizeMb": 10, "maxFiles": 2}
]', now()),
('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 1, 'published', '[
  {"id": "employees", "type": "number", "label": {"ar": "عدد الموظفين", "en": "Number of employees"}, "required": true, "min": 1, "max": 10000},
  {"id": "term", "type": "radio", "label": {"ar": "نوع التعاقد", "en": "Contract term"}, "required": true, "options": [
    {"value": "fixed", "label": {"ar": "محدد المدة", "en": "Fixed term"}},
    {"value": "open", "label": {"ar": "غير محدد المدة", "en": "Open-ended"}}]},
  {"id": "description", "type": "textarea", "label": {"ar": "صف الوظيفة والمزايا", "en": "Describe the role and benefits"}, "required": true, "minLength": 20, "maxLength": 4000},
  {"id": "files", "type": "file", "label": {"ar": "مستندات", "en": "Documents"}, "accept": ["pdf", "docx", "jpg", "png"], "maxSizeMb": 10, "maxFiles": 5}
]', now()),
('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 1, 'published', '[
  {"id": "entity", "type": "select", "label": {"ar": "الشكل القانوني المقترح", "en": "Proposed legal form"}, "required": true, "placeholder": {"ar": "اختر", "en": "Choose"}, "options": [
    {"value": "llc", "label": {"ar": "شركة ذات مسؤولية محدودة", "en": "Limited liability company"}},
    {"value": "jsc", "label": {"ar": "شركة مساهمة", "en": "Joint-stock company"}},
    {"value": "sole", "label": {"ar": "شركة الشخص الواحد", "en": "Single-member company"}},
    {"value": "unsure", "label": {"ar": "لست متأكدًا", "en": "Not sure"}}]},
  {"id": "partners", "type": "number", "label": {"ar": "عدد الشركاء", "en": "Number of partners"}, "required": true, "min": 1, "max": 100},
  {"id": "description", "type": "textarea", "label": {"ar": "صف النشاط ورأس المال", "en": "Describe the activity and capital"}, "required": true, "minLength": 20, "maxLength": 4000},
  {"id": "files", "type": "file", "label": {"ar": "صور بطاقات الشركاء", "en": "Partners'' ID copies"}, "accept": ["pdf", "jpg", "png"], "maxSizeMb": 10, "maxFiles": 10}
]', now()),
('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', 1, 'published', '[
  {"id": "lease_type", "type": "radio", "label": {"ar": "نوع الإيجار", "en": "Lease type"}, "required": true, "options": [
    {"value": "residential", "label": {"ar": "سكني", "en": "Residential"}},
    {"value": "commercial", "label": {"ar": "تجاري", "en": "Commercial"}}]},
  {"id": "landlord", "type": "text", "label": {"ar": "اسم المؤجر", "en": "Landlord name"}, "required": true, "maxLength": 160},
  {"id": "tenant", "type": "text", "label": {"ar": "اسم المستأجر", "en": "Tenant name"}, "required": true, "maxLength": 160},
  {"id": "address", "type": "textarea", "label": {"ar": "عنوان العين ووصفها", "en": "Property address and description"}, "required": true, "minLength": 10, "maxLength": 2000},
  {"id": "rent", "type": "number", "label": {"ar": "القيمة الإيجارية الشهرية (ج.م)", "en": "Monthly rent (EGP)"}, "required": true, "min": 1},
  {"id": "start_date", "type": "date", "label": {"ar": "تاريخ بداية الإيجار", "en": "Lease start date"}, "required": true},
  {"id": "files", "type": "file", "label": {"ar": "مستندات", "en": "Documents"}, "accept": ["pdf", "jpg", "png"], "maxSizeMb": 10, "maxFiles": 5}
]', now()),
('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', 1, 'published', '[
  {"id": "subject", "type": "select", "label": {"ar": "موضوع الإنذار", "en": "Subject of the notice"}, "required": true, "placeholder": {"ar": "اختر", "en": "Choose"}, "options": [
    {"value": "payment", "label": {"ar": "المطالبة بمبلغ مستحق", "en": "Claiming an amount due"}},
    {"value": "eviction", "label": {"ar": "إخلاء عين مؤجرة", "en": "Vacating a leased property"}},
    {"value": "breach", "label": {"ar": "الإخلال بالتزام تعاقدي", "en": "Breach of contract"}},
    {"value": "other", "label": {"ar": "أخرى", "en": "Other"}}]},
  {"id": "recipient", "type": "text", "label": {"ar": "اسم المُنذَر إليه", "en": "Recipient name"}, "required": true, "maxLength": 160},
  {"id": "facts", "type": "textarea", "label": {"ar": "الوقائع", "en": "Facts"}, "required": true, "minLength": 30, "maxLength": 4000},
  {"id": "files", "type": "file", "label": {"ar": "المستندات المثبتة", "en": "Supporting evidence"}, "accept": ["pdf", "jpg", "png"], "maxSizeMb": 10, "maxFiles": 5}
]', now()),
('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', 1, 'published', '[
  {"id": "area", "type": "select", "label": {"ar": "مجال المسألة", "en": "Area of law"}, "required": true, "placeholder": {"ar": "اختر المجال", "en": "Choose an area"}, "options": [
    {"value": "family", "label": {"ar": "أحوال شخصية", "en": "Family law"}},
    {"value": "labour", "label": {"ar": "علاقات عمل", "en": "Employment"}},
    {"value": "contracts", "label": {"ar": "عقود ومعاملات", "en": "Contracts and transactions"}},
    {"value": "companies", "label": {"ar": "شركات", "en": "Companies"}},
    {"value": "real_estate", "label": {"ar": "عقارات وإيجارات", "en": "Real estate and leases"}},
    {"value": "other", "label": {"ar": "أخرى", "en": "Other"}}]},
  {"id": "title", "type": "text", "label": {"ar": "عنوان مختصر للمسألة", "en": "Short title"}, "placeholder": {"ar": "مثال: تأخر المالك في رد التأمين", "en": "e.g. Landlord is late returning the deposit"}, "required": true, "maxLength": 140},
  {"id": "description", "type": "textarea", "label": {"ar": "اشرح المسألة بالتفصيل", "en": "Describe the matter in detail"}, "placeholder": {"ar": "ما الذي حدث؟ ومتى؟ وما الذي تريد معرفته؟", "en": "What happened? When? What do you want to know?"}, "help": {"ar": "كلما كان الوصف أوضح كان الرد أدق. ٥٠ حرفًا على الأقل.", "en": "The clearer the description, the more precise the answer. At least 50 characters."}, "required": true, "minLength": 50, "maxLength": 6000},
  {"id": "dispute", "type": "radio", "label": {"ar": "هل يوجد نزاع قضائي قائم؟", "en": "Is there an ongoing court case?"}, "required": true, "options": [
    {"value": "yes", "label": {"ar": "نعم", "en": "Yes"}},
    {"value": "no", "label": {"ar": "لا", "en": "No"}},
    {"value": "unsure", "label": {"ar": "لست متأكدًا", "en": "Not sure"}}]},
  {"id": "files", "type": "file", "label": {"ar": "مرفقات", "en": "Attachments"}, "accept": ["pdf", "docx", "jpg", "png"], "maxSizeMb": 10, "maxFiles": 5}
]', now()),
('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000008', 1, 'published', '[
  {"id": "topics", "type": "multiselect", "label": {"ar": "محاور الاجتماع", "en": "Meeting topics"}, "required": true, "options": [
    {"value": "contracts", "label": {"ar": "عقود", "en": "Contracts"}},
    {"value": "labour", "label": {"ar": "علاقات عمل", "en": "Employment"}},
    {"value": "company", "label": {"ar": "تأسيس شركة", "en": "Company formation"}},
    {"value": "real_estate", "label": {"ar": "عقارات", "en": "Real estate"}},
    {"value": "family", "label": {"ar": "أحوال شخصية", "en": "Family law"}},
    {"value": "dispute", "label": {"ar": "نزاع قائم", "en": "Ongoing dispute"}}]},
  {"id": "description", "type": "textarea", "label": {"ar": "ما الذي تود مناقشته؟", "en": "What would you like to discuss?"}, "placeholder": {"ar": "اكتب ملخصًا يساعد المحامي على التحضير للاجتماع.", "en": "Write a summary to help the lawyer prepare."}, "required": true, "minLength": 20, "maxLength": 4000},
  {"id": "files", "type": "file", "label": {"ar": "ملفات داعمة", "en": "Supporting files"}, "accept": ["pdf", "docx", "jpg", "png"], "maxSizeMb": 10, "maxFiles": 3}
]', now()),
('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000009', 1, 'draft', '[
  {"id": "employees", "type": "number", "label": {"ar": "عدد الموظفين", "en": "Number of employees"}, "required": true, "min": 1},
  {"id": "description", "type": "textarea", "label": {"ar": "صف ما تحتاجه", "en": "Describe what you need"}, "required": true, "minLength": 20}
]', null);

update public.services s
   set published_form_version_id = v.id
  from public.service_form_versions v
 where v.service_id = s.id and v.status = 'published';

-- ---------------------------------------------------------------------
-- FAQ and content
-- ---------------------------------------------------------------------
insert into public.faq_entries (group_key, group_title, question, answer, sort_order, show_on_home) values
  ('ordering', '{"ar": "الطلب والدفع", "en": "Ordering and payment"}', '{"ar": "متى أدفع؟", "en": "When do I pay?"}', '{"ar": "بعد تعبئة نموذج الخدمة ومراجعة بياناتك. للخدمات حسب العرض، تدفع بعد استلام عرض السعر النهائي.", "en": "After filling in the service form and reviewing your details. For quote-based services you pay after receiving the final quote."}', 1, true),
  ('ordering', '{"ar": "الطلب والدفع", "en": "Ordering and payment"}', '{"ar": "ما وسائل الدفع المتاحة؟", "en": "Which payment methods are available?"}', '{"ar": "البطاقات البنكية والمحافظ الإلكترونية وفوري.", "en": "Bank cards, mobile wallets and Fawry."}', 2, true),
  ('ordering', '{"ar": "الطلب والدفع", "en": "Ordering and payment"}', '{"ar": "هل يمكنني استرداد المبلغ؟", "en": "Can I get a refund?"}', '{"ar": "يمكن إلغاء الطلب واسترداد المبلغ قبل بدء التنفيذ. بعد البدء يُحدد الاسترداد حسب ما أُنجز.", "en": "You can cancel and be refunded before work starts. After that, refunds depend on the work done."}', 3, true),
  ('delivery', '{"ar": "التسليم والتعديل", "en": "Delivery and revisions"}', '{"ar": "أين أستلم المستندات؟", "en": "Where do I receive documents?"}', '{"ar": "داخل حسابك فقط، في صفحة الطلب، مع سجل بكل إصدار وتاريخ تسليمه.", "en": "Only in your account, on the order page, with a history of every version and its delivery date."}', 4, false),
  ('delivery', '{"ar": "التسليم والتعديل", "en": "Delivery and revisions"}', '{"ar": "كيف أطلب تعديلًا؟", "en": "How do I request a revision?"}', '{"ar": "من صفحة الطلب بعد التسليم، اضغط «طلب تعديل» واكتب ملاحظاتك.", "en": "From the order page after delivery, press “Request a revision” and write your notes."}', 5, false),
  ('consultations', '{"ar": "الاستشارات", "en": "Consultations"}', '{"ar": "ما الفرق بين الاستشارة الكتابية والمرئية؟", "en": "What is the difference between written and video consultations?"}', '{"ar": "الكتابية رد مكتوب مفصل خلال ٤٨ ساعة عمل، والمرئية اجتماع مدته ٣٠ دقيقة بالضبط عبر Google Meet.", "en": "Written is a detailed answer within 48 business hours; video is a 30-minute Google Meet session."}', 6, true),
  ('consultations', '{"ar": "الاستشارات", "en": "Consultations"}', '{"ar": "متى يصلني رابط الاجتماع؟", "en": "When do I get the meeting link?"}', '{"ar": "يضيفه المحامي يدويًا قبل الموعد ويظهر في صفحة الموعد داخل حسابك مع إشعار.", "en": "The lawyer adds it manually before the appointment; it appears on the appointment page with a notification."}', 7, false);

insert into public.content_pages (slug, title, body) values
  ('about', '{"ar": "عقودي — منصة العقود والخدمات القانونية المصرية", "en": "Oqoudi — the Egyptian contracts and legal services platform"}', '{
    "paragraphs": [
      {"ar": "نقدم خدمات قانونية للأفراد والشركات في مصر عبر منصة رقمية واحدة: تعرف السعر والمدة قبل الطلب، وتتابع عمل المحامي، وتستلم مستنداتك في حسابك الخاص.", "en": "We provide legal services to individuals and companies in Egypt through one digital platform: know the price and timeline before ordering, follow the lawyer’s work and receive your documents in your private account."},
      {"ar": "نؤمن بأن الوضوح جزء من الخدمة القانونية. لذلك نعرض ما تشمله كل خدمة، وما المطلوب منك، ومتى تتوقع التسليم.", "en": "We believe clarity is part of legal service. That is why we show what each service includes, what we need from you and when to expect delivery."}
    ],
    "values": [
      {"title": {"ar": "الوضوح قبل الطلب", "en": "Clarity before ordering"}, "text": {"ar": "لكل خدمة صفحة توضح نطاقها وسعرها ومدتها والمستندات المطلوبة.", "en": "Every service has a page explaining its scope, price, timeline and required documents."}},
      {"title": {"ar": "السرية", "en": "Confidentiality"}, "text": {"ar": "مستنداتك ورسائلك متاحة لك وللمحامي المكلف بطلبك فقط.", "en": "Your documents and messages are visible only to you and the lawyer assigned to your order."}},
      {"title": {"ar": "متابعة مستمرة", "en": "Continuous tracking"}, "text": {"ar": "سجل زمني لكل طلب يوضح ما تم وما الخطوة التالية.", "en": "Every order has a timeline showing what happened and what comes next."}}
    ]
  }');

-- ---------------------------------------------------------------------
-- Consultation calendar: Sat–Wed 10:00–16:00, Thu 10:00–14:00 (Cairo)
-- weekday: 0 = Sunday … 6 = Saturday
-- ---------------------------------------------------------------------
insert into public.availability_rules (lawyer_id, weekday, start_time, end_time) values
  (null, 6, '10:00', '16:00'),
  (null, 0, '10:00', '16:00'),
  (null, 1, '10:00', '16:00'),
  (null, 2, '10:00', '16:00'),
  (null, 3, '10:00', '16:00'),
  (null, 4, '10:00', '14:00');

-- ---------------------------------------------------------------------
-- Demo accounts (LOCAL ONLY). Password for all: Oqoudi123
-- ---------------------------------------------------------------------
do $$
declare
  v_users jsonb := '[
    {"id": "00000000-0000-4000-a000-000000000001", "email": "admin@oqoudi.test",  "meta": {"full_name": "مدير المنصة", "account_type": "individual", "phone": "+201000000001"}},
    {"id": "00000000-0000-4000-a000-000000000002", "email": "karim@oqoudi.test",  "meta": {"full_name": "كريم حلمي", "account_type": "individual", "phone": "+201000000002"}},
    {"id": "00000000-0000-4000-a000-000000000003", "email": "sara@oqoudi.test",   "meta": {"full_name": "سارة منصور", "account_type": "individual", "phone": "+201000000003"}},
    {"id": "00000000-0000-4000-a000-000000000011", "email": "ahmed@oqoudi.test",  "meta": {"full_name": "أحمد سامي عبد الله", "account_type": "individual", "phone": "+201001234567"}},
    {"id": "00000000-0000-4000-a000-000000000012", "email": "mona@oqoudi.test",   "meta": {"full_name": "منى حسن", "account_type": "individual", "phone": "+201112348890"}},
    {"id": "00000000-0000-4000-a000-000000000013", "email": "nile@oqoudi.test",   "meta": {"full_name": "يوسف عادل", "account_type": "company", "company_name": "شركة نيل للحلول التقنية", "phone": "+201225550198"}}
  ]';
  v_user jsonb;
begin
  for v_user in select * from jsonb_array_elements(v_users)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', (v_user ->> 'id')::uuid, 'authenticated', 'authenticated',
      v_user ->> 'email', extensions.crypt('Oqoudi123', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}', v_user -> 'meta', now(), now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), (v_user ->> 'id')::uuid, v_user ->> 'id',
      jsonb_build_object('sub', v_user ->> 'id', 'email', v_user ->> 'email', 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

insert into public.user_roles (user_id, role) values
  ('00000000-0000-4000-a000-000000000001', 'admin'),
  ('00000000-0000-4000-a000-000000000002', 'lawyer'),
  ('00000000-0000-4000-a000-000000000003', 'lawyer');

insert into public.lawyer_profiles (user_id, display_name, title) values
  ('00000000-0000-4000-a000-000000000002', 'أ. كريم حلمي', 'محامٍ بالنقض'),
  ('00000000-0000-4000-a000-000000000003', 'أ. سارة منصور', 'محامية استئناف');

update public.platform_settings
   set value = '{"lawyer_id": "00000000-0000-4000-a000-000000000002"}'
 where key = 'assignment.default_lawyer';
