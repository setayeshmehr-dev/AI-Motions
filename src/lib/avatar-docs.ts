// Avatar-mirror documentation (renamed from documentation.js to avoid
// clashing with GesturePass's lib/documentation.ts).

export const DOC_CONTENT = {
  fa: {
    title: "آینه‌ی آواتار چگونه کار می‌کند؟",
    intro:
      "دو موتور بینایی ماشین، بدن و چهره‌ی شما را به یک آواتار سه‌بعدی منتقل می‌کنند. همه‌چیز on-device و داخل مرورگر شما اجرا می‌شود و هیچ فریمی از دوربین نمایش داده یا ارسال نمی‌شود.",
    sections: [
      { heading: "۱) ردیابی بدن — MediaPipe Pose Landmarker", blocks: [
        { type: "p", text: "مدل Pose Landmarker از خانواده‌ی MediaPipe (متن‌باز، محصول Google Research) ۳۳ لندمارک سه‌بعدی از کل بدن استخراج می‌کند — شونه، آرنج، مچ، باسن، زانو و مچ پا. موقعیت‌های جهانی (World Landmarks) مستقل از موقعیت شما در کادر، جهت واقعی اندام‌ها را می‌دهند و با WebAssembly و در صورت پشتیبانی روی GPU اجرا می‌شوند." },
      ]},
      { heading: "۲) حل‌کننده‌ی بدن (Body Solver)", blocks: [
        { type: "p", text: "لندمارک‌ها با روش هدف‌گیری زنجیره‌ای (Chain Aiming) به چرخش استخوان‌های اسکلت آواتار تبدیل می‌شوند: جهت شونه→آرنج بازو را می‌سازد و آرنج→مچ ساعد را. جهت چرخش تنه از خط شونه‌ها نسبت به خط باسن و خمش تنه از راستای لگن تا شونه محاسبه می‌شود. حالت نشسته با پنهان‌شدن باسن و دیده‌شدن زانوها تشخیص داده می‌شود." },
      ]},
      { heading: "۳) ردیابی چهره — MediaPipe Face Landmarker", blocks: [
        { type: "p", text: "۴۷۸ لندمارک روی صورت به‌همراه ۵۲ Blendshape (امتیاز جداگانه برای هر حرکت ریز صورت: پلک چپ/راست، لبخند، فک، ابروها) استخراج می‌شود — همان مجموعه‌ی ARKit. پلک‌ها به‌صورت مستقل و بدون تأخیر مپ می‌شوند و خماری ندارند؛ لب‌ها با حرف زدن شما هم‌زمان حرکت می‌کنند." },
      ]},
      { heading: "۴) تشخیص ژست دست — الگوریتم هندسی", blocks: [
        { type: "p", text: "مدل Hand Landmarker با ۲۱ نقطه‌ی دست، شکل دست را می‌خواند و الگوریتمی هندسی آن را به یکی از ده ژست (👍 👎 ✌️ 🤟 🤘 ✊ 👌 🤙 ☝️ ✋) تبدیل می‌کند. هر ژست یک «حالتهای احساسی» فعال می‌کند: لبخند، ناراحتی، چشمک، پرش ذوق — بدون دخالت در حرکت دست‌ها که کاملاً بر عهده‌ی آینه‌ی بدن است. بای‌بای (پنجه‌ی باز + تکان افقی) هم جداگانه تشخیص داده می‌شود." },
      ]},
      { heading: "۵) پایداری زمانی", blocks: [
        { type: "p", text: "خروجی مدل‌ها روی ۵ فریم آخر رأی‌گیری اکثریت می‌شود و هر ژست باید حدود ۰/۶ ثانیه پایدار بماند تا فعال شود؛ چرخش استخوان‌ها نیز با میان‌یابی نرم دنبال هدف می‌رود تا حرکت آواتار لرزش نداشته باشد." },
      ]},
      { heading: "۶) جدول مدل‌ها", blocks: [
        { type: "table", head: ["مدل", "نقش", "لایسنس"], rows: [
          ["MediaPipe Pose Landmarker", "۳۳ لندمارک کل بدن", "Apache 2.0"],
          ["MediaPipe Face Landmarker", "۴۷۸ لندمارک + ۵۲ Blendshape", "Apache 2.0"],
          ["MediaPipe Hand Landmarker", "۲۱ لندمارک دست", "Apache 2.0"],
          ["Body Solver هندسی", "لندمارک → چرخش استخوان‌ها", "اختصاصی پروژه"],
          ["three.js / VRM (VRoid)", "رندر و اسکلت آواتار", "MIT"],
        ]},
      ]},
      { heading: "۷) حریم خصوصی", blocks: [
        { type: "list", items: [
          "ویدیوی دوربین هرگز نمایش داده یا جایی ارسال نمی‌شود — فقط ورودی مدل‌هاست.",
          "هیچ تصویری ذخیره نمی‌شود؛ هیچ داده‌ای از این صفحه خارج نمی‌شود.",
          "آواتارها فایل‌هایی هستند که خودتان در پوشه‌ی public قرار داده‌اید.",
          "همه‌ی مدل‌ها متن‌باز و رایگان‌اند.",
        ]},
      ]},
    ],
  },
  en: {
    title: "How the avatar mirror works",
    intro:
      "Two computer-vision engines drive a 3D avatar with your body and face. Everything runs on-device inside your browser — the camera feed is never displayed or uploaded.",
    sections: [
      { heading: "1) Body tracking — MediaPipe Pose Landmarker", blocks: [
        { type: "p", text: "The Pose Landmarker model from Google's open-source MediaPipe family extracts 33 3D landmarks across the whole body — shoulders, elbows, wrists, hips, knees and ankles. World landmarks give true limb directions regardless of where you stand in the frame; execution is WebAssembly with GPU offload when available." },
      ]},
      { heading: "2) The body solver", blocks: [
        { type: "p", text: "Landmarks become avatar bone rotations through chain aiming: the shoulder→elbow direction aims the upper arm, elbow→wrist aims the forearm. Torso twist comes from the shoulder line vs the hip line, lean from the hips→shoulders axis. Seated mode is detected when the hips disappear while the knees stay visible." },
      ]},
      { heading: "3) Face tracking — MediaPipe Face Landmarker", blocks: [
        { type: "p", text: "478 facial landmarks plus 52 Blendshapes — a separate score for every micro-movement (per-eye blinks, smile, jaw, brows) — the same set Apple's ARKit uses. Blinks map independently with no lag or sleepiness, and the mouth syncs live as you speak." },
      ]},
      { heading: "4) Hand gestures — geometric classifier", blocks: [
        { type: "p", text: "The Hand Landmarker reads 21 points per hand and a geometric algorithm maps the shape to one of ten gestures (👍 👎 ✌️ 🤟 🤘 ✊ 👌 🤙 ☝️ ✋). Each gesture triggers an emotional mood — a smile, a frown, a wink, a joyful hop — without touching the arms, which stay fully mirrored. Waving (open palm + side-to-side shake) is detected separately." },
      ]},
      { heading: "5) Temporal smoothing", blocks: [
        { type: "p", text: "Model outputs pass through a 5-frame majority vote, gestures must hold ~0.6s to activate, and bone rotations chase their targets with smooth interpolation — so the avatar never jitters." },
      ]},
      { heading: "6) Model summary", blocks: [
        { type: "table", head: ["Model", "Role", "License"], rows: [
          ["MediaPipe Pose Landmarker", "33 whole-body landmarks", "Apache 2.0"],
          ["MediaPipe Face Landmarker", "478 landmarks + 52 blendshapes", "Apache 2.0"],
          ["MediaPipe Hand Landmarker", "21 hand landmarks", "Apache 2.0"],
          ["Geometric body solver", "landmarks → bone rotations", "Project-specific"],
          ["three.js / VRM (VRoid)", "rendering & rig", "MIT"],
        ]},
      ]},
      { heading: "7) Privacy", blocks: [
        { type: "list", items: [
          "The camera feed is never displayed or uploaded — it is model input only.",
          "No image is stored; nothing leaves this page.",
          "The avatars are simply the VRM files you placed in public/ yourself.",
          "All models are open source and free.",
        ]},
      ]},
    ],
  },
}