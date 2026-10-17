export const DOC_CONTENT = {
  fa: {
    title: "AvatarPuppet چگونه کار می‌کند؟",
    intro:
      "این پروژه دو موتور بینایی ماشین دارد که خروجی‌شان مستقیماً به اسکلت و چهره‌ی یک آواتار سه‌بعدی وصل می‌شود. همه‌چیز on-device و داخل مرورگر شما اجرا می‌شود و هیچ فریمی از دوربین نمایش داده یا ارسال نمی‌شود.",
    sections: [
      { heading: "۱) ردیابی دست — MediaPipe Hand Landmarker", blocks: [
        { type: "p", text: "مدل Hand Landmarker از خانواده‌ی MediaPipe (متن‌باز، محصول Google Research) در دو مرحله کار می‌کند: BlazePalm Detector ناحیه‌ی دست را پیدا می‌کند و مدل لندمارک، ۲۱ نقطه‌ی سه‌بعدی از مچ تا نوک انگشتان استخراج می‌کند. مدل با WebAssembly اجرا می‌شود و در صورت پشتیبانی، روی GPU." },
      ]},
      { heading: "۲) طبقه‌بندی ژست — الگوریتم هندسی", blocks: [
        { type: "p", text: "تبدیل ۲۱ نقطه به یکی از ده ژست ✊ ✋ ☝️ ✌️ 👍 👎 👌 🤘 🤟 🤙 با شبکه‌ی عصبی انجام نمی‌شود؛ یک الگوریتم هندسی اختصاصی، باز/بسته بودن هر انگشت را از نسبت فاصله‌ی نوک انگشت تا مچ نسبت به اندازه‌ی کف می‌سنجد." },
      ]},
      { heading: "۳) پایداری زمانی", blocks: [
        { type: "p", text: "نتیجه‌ی ۵ فریم آخر رأی‌گیری اکثریت می‌شود و هر ژست باید حدود ۰/۷ ثانیه پایدار بماند تا فعال شود — تا آواتار از لرزش تشخیص نپرد." },
      ]},
      { heading: "۴) تشخیص بای‌بای (Wave)", blocks: [
        { type: "p", text: "وقتی ژست پنجه فعال است، جهت حرکت افقی نوک انگشت اشاره در هر فریم بررسی می‌شود؛ دو بار تغییر علامت سرعت (چپ‌وراست شدن دست) در کمتر از ۱/۲ ثانیه یعنی دست‌زدن — و آواتار موج می‌زند." },
      ]},
      { heading: "۵) ردیابی چهره — MediaPipe Face Landmarker", blocks: [
        { type: "p", text: "این مدل ۴۷۸ لندمارک روی صورت به‌همراه ۵۲ Blendshape (امتیاز جداگانه برای هر حرکت ریز صورت، مانند میزان پلک‌زدن، لبخند و باز شدن فک) استخراج می‌کند — همان مجموعه‌ی ARKit اپل." },
      ]},
      { heading: "۶) تخمین چرخش سر", blocks: [
        { type: "p", text: "زاویه‌ی چرخش سر (Yaw) از موقعیت نوک بینی نسبت به دو گونه، و زاویه‌ی خم شدن سر (Pitch) از فاصله‌ی بینی تا خط ابرو نسبت به ارتفاع صورت محاسبه می‌شود و با محدودیت و میانگین‌گیری نرم روی استخوان Head اعمال می‌گردد." },
      ]},
      { heading: "۷) انیمیشن آواتار", blocks: [
        { type: "p", text: "اسم Blendshapeهای MediaPipe دقیقاً با اسم morph targetهای ARKit داخل فایل آواتار یکی است؛ بنابراین مپ چهره یک‌به‌یک با نام انجام می‌شود: پلک، لبخند، فک و نگاه چشم‌ها به‌صورت زنده کپی می‌شوند. حرکات بدن (بای‌بای، حالت‌های دست، نفس‌کشیدن، پرش هنگام تغییر ژست) به‌صورت procedural با چرخاندن استخوان‌های اسکلت (Mixamo-style) و میان‌یابی نرم Quaternion ساخته می‌شوند — بدون هیچ فایل انیمیشنی." },
      ]},
      { heading: "۸) جدول مدل‌ها", blocks: [
        { type: "table", head: ["مدل / فناوری", "نقش", "لایسنس"], rows: [
          ["MediaPipe Hand Landmarker", "۲۱ لندمارک سه‌بعدی دست", "Apache 2.0"],
          ["Classifier هندسی", "لندمارک‌ها → ۱۰ ژست + Wave", "اختصاصی پروژه"],
          ["MediaPipe Face Landmarker", "۴۷۸ لندمارک + ۵۲ Blendshape", "Apache 2.0"],
          ["three.js / glTF (Ready Player Me)", "رندر و اسکلت آواتار", "MIT"],
        ]},
      ]},
      { heading: "۹) حریم خصوصی", blocks: [
        { type: "list", items: [
          "ویدیوی دوربین هرگز نمایش داده یا جایی ارسال نمی‌شود — فقط ورودی مدل‌هاست.",
          "هیچ تصویری ذخیره نمی‌شود؛ هیچ داده‌ای از این صفحه خارج نمی‌شود.",
          "آواتار فایلی است که خودتان در پوشه‌ی public قرار داده‌اید.",
          "همه‌ی مدل‌ها متن‌باز و رایگان‌اند.",
        ]},
      ]},
    ],
  },
  en: {
    title: "How AvatarPuppet works",
    intro:
      "Two computer-vision engines feed a 3D avatar's skeleton and face in real time. Everything runs on-device inside your browser — the camera feed is never displayed or uploaded.",
    sections: [
      { heading: "1) Hand tracking — MediaPipe Hand Landmarker", blocks: [
        { type: "p", text: "The Hand Landmarker model from Google's open-source MediaPipe family works in two stages: the BlazePalm Detector locates the hand region, then the landmark model extracts 21 3D points from wrist to fingertips. It runs via WebAssembly, offloading to the GPU when available." },
      ]},
      { heading: "2) Gesture classification — geometric", blocks: [
        { type: "p", text: "Turning 21 landmarks into one of ten gestures ✊ ✋ ☝️ ✌️ 👍 👎 👌 🤘 🤟 🤙 is done by a purpose-built geometric algorithm, not a neural network: each finger is measured as extended or curled by the ratio of its tip-to-wrist distance against palm size." },
      ]},
      { heading: "3) Temporal smoothing", blocks: [
        { type: "p", text: "The last 5 frames pass through a majority vote, and a gesture must stay stable for about 0.7 seconds before it activates — so the avatar never twitches from detection noise." },
      ]},
      { heading: "4) Wave detection", blocks: [
        { type: "p", text: "While the open palm is active, the horizontal velocity of the index fingertip is tracked; two sign flips (side-to-side motion) within 1.2 seconds means waving — and the avatar waves back." },
      ]},
      { heading: "5) Face tracking — MediaPipe Face Landmarker", blocks: [
        { type: "p", text: "This model extracts 478 facial landmarks plus 52 Blendshapes — a separate score for every micro-movement such as blink amount, smile, or jaw opening (the same set Apple's ARKit uses)." },
      ]},
      { heading: "6) Head-pose estimation", blocks: [
        { type: "p", text: "Head yaw is estimated from the nose tip's position between the two cheeks, and pitch from the nose-to-brow distance relative to face height. Both are clamped, smoothed, and applied to the Head bone." },
      ]},
      { heading: "7) Avatar animation", blocks: [
        { type: "p", text: "MediaPipe's blendshape names match the ARKit morph targets baked into the avatar file one-to-one, so the face maps by name: blinking, smiling, jaw and eye gaze copy across live. Body motion (waving, poses, breathing, a little hop on gesture change) is procedural — bone rotations on the Mixamo-style skeleton with smooth quaternion interpolation. No animation files involved." },
      ]},
      { heading: "8) Model summary", blocks: [
        { type: "table", head: ["Model / tech", "Role", "License"], rows: [
          ["MediaPipe Hand Landmarker", "21 3D hand landmarks", "Apache 2.0"],
          ["Geometric classifier", "landmarks → 10 gestures + wave", "Project-specific"],
          ["MediaPipe Face Landmarker", "478 landmarks + 52 blendshapes", "Apache 2.0"],
          ["three.js / glTF (Ready Player Me)", "rendering & rig", "MIT"],
        ]},
      ]},
      { heading: "9) Privacy", blocks: [
        { type: "list", items: [
          "The camera feed is never displayed or uploaded — it is model input only.",
          "No image is stored; nothing leaves this page.",
          "The avatar is simply the GLB file you placed in public/ yourself.",
          "All models are open source and free.",
        ]},
      ]},
    ],
  },
}