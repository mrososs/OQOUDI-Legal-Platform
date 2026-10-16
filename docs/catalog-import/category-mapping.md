# Category architecture and existing-catalog mapping

## Design (smallest compatible change)

- `service_categories.parent_id` (nullable, two levels only, guarded by a trigger). The three top-level categories — **Individuals**, **Companies**, **Legal Consultations** — are unchanged and no sub-category was created under consultations.
- A contract’s `primary_category_id` is its **sub-category**; a trigger keeps the parent linked in `service_category_links`, so the existing top-level filter (`categoryIds.includes(top.id)`) and the new sub-category filter are both exact.
- No duplicate category records (unique slug; verified by an integration test). Icons are whitelisted by a CHECK constraint (`service_categories_icon_check`).
- URLs: `/services/:category` and `/services/:category/:sub` (a sub-category under the wrong parent is a 404); contract pages stay `/service/:slug`.

## Individuals — 8 sub-categories, 32 contracts

| # | Sub-category (AR) | English | Slug | Icon | Contracts |
|---|---|---|---|---|---|
| 1 | عقارات وبيع | Real Estate & Sales | `real-estate-sales` | home | 3 |
| 2 | إيجارات | Leases | `rentals` | key | 4 |
| 3 | الأحوال الشخصية والأسرة | Family & Personal Status | `family-and-personal-status` | users | 7 |
| 4 | العقود الرياضية والأكاديميات | Sports Contracts & Academies | `sports-contracts-and-academies` | trophy | 6 |
| 5 | العقود المدنية والتسويات | Civil Contracts & Settlements | `civil-contracts-and-settlements` | handshake | 7 |
| 6 | سيارات ومنقولات | Vehicles & Movables | `vehicles-and-movables` | car | 2 |
| 7 | تشطيبات ومقاولات | Finishing & Contracting | `finishing-and-contracting` | hammer | 2 |
| 8 | خدمات شخصية ومهنية | Personal & Professional Services | `personal-and-professional-services` | sparkles | 1 |

### عقارات وبيع (3) — `/services/individuals/real-estate-sales`

| Ref | Contract | Slug |
|---|---|---|
| IND-001 | عقد بيع شقة سكنية (ابتدائي / نهائي) | `residential-apartment-sale-contract` |
| IND-002 | عقد بيع قطعة أرض مباني | `building-land-plot-sale-contract` |
| IND-003 | عقد بيع أرض زراعية | `agricultural-land-sale-contract` |

### إيجارات (4) — `/services/individuals/rentals`

| Ref | Contract | Slug |
|---|---|---|
| IND-004 | عقد إيجار شقة سكنية (قانون جديد) | `lease-agreement` |
| IND-005 | عقد إيجار شقة مفروشة (مع قائمة جرد) | `furnished-apartment-lease-with-inventory-contract` |
| IND-006 | عقد إيجار محل تجاري | `commercial-shop-lease-contract` |
| IND-007 | عقد إيجار عيادة / مكتب مهني / مخزن | `clinic-office-storage-lease-contract` |

### الأحوال الشخصية والأسرة (7) — `/services/individuals/family-and-personal-status`

| Ref | Contract | Slug |
|---|---|---|
| IND-008 | اتفاقية طلاق بالتراضي وتسوية شاملة | `mutual-consent-divorce-settlement-agreement` |
| IND-009 | عقد اتفاق على الخلع الرضائي والتنازل | `consensual-khul-and-waiver-agreement` |
| IND-010 | عقد اتفاق ودي على نفقة صغار وأجر مسكن | `child-maintenance-and-housing-rent-agreement` |
| IND-011 | اتفاقية تنظيم رؤية واستضافة الصغار | `child-visitation-and-hosting-agreement` |
| IND-012 | قائمة أعيان جهاز ومنقولات زوجية محكمة | `marital-movables-inventory-contract` |
| IND-013 | عقد قسمة رضائية للتركة (فرز وتجنيب) | `consensual-estate-partition-contract` |
| IND-014 | عقد تخارج وتنازل عن حصة ميراثية | `inheritance-share-waiver-contract` |

### العقود الرياضية والأكاديميات (6) — `/services/individuals/sports-contracts-and-academies`

| Ref | Contract | Slug |
|---|---|---|
| IND-015 | عقد اشتراك وتدريب شاب/ناشئ في أكاديمية رياضية | `sports-academy-youth-subscription-contract` |
| IND-016 | عقد رعاية وتطوير موهبة رياضية شابة (للناشئين) | `young-athlete-talent-sponsorship-contract` |
| IND-017 | عقد اتفاق مع مدرب خاص (Personal Trainer / Coach) | `personal-trainer-contract` |
| IND-018 | إقرار وموافقة ولي أمر على معسكر أو بطولة رياضية لقاصر | `guardian-consent-minor-sports-camp-agreement` |
| IND-019 | عقد تسويق رياضي وتمثيل لاعب شاب (مع ولي الأمر) | `young-player-sports-marketing-and-representation-contract` |
| IND-020 | عقد تأجير ملعب لتدريبات أكاديمية أو دورة شبابية | `sports-field-lease-for-academy-training-contract` |

### العقود المدنية والتسويات (7) — `/services/individuals/civil-contracts-and-settlements`

| Ref | Contract | Slug |
|---|---|---|
| IND-021 | عقد اتفاق وتسوية مديونية وجدولة سداد | `debt-settlement-and-payment-schedule-agreement` |
| IND-022 | عقد صلح وتسوية ودية لإنهاء نزاع والتنازل عن محاضر | `amicable-settlement-and-report-waiver-agreement` |
| IND-023 | عقد وديعة وأمانة (حفظ أموال أو منقولات) | `deposit-and-trust-custody-contract` |
| IND-024 | عقد هبة رسمية (عقار / منقول / مبالغ مالية) | `formal-gift-of-property-or-cash-contract` |
| IND-025 | عقد عارية استعمال (إعارة منقولات أو معدات) | `equipment-loan-for-use-contract` |
| IND-026 | عقد كفالة شخصية / تضامنية لضمان التزام | `personal-and-joint-suretyship-contract` |
| IND-027 | إقرار استلام نقدية ومخالصة نهائية وإبراء ذمة | `cash-receipt-final-discharge-and-release-agreement` |

### سيارات ومنقولات (2) — `/services/individuals/vehicles-and-movables`

| Ref | Contract | Slug |
|---|---|---|
| IND-028 | عقد بيع سيارة ملاكي | `private-car-sale-contract` |
| IND-029 | عقد بيع دراجة نارية (موتوسيكل / سكوتر) | `motorcycle-and-scooter-sale-contract` |

### تشطيبات ومقاولات (2) — `/services/individuals/finishing-and-contracting`

| Ref | Contract | Slug |
|---|---|---|
| IND-030 | عقد مقاولة وتشطيب وحدة سكنية | `residential-unit-finishing-works-contract` |
| IND-031 | عقد توريد وتركيب مطبخ / دريسنج / ألوميتال | `kitchen-dressing-aluminum-supply-and-installation-contract` |

### خدمات شخصية ومهنية (1) — `/services/individuals/personal-and-professional-services`

| Ref | Contract | Slug |
|---|---|---|
| IND-032 | عقد تنظيم حفل زفاف / خطوبة / مناسبة | `wedding-engagement-event-organization-contract` |

## Companies — 9 sub-categories, 32 contracts

| # | Sub-category (AR) | English | Slug | Icon | Contracts |
|---|---|---|---|---|---|
| 1 | التأسيس والشراكات | Formation & Partnerships | `company-formation-and-partnerships` | landmark | 5 |
| 2 | الموارد البشرية والعمل | HR & Employment | `hr-and-employment` | users | 5 |
| 3 | اللوائح الداخلية للشركات | Internal Company Regulations | `internal-company-regulations` | book-open | 5 |
| 4 | العقود التجارية والعمليات | Commercial Contracts & Operations | `commercial-contracts-and-operations` | package | 7 |
| 5 | التكنولوجيا والبرمجيات | Technology & Software | `technology-and-software` | cpu | 3 |
| 6 | عقود التجارة الإلكترونية | E-Commerce Contracts | `e-commerce-contracts` | shopping-cart | 2 |
| 7 | حماية الأعمال والملكية الفكرية | Business Protection & Intellectual Property | `business-protection-and-ip` | shield | 2 |
| 8 | التسويق والإعلام | Marketing & Media | `marketing-and-media` | megaphone | 2 |
| 9 | العقود الاستشارية والمهنية | Advisory & Professional Contracts | `advisory-and-professional-contracts` | briefcase | 1 |

### التأسيس والشراكات (5) — `/services/companies/company-formation-and-partnerships`

| Ref | Contract | Slug |
|---|---|---|
| CO-001 | عقد شراكة وتأسيس مشروع تجاري (تضامن / توصية / محاصة) | `commercial-partnership-formation-agreement` |
| CO-002 | اتفاقية المساهمين والشركاء (Shareholders Agreement - SHA) | `shareholders-agreement` |
| CO-003 | عقد بيع وتنازل عن حصص أو أسهم في شركة (Share Transfer) | `company-share-transfer-agreement` |
| CO-004 | عقد استثمار وتمويل شركة ناشئة (Investment Agreement) | `startup-investment-financing-agreement` |
| CO-005 | عقد تخارج شريك وتصفية نصيبه بالتراضي (Partner Exit) | `partner-exit-settlement-agreement` |

### الموارد البشرية والعمل (5) — `/services/companies/hr-and-employment`

| Ref | Contract | Slug |
|---|---|---|
| CO-006 | عقد عمل فردي (متوافق مع قانون العمل رقم 14 لسنة 2025) | `employment-contract` |
| CO-007 | عقد عمل للمديرين التنفيذيين والمناصب القيادية (Executive Contract) | `executive-employment-contract` |
| CO-008 | عقد عمل بدوام جزئي أو ساعات مرنة (Part-Time Contract) | `part-time-employment-contract` |
| CO-009 | عقد عمل عن بُعد (Remote Work Agreement) | `remote-work-agreement` |
| CO-010 | عقد عمل حر / مستشار مستقل (Freelance / Independent Contractor) | `freelance-independent-contractor-agreement` |

### اللوائح الداخلية للشركات (5) — `/services/companies/internal-company-regulations`

| Ref | Contract | Slug |
|---|---|---|
| CO-011 | اللائحة الداخلية لتنظيم العمل والموارد البشرية (HR Policy) | `company-governance` |
| CO-012 | لائحة الجزاءات التأديبية والتحقيقات الداخلية | `disciplinary-penalties-investigations-regulation` |
| CO-013 | لائحة الأجور والعمولات والحوافز ومكافآت المبيعات | `wages-commissions-incentives-regulation` |
| CO-014 | لائحة المشتريات والمخازن والعهد الشخصية والمالية | `procurement-warehouses-custody-regulation` |
| CO-015 | لائحة استخدام أجهزة الشركة وأمن المعلومات (IT & Data Security Policy) | `it-data-security-policy` |

### العقود التجارية والعمليات (7) — `/services/companies/commercial-contracts-and-operations`

| Ref | Contract | Slug |
|---|---|---|
| CO-016 | عقد توريد بضائع ومنتجات (Supply Agreement) | `goods-supply-agreement` |
| CO-017 | عقد وكالة تجارية أو توزيع معتمد (Distribution Agreement) | `commercial-agency-and-authorized-distribution-agreement` |
| CO-018 | عقد امتياز تجاري - فرنشايز (Franchise Agreement) | `commercial-franchise-agreement` |
| CO-019 | عقد وساطة تجارية وسمسرة بعمولة (Commission Agreement) | `commercial-brokerage-and-commission-agreement` |
| CO-020 | عقد تصنيع لدى الغير للعلامات الخاصة (White Label / OEM) | `white-label-oem-contract-manufacturing-agreement` |
| CO-021 | عقد نقل وشحن بضائع وخدمات لوجستية (Shipping & Logistics) | `goods-transport-shipping-and-logistics-services-contract` |
| CO-022 | عقد شراكة وإدارة وتشغيل أكاديمية رياضية أو جيم | `sports-academy-or-gym-partnership-and-operation-contract` |

### التكنولوجيا والبرمجيات (3) — `/services/companies/technology-and-software`

| Ref | Contract | Slug |
|---|---|---|
| CO-023 | عقد تصميم وتطوير موقع إلكتروني / تطبيق موبايل | `website-and-mobile-app-design-development-contract` |
| CO-024 | اتفاقية مستوى الخدمة والدعم الفني (Service Level Agreement - SLA) | `service-level-agreement-sla-technical-support` |
| CO-025 | عقد ترخيص استخدام برمجيات أو نظام سحابي (SaaS / Software License) | `saas-and-software-license-agreement` |

### عقود التجارة الإلكترونية (2) — `/services/companies/e-commerce-contracts`

| Ref | Contract | Slug |
|---|---|---|
| CO-026 | الشروط والأحكام وسياسة الاسترجاع للمواقع والمنصات (Terms & Conditions) | `website-and-platform-terms-and-conditions-policy` |
| CO-027 | سياسة الخصوصية وحماية البيانات للمواقع والتطبيقات (Privacy Policy) | `website-and-app-privacy-and-data-protection-policy` |

### حماية الأعمال والملكية الفكرية (2) — `/services/companies/business-protection-and-ip`

| Ref | Contract | Slug |
|---|---|---|
| CO-028 | اتفاقية عدم إفشاء الأسرار والمعلومات السرية (NDA) | `confidentiality-non-disclosure-agreement-nda` |
| CO-029 | اتفاقية عدم المنافسة وعدم استقطاب العملاء والموظفين (Non-Compete) | `non-compete-and-non-solicitation-agreement` |

### التسويق والإعلام (2) — `/services/companies/marketing-and-media`

| Ref | Contract | Slug |
|---|---|---|
| CO-030 | عقد إدارة حسابات التواصل الاجتماعي والتسويق الرقمي | `social-media-management-and-digital-marketing-contract` |
| CO-031 | عقد التعاون الإعلاني مع المؤثرين وصناع المحتوى (Influencer Agreement) | `influencer-advertising-collaboration-contract` |

### العقود الاستشارية والمهنية (1) — `/services/companies/advisory-and-professional-contracts`

| Ref | Contract | Slug |
|---|---|---|
| CO-032 | عقد تقديم خدمات استشارية دورية للشركات (Retainer Agreement) | `recurring-advisory-services-retainer-agreement` |

## Existing services → decision

Explicit mapping of the 9 services that existed before the 64-contract import. Nothing is deleted or archived automatically; historical orders keep their service id, form version and price snapshot.

| Existing service | Decision | Contract | Reason / open question |
|---|---|---|---|
| `employment-contract` | **Reuse / update** | CO-006 | Same offering: an employment contract for a company (existing price EGP 1,800 equals the client's original price for «عقد عمل فردي»). The record keeps its id and slug, receives the client's name, description, price and a NEW published form version; orders placed against form v1 keep referencing v1. **Needs confirmation:** The old service described «one or more employees»; the client's contract is the individual employment contract. |
| `lease-agreement` | **Reuse / update** | IND-004 | Same offering as the residential lease (existing price EGP 1,200 equals the client's original price). Keeps id/slug; new published form version. The previous «residential or commercial» scope is now served by IND-006 (shop) and IND-007 (clinic/office/warehouse). **Needs confirmation:** Scope narrowed from «residential or commercial» to residential. |
| `company-governance` | **Reuse / update** | CO-011 | Draft, never published, no orders. Same offering as the HR internal regulation (HR + disciplinary regulations). Keeps id/slug and is published with the client's data. **Needs confirmation:** Existing draft price EGP 4,500 is replaced by the client's EGP 4,000; the disciplinary part is also sold separately as CO-012. |
| `contract-drafting` | Retain unchanged | — | Generic custom-contract drafting; the 64-contract catalog has no «custom contract» entry. Unchanged (including its seed add-ons), not launch-eligible. |
| `contract-review` | Retain unchanged | — | Review of an existing contract — not part of the client's 64 drafting contracts. Unchanged, not launch-eligible. |
| `company-formation` | Retain unchanged | — | Quote-based company-formation assistance (legal-form advice and incorporation documents) differs from CO-001, which drafts a partnership/founding contract. Unchanged. **Needs confirmation:** Potential overlap with CO-001 «عقد شراكة وتأسيس مشروع تجاري»: decide whether to keep both, or archive this one. |
| `legal-notice` | Retain unchanged | — | Legal notices are not in the client's catalog. Unchanged (used by existing e2e/integration tests). |
| `written-consultation` | Retain unchanged | — | Consultation service — explicitly out of scope. Unchanged. |
| `video-consultation` | Retain unchanged | — | Consultation service — explicitly out of scope. Unchanged. |

### Totals

- Contracts in the catalog: **64** — **61 new** services created, **3 existing** services matched and updated in place (same id/slug; old form versions retired, never edited or deleted).
- Existing services retained unchanged: **6** (3 generic: `contract-drafting`, `contract-review`, `company-formation` plus `legal-notice`, and the 2 consultation services).
- Archived or deleted automatically: **0**. Potential duplicates needing a decision: see "Needs confirmation" above (lease scope, employment scope, governance price, formation overlap).

