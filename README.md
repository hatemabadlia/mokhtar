# منصة المخ — واجهة المتعلّم (الدروس)

الجزء الخاص بالطلاب من منصة المخ التعليمية:
تصفّح الدروس حسب المستوى، طلب الوصول لكل فصل (أو وحدة)، وإدخال رمز الوصول لمشاهدة دروس الفيديو.

**بعد تسجيل الدخول** — الدروس والمشاهدة محمية بالمصادقة؛ لا يمكن الوصول إليها إلا لمسجّل الدخول. الوصول لكل فصل/وحدة مبني على رموز تُخزَّن محليًا في `localStorage`.

## التقنيات

- React + Vite
- Firebase SDK v12 (`firebase/app`, `firebase/auth`, `firebase/firestore`)
- React Router v7 — RTL عربي بالكامل
- خطوط: IBM Plex Sans Arabic (النص) + Aref Ruqaa (العناوين)

## التشغيل محليًا

```bash
npm install
npm run dev      # http://localhost:5173

# الإنتاج
npm run build
npm run preview
```

## تدفّق الاستخدام

1. **الصفحة الرئيسية (`/`)** — الصفحة التسويقية (بلا تسجيل دخول).
2. **تسجيل الدخول (`/auth`)** — إنشاء حساب أو دخول.
3. **اختيار السنة/المستوى (`/level`)** — BEM · 1AS · 2AS · BAC.
4. **لوحة التحكم (`/app`)** — تعرض كل الخدمات: الدروس، التقدّم، الحصص المباشرة، الاختبارات، التمارين والامتحانات السابقة، والملف الشخصي.

## المسارات

| المسار | الوصول | الوصف |
|---|---|---|
| `/` | عام | الصفحة الرئيسية التسويقية |
| `/auth` · `/login` · `/signup` | عام | تسجيل الدخول / إنشاء حساب |
| `/level` | مسجّل الدخول | اختيار السنة/المستوى (BEM · 1AS · 2AS · BAC) |
| `/app` | مسجّل الدخول | لوحة التحكم — كل الخدمات |
| `/level/:level` | مسجّل الدخول فقط | دروس المستوى حسب الفصل (أو الوحدة للبكالوريا) |
| `/watch/:id` | مسجّل الدخول فقط | صفحة مشاهدة الدرس (بوابة رمز عند القفل) |

> الدروس والمشاهدة (`/level/:level` و `/watch/:id`) محمية بحارس المصادقة
> (`RequireAuth`): الزائر غير المسجّل يُعاد توجيهه إلى `/auth`.

## اختيار السنة يعمل حتى بدون Firestore

اختيار المستوى **لا يعتمد على الاتصال بالخادم**: الـ `level` يُحفظ فورًا في
`localStorage` (مفتاح `almokh_level_<uid>`) ثم تُزامَن الكتابة مع Firestore
في الخلفية (best-effort). لوظهرت رسالة من SDK مثل
«Could not reach Cloud Firestore backend» فهي تحذير شبكة فقط — لا تمنع
الاختيار، والموقع يستمر بالعمل من التخزين المحلي.

> لضمان حفظ سنة المستخدم على الخادم فعليًا، تأكد في لوحة تحكم Firebase من:
> 1. تفعيل **Cloud Firestore** على المشروع (`sidmokhtar-b6532`) — Firestore → Create database.
> 2. قواعد القراءة/الكتابة تسمح للمصادقين بالوصول إلى `users/{userId}` (قراءة المستخدم لملفه وكتابة اختياره).

## نموذج البيانات (Firestore)

| الحقل | صيغة وثيقة `lessons` |
|---|---|
| `title` / `description` | نص |
| `level` | `4am` / `1as` / `2as` / `bac` |
| `module` | `math` (رياضيات) / `physics` (فيزياء) |
| `trimester` | `t1` / `t2` / `t3` — لغير البكالوريا فقط |
| `unit` | اسم الوحدة — للبكالوريا فقط |
| `videoURL` / `thumbnailURL` | روابط Firebase Storage العامة |
| `createdAt` | Timestamp |

## المجموعات المقروءة/المكتوبة

- **قراءة:** `lessons`
- **قراءة (getDoc بالمعرّف):** `accessCodes`
- **كتابة (addDoc فقط):** `accessRequests`

طلب الوصول المرسل:

- لغير البكالوريا: `{ name, email, level, trimester, status: "pending", createdAt }`
- للبكالوريا: `{ name, email, level, unit, status: "pending", createdAt }`

## آلية الوصول (لكل فصل / وحدة)

الوصول **ليس عامًا** — يُمنَح بالرمز لكل مجموعة على حدة، والمفاتيح المحلية:

- `almokh_unlocked_<level>_<trimester>` (مثال: `almokh_unlocked_4am_t2`)
- `almokh_unlocked_<level>_<unit>` (مثال: `almokh_unlocked_bac_الوحدة الأولى`)

التحقق من الرمز: `getDoc(accessCodes/{CODE_UPPERCASE})` — صالح إذا
`active === true` و (`expiresAt` غير موجود/null أو في المستقبل).

صفحة `/watch/:id` **تعيد التحقق** من مفتاح المجموعة قبل عرض المشغّل.

## متطلبات قواعد Firebase (من جهة العميل)

1. قراءة `lessons` — للجميع.
2. قراءة `accessCodes` (بالوثيقة) — للجميع.
3. إنشاء مستند في `accessRequests` — كتابة عامة دون مصادقة.
4. قراءة عامة من Firebase Storage (روابط الفيديو/الصور بلا رموز).

> ملاحظة: إذا ظهرت `permission-denied` فأخبر فريق الإدارة — **لا تُعدَّل القواعد من هذا المشروع**.

## بنية المشروع (الميزة)

```
src/
├── data/platform.js                 ← التسميات والأدوات
├── firebase/
│   ├── config.js                    ← إعداد Firebase
│   ├── lessonsService.js            ← قراءة الدروس + كتابة الطلبات
│   └── access.js                    ← مفاتيح الوصول + التحقق من الرمز
├── components/RequireAuth.jsx       ← حارس تسجيل الدخول للدروس والمشاهدة
└── components/lessons/
    ├── LevelLessonsPage.jsx         ← /level/:level (بعد تسجيل الدخول)
    ├── WatchLesson.jsx              ← /watch/:id
    ├── GroupSection.jsx / LessonCard.jsx
    ├── RequestModal.jsx / CodeModal.jsx / CodeForm.jsx / Modal.jsx
    └── lessons.css                  ← التنسيق (RTL)
```
