# Pricing validation

All amounts are whole EGP in the workbooks and are stored as **integer piasters** (×100). **Supplied commercial values are stored exactly as written** — nothing was recalculated, rounded or overwritten. Differences from the stated percentages are *reported* here for confirmation.

## Summary

| Check | Result |
|---|---|
| Launch price (col K) = exactly 50% of the original (col J) | ✅ 64 / 64 |
| Arithmetic errors in any supplied total | ✅ none |
| Supplied launch totals (M, P, Q) = launch + supplied add-on fee(s) | ✅ 64 / 64 (VIP), 32 / 32 (bilingual, VIP+bilingual) |
| Individuals: supplied post-promotion total with VIP (N) = original × 1.5 | ✅ 32 / 32 |
| Companies: supplied post-promotion total with bilingual (R) = original × 1.55 | ✅ 32 / 32 |
| **Rounding cases** (percentage gives a half-pound; supplied value is the **truncated** pound) | ⚠️ **17** (1 VIP + 16 bilingual) — see below |
| **Missing rule**: companies have no post-promotion VIP price | ⚠️ 32 contracts — decision needed |
| **Missing rule**: companies have no post-promotion VIP + bilingual combined total | ⚠️ 32 contracts — follows from the line above |

## How prices are stored

- `services.base_price_minor` = column J (original). `services.launch_price_minor` = column K (**stored explicitly**; the 50% is never recomputed). `launch_eligible = true` for the 64 contracts only; consultations and the generic services stay `false` (a DB constraint forbids launch eligibility for non-standard / quote services).
- VIP add-on (`kind = vip_delivery`): launch fee = column L verbatim. Regular fee: **individuals** = supplied total with VIP after the promotion (N) − original (J) (e.g. 3,750 − 2,500 = 1,250); **companies** = **not set** (no supplied value).
- Bilingual add-on (`kind = bilingual_drafting`, companies only): launch fee = column O verbatim; regular fee = supplied total with bilingual after the promotion (R) − original (J) (e.g. 6,200 − 4,000 = 2,200).
- Because the stored parts are the supplied parts, the server-calculated totals reproduce every supplied total exactly: M / P / Q at launch, N / R after the promotion (asserted for all 64 rows by `tests/unit/catalog.test.ts` and, against real orders, by `tests/integration/launch-campaign.test.ts`).

## Rounding cases (supplied values kept — please confirm the policy)

| Ref | Contract | Launch price | Rule | Exact | **Supplied** | If rounded half-up | Difference |
|---|---|---|---|---|---|---|---|
| IND-027 | إقرار استلام نقدية ومخالصة نهائية وإبراء ذمة | 375 | VIP = 50% of launch | 187.5 | **187** | 188 | +1 EGP |
| CO-003 | عقد بيع وتنازل عن حصص أو أسهم في شركة (Share Transfer) | 1,750 | Bilingual = 55% of launch | 962.5 | **962** | 963 | +1 EGP |
| CO-005 | عقد تخارج شريك وتصفية نصيبه بالتراضي (Partner Exit) | 1,750 | Bilingual = 55% of launch | 962.5 | **962** | 963 | +1 EGP |
| CO-009 | عقد عمل عن بُعد (Remote Work Agreement) | 750 | Bilingual = 55% of launch | 412.5 | **412** | 413 | +1 EGP |
| CO-010 | عقد عمل حر / مستشار مستقل (Freelance / Independent Contractor) | 750 | Bilingual = 55% of launch | 412.5 | **412** | 413 | +1 EGP |
| CO-013 | لائحة الأجور والعمولات والحوافز ومكافآت المبيعات | 1,250 | Bilingual = 55% of launch | 687.5 | **687** | 688 | +1 EGP |
| CO-014 | لائحة المشتريات والمخازن والعهد الشخصية والمالية | 1,750 | Bilingual = 55% of launch | 962.5 | **962** | 963 | +1 EGP |
| CO-015 | لائحة استخدام أجهزة الشركة وأمن المعلومات (IT & Data Security Policy) | 1,250 | Bilingual = 55% of launch | 687.5 | **687** | 688 | +1 EGP |
| CO-016 | عقد توريد بضائع ومنتجات (Supply Agreement) | 1,250 | Bilingual = 55% of launch | 687.5 | **687** | 688 | +1 EGP |
| CO-020 | عقد تصنيع لدى الغير للعلامات الخاصة (White Label / OEM) | 1,750 | Bilingual = 55% of launch | 962.5 | **962** | 963 | +1 EGP |
| CO-021 | عقد نقل وشحن بضائع وخدمات لوجستية (Shipping & Logistics) | 1,250 | Bilingual = 55% of launch | 687.5 | **687** | 688 | +1 EGP |
| CO-023 | عقد تصميم وتطوير موقع إلكتروني / تطبيق موبايل | 1,750 | Bilingual = 55% of launch | 962.5 | **962** | 963 | +1 EGP |
| CO-024 | اتفاقية مستوى الخدمة والدعم الفني (Service Level Agreement - SLA) | 1,250 | Bilingual = 55% of launch | 687.5 | **687** | 688 | +1 EGP |
| CO-025 | عقد ترخيص استخدام برمجيات أو نظام سحابي (SaaS / Software License) | 1,250 | Bilingual = 55% of launch | 687.5 | **687** | 688 | +1 EGP |
| CO-026 | الشروط والأحكام وسياسة الاسترجاع للمواقع والمنصات (Terms & Conditions) | 1,250 | Bilingual = 55% of launch | 687.5 | **687** | 688 | +1 EGP |
| CO-028 | اتفاقية عدم إفشاء الأسرار والمعلومات السرية (NDA) | 750 | Bilingual = 55% of launch | 412.5 | **412** | 413 | +1 EGP |
| CO-032 | عقد تقديم خدمات استشارية دورية للشركات (Retainer Agreement) | 1,250 | Bilingual = 55% of launch | 687.5 | **687** | 688 | +1 EGP |

Every supplied value equals the **floor** of the exact amount (truncation). The combined totals (M/P/Q) in the workbook are consistent with those truncated fees, so the checkout total equals the supplied total. **Decision needed:** keep truncation (current), or confirm round-half-up (+1 EGP on 17 add-on prices).

## Unresolved commercial decisions

1. **Companies — VIP delivery after the launch period.** The companies workbook has no post-promotion VIP column or total. No price is invented: for company contracts the VIP add-on has **no regular price**, so it is offered **only while the launch offer is active** (checkout rejects it otherwise). If the client approves the individuals rule (VIP = +50% of the original), the fee is one admin edit per contract in the Service Editor (Pricing tab → add-on regular price).
2. **Companies — VIP + bilingual together after the launch period.** Follows from (1); not supplied, not invented.
3. **Rounding policy** for the 17 half-pound add-on fees (above).
4. **Post-promotion add-on fees are derived as supplied total − original** (e.g. N − J, R − J). These are exact subtractions of two supplied values, not new numbers — confirm that this reading of columns N and R is correct.

## Per-contract table (EGP)

| Ref | Contract | Original (J) | Launch (K) | VIP launch (L) | Total VIP launch (M) | VIP regular fee | Bilingual launch (O) | Bilingual regular fee | Total bilingual launch (P) | Total VIP+bilingual launch (Q) | Findings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| IND-001 | عقد بيع شقة سكنية (ابتدائي / نهائي) | 2,500 | 1,250 | 625 | 1,875 | 1,250 | n/a | n/a | n/a | n/a | ✅ |
| IND-002 | عقد بيع قطعة أرض مباني | 3,000 | 1,500 | 750 | 2,250 | 1,500 | n/a | n/a | n/a | n/a | ✅ |
| IND-003 | عقد بيع أرض زراعية | 3,000 | 1,500 | 750 | 2,250 | 1,500 | n/a | n/a | n/a | n/a | ✅ |
| IND-004 | عقد إيجار شقة سكنية (قانون جديد) | 1,200 | 600 | 300 | 900 | 600 | n/a | n/a | n/a | n/a | ✅ |
| IND-005 | عقد إيجار شقة مفروشة (مع قائمة جرد) | 1,500 | 750 | 375 | 1,125 | 750 | n/a | n/a | n/a | n/a | ✅ |
| IND-006 | عقد إيجار محل تجاري | 2,000 | 1,000 | 500 | 1,500 | 1,000 | n/a | n/a | n/a | n/a | ✅ |
| IND-007 | عقد إيجار عيادة / مكتب مهني / مخزن | 1,800 | 900 | 450 | 1,350 | 900 | n/a | n/a | n/a | n/a | ✅ |
| IND-008 | اتفاقية طلاق بالتراضي وتسوية شاملة | 2,500 | 1,250 | 625 | 1,875 | 1,250 | n/a | n/a | n/a | n/a | ✅ |
| IND-009 | عقد اتفاق على الخلع الرضائي والتنازل | 2,000 | 1,000 | 500 | 1,500 | 1,000 | n/a | n/a | n/a | n/a | ✅ |
| IND-010 | عقد اتفاق ودي على نفقة صغار وأجر مسكن | 1,500 | 750 | 375 | 1,125 | 750 | n/a | n/a | n/a | n/a | ✅ |
| IND-011 | اتفاقية تنظيم رؤية واستضافة الصغار | 1,500 | 750 | 375 | 1,125 | 750 | n/a | n/a | n/a | n/a | ✅ |
| IND-012 | قائمة أعيان جهاز ومنقولات زوجية محكمة | 1,200 | 600 | 300 | 900 | 600 | n/a | n/a | n/a | n/a | ✅ |
| IND-013 | عقد قسمة رضائية للتركة (فرز وتجنيب) | 3,500 | 1,750 | 875 | 2,625 | 1,750 | n/a | n/a | n/a | n/a | ✅ |
| IND-014 | عقد تخارج وتنازل عن حصة ميراثية | 2,000 | 1,000 | 500 | 1,500 | 1,000 | n/a | n/a | n/a | n/a | ✅ |
| IND-015 | عقد اشتراك وتدريب شاب/ناشئ في أكاديمية رياضية | 800 | 400 | 200 | 600 | 400 | n/a | n/a | n/a | n/a | ✅ |
| IND-016 | عقد رعاية وتطوير موهبة رياضية شابة (للناشئين) | 1,500 | 750 | 375 | 1,125 | 750 | n/a | n/a | n/a | n/a | ✅ |
| IND-017 | عقد اتفاق مع مدرب خاص (Personal Trainer / Coach) | 800 | 400 | 200 | 600 | 400 | n/a | n/a | n/a | n/a | ✅ |
| IND-018 | إقرار وموافقة ولي أمر على معسكر أو بطولة رياضية… | 500 | 250 | 125 | 375 | 250 | n/a | n/a | n/a | n/a | ✅ |
| IND-019 | عقد تسويق رياضي وتمثيل لاعب شاب (مع ولي الأمر) | 1,200 | 600 | 300 | 900 | 600 | n/a | n/a | n/a | n/a | ✅ |
| IND-020 | عقد تأجير ملعب لتدريبات أكاديمية أو دورة شبابية | 1,000 | 500 | 250 | 750 | 500 | n/a | n/a | n/a | n/a | ✅ |
| IND-021 | عقد اتفاق وتسوية مديونية وجدولة سداد | 2,000 | 1,000 | 500 | 1,500 | 1,000 | n/a | n/a | n/a | n/a | ✅ |
| IND-022 | عقد صلح وتسوية ودية لإنهاء نزاع والتنازل عن محا… | 2,000 | 1,000 | 500 | 1,500 | 1,000 | n/a | n/a | n/a | n/a | ✅ |
| IND-023 | عقد وديعة وأمانة (حفظ أموال أو منقولات) | 1,000 | 500 | 250 | 750 | 500 | n/a | n/a | n/a | n/a | ✅ |
| IND-024 | عقد هبة رسمية (عقار / منقول / مبالغ مالية) | 1,500 | 750 | 375 | 1,125 | 750 | n/a | n/a | n/a | n/a | ✅ |
| IND-025 | عقد عارية استعمال (إعارة منقولات أو معدات) | 800 | 400 | 200 | 600 | 400 | n/a | n/a | n/a | n/a | ✅ |
| IND-026 | عقد كفالة شخصية / تضامنية لضمان التزام | 1,200 | 600 | 300 | 900 | 600 | n/a | n/a | n/a | n/a | ✅ |
| IND-027 | إقرار استلام نقدية ومخالصة نهائية وإبراء ذمة | 750 | 375 | 187 | 562 | 375 | n/a | n/a | n/a | n/a | vip launch rounding |
| IND-028 | عقد بيع سيارة ملاكي | 1,000 | 500 | 250 | 750 | 500 | n/a | n/a | n/a | n/a | ✅ |
| IND-029 | عقد بيع دراجة نارية (موتوسيكل / سكوتر) | 800 | 400 | 200 | 600 | 400 | n/a | n/a | n/a | n/a | ✅ |
| IND-030 | عقد مقاولة وتشطيب وحدة سكنية | 2,500 | 1,250 | 625 | 1,875 | 1,250 | n/a | n/a | n/a | n/a | ✅ |
| IND-031 | عقد توريد وتركيب مطبخ / دريسنج / ألوميتال | 1,000 | 500 | 250 | 750 | 500 | n/a | n/a | n/a | n/a | ✅ |
| IND-032 | عقد تنظيم حفل زفاف / خطوبة / مناسبة | 1,200 | 600 | 300 | 900 | 600 | n/a | n/a | n/a | n/a | ✅ |
| CO-001 | عقد شراكة وتأسيس مشروع تجاري (تضامن / توصية / م… | 4,000 | 2,000 | 1,000 | 3,000 | **not supplied** | 1,100 | 2,200 | 3,100 | 4,100 | vip regular not supplied; combined regular not supplied |
| CO-002 | اتفاقية المساهمين والشركاء (Shareholders Agreem… | 5,000 | 2,500 | 1,250 | 3,750 | **not supplied** | 1,375 | 2,750 | 3,875 | 5,125 | vip regular not supplied; combined regular not supplied |
| CO-003 | عقد بيع وتنازل عن حصص أو أسهم في شركة (Share Tr… | 3,500 | 1,750 | 875 | 2,625 | **not supplied** | 962 | 1,925 | 2,712 | 3,587 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-004 | عقد استثمار وتمويل شركة ناشئة (Investment Agree… | 5,000 | 2,500 | 1,250 | 3,750 | **not supplied** | 1,375 | 2,750 | 3,875 | 5,125 | vip regular not supplied; combined regular not supplied |
| CO-005 | عقد تخارج شريك وتصفية نصيبه بالتراضي (Partner E… | 3,500 | 1,750 | 875 | 2,625 | **not supplied** | 962 | 1,925 | 2,712 | 3,587 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-006 | عقد عمل فردي (متوافق مع قانون العمل رقم 14 لسنة… | 1,800 | 900 | 450 | 1,350 | **not supplied** | 495 | 990 | 1,395 | 1,845 | vip regular not supplied; combined regular not supplied |
| CO-007 | عقد عمل للمديرين التنفيذيين والمناصب القيادية (… | 3,000 | 1,500 | 750 | 2,250 | **not supplied** | 825 | 1,650 | 2,325 | 3,075 | vip regular not supplied; combined regular not supplied |
| CO-008 | عقد عمل بدوام جزئي أو ساعات مرنة (Part-Time Con… | 1,200 | 600 | 300 | 900 | **not supplied** | 330 | 660 | 930 | 1,230 | vip regular not supplied; combined regular not supplied |
| CO-009 | عقد عمل عن بُعد (Remote Work Agreement) | 1,500 | 750 | 375 | 1,125 | **not supplied** | 412 | 825 | 1,162 | 1,537 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-010 | عقد عمل حر / مستشار مستقل (Freelance / Independ… | 1,500 | 750 | 375 | 1,125 | **not supplied** | 412 | 825 | 1,162 | 1,537 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-011 | اللائحة الداخلية لتنظيم العمل والموارد البشرية … | 4,000 | 2,000 | 1,000 | 3,000 | **not supplied** | 1,100 | 2,200 | 3,100 | 4,100 | vip regular not supplied; combined regular not supplied |
| CO-012 | لائحة الجزاءات التأديبية والتحقيقات الداخلية | 3,000 | 1,500 | 750 | 2,250 | **not supplied** | 825 | 1,650 | 2,325 | 3,075 | vip regular not supplied; combined regular not supplied |
| CO-013 | لائحة الأجور والعمولات والحوافز ومكافآت المبيعات | 2,500 | 1,250 | 625 | 1,875 | **not supplied** | 687 | 1,375 | 1,937 | 2,562 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-014 | لائحة المشتريات والمخازن والعهد الشخصية والمالية | 3,500 | 1,750 | 875 | 2,625 | **not supplied** | 962 | 1,925 | 2,712 | 3,587 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-015 | لائحة استخدام أجهزة الشركة وأمن المعلومات (IT &… | 2,500 | 1,250 | 625 | 1,875 | **not supplied** | 687 | 1,375 | 1,937 | 2,562 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-016 | عقد توريد بضائع ومنتجات (Supply Agreement) | 2,500 | 1,250 | 625 | 1,875 | **not supplied** | 687 | 1,375 | 1,937 | 2,562 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-017 | عقد وكالة تجارية أو توزيع معتمد (Distribution A… | 4,000 | 2,000 | 1,000 | 3,000 | **not supplied** | 1,100 | 2,200 | 3,100 | 4,100 | vip regular not supplied; combined regular not supplied |
| CO-018 | عقد امتياز تجاري - فرنشايز (Franchise Agreement) | 6,000 | 3,000 | 1,500 | 4,500 | **not supplied** | 1,650 | 3,300 | 4,650 | 6,150 | vip regular not supplied; combined regular not supplied |
| CO-019 | عقد وساطة تجارية وسمسرة بعمولة (Commission Agre… | 2,000 | 1,000 | 500 | 1,500 | **not supplied** | 550 | 1,100 | 1,550 | 2,050 | vip regular not supplied; combined regular not supplied |
| CO-020 | عقد تصنيع لدى الغير للعلامات الخاصة (White Labe… | 3,500 | 1,750 | 875 | 2,625 | **not supplied** | 962 | 1,925 | 2,712 | 3,587 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-021 | عقد نقل وشحن بضائع وخدمات لوجستية (Shipping & L… | 2,500 | 1,250 | 625 | 1,875 | **not supplied** | 687 | 1,375 | 1,937 | 2,562 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-022 | عقد شراكة وإدارة وتشغيل أكاديمية رياضية أو جيم | 3,000 | 1,500 | 750 | 2,250 | **not supplied** | 825 | 1,650 | 2,325 | 3,075 | vip regular not supplied; combined regular not supplied |
| CO-023 | عقد تصميم وتطوير موقع إلكتروني / تطبيق موبايل | 3,500 | 1,750 | 875 | 2,625 | **not supplied** | 962 | 1,925 | 2,712 | 3,587 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-024 | اتفاقية مستوى الخدمة والدعم الفني (Service Leve… | 2,500 | 1,250 | 625 | 1,875 | **not supplied** | 687 | 1,375 | 1,937 | 2,562 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-025 | عقد ترخيص استخدام برمجيات أو نظام سحابي (SaaS /… | 2,500 | 1,250 | 625 | 1,875 | **not supplied** | 687 | 1,375 | 1,937 | 2,562 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-026 | الشروط والأحكام وسياسة الاسترجاع للمواقع والمنص… | 2,500 | 1,250 | 625 | 1,875 | **not supplied** | 687 | 1,375 | 1,937 | 2,562 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-027 | سياسة الخصوصية وحماية البيانات للمواقع والتطبيق… | 2,000 | 1,000 | 500 | 1,500 | **not supplied** | 550 | 1,100 | 1,550 | 2,050 | vip regular not supplied; combined regular not supplied |
| CO-028 | اتفاقية عدم إفشاء الأسرار والمعلومات السرية (ND… | 1,500 | 750 | 375 | 1,125 | **not supplied** | 412 | 825 | 1,162 | 1,537 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
| CO-029 | اتفاقية عدم المنافسة وعدم استقطاب العملاء والمو… | 2,000 | 1,000 | 500 | 1,500 | **not supplied** | 550 | 1,100 | 1,550 | 2,050 | vip regular not supplied; combined regular not supplied |
| CO-030 | عقد إدارة حسابات التواصل الاجتماعي والتسويق الر… | 2,000 | 1,000 | 500 | 1,500 | **not supplied** | 550 | 1,100 | 1,550 | 2,050 | vip regular not supplied; combined regular not supplied |
| CO-031 | عقد التعاون الإعلاني مع المؤثرين وصناع المحتوى … | 1,800 | 900 | 450 | 1,350 | **not supplied** | 495 | 990 | 1,395 | 1,845 | vip regular not supplied; combined regular not supplied |
| CO-032 | عقد تقديم خدمات استشارية دورية للشركات (Retaine… | 2,500 | 1,250 | 625 | 1,875 | **not supplied** | 687 | 1,375 | 1,937 | 2,562 | vip regular not supplied; bilingual launch rounding; combined regular not supplied |
