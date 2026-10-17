// Unified documentation — Face ID auth + the avatar mirror.

export const DOC_CONTENT = {
  fa: {
    title: "فناوری‌های پروژه — همه‌ی مدل‌ها",
    intro:
      "این پروژه از چند موتور بینایی ماشینِ متن‌باز ساخته شده: احراز هویت با چهره (Face ID) و آینه‌ی زنده‌ی آواتار (بدن، چهره و دست). همه‌چیز on-device و داخل مرورگر شما اجرا می‌شود و هیچ فریمی از دوربین نمایش داده، ذخیره یا ارسال نمی‌شود.",
    sections: [
      { heading: "بخش اول — احراز هویت 🗝", blocks: [
        { type: "p", text: "این بخش در صفحات ثبت‌نام و ورود فعال است. هویت شما با چهره‌تان تأیید می‌شود — چیزی که «هستید»." },
      ]},

      { heading: "۱) Face ID — تشخیص و زنده‌بودن چهره", blocks: [
        { type: "p", text: "برای Face ID دو مدل با هم کار می‌کنند. اول، مدل Face Landmarker از خانواده‌ی MediaPipe که ۴۷۸ لندمارک روی صورت (شامل عنبیه‌ی چشم‌ها) به‌همراه ۵۲ Blendshape استخراج می‌کند — امتیاز جداگانه برای هر حرکت ریز صورت مانند میزان پلک‌زدن یا لبخند (همان مجموعه‌ای که ARKit اپل استفاده می‌کند)." },
        { type: "p", text: "دوم، برای تطبیق هویت از مدل FaceRecognitionNet (از کتابخانه‌ی متن‌باز face-api با معماری ResNet-34 — یکی از معروف‌ترین شبکه‌های کانولوشنی) استفاده می‌شود که چهره را به یک بردار ۱۲۸ بُعدی تبدیل می‌کند؛ نوعی «امضای عددی» از چهره. هنگام ورود، بردار تازه با بردار ذخیره‌شده‌ی ثبت‌نام از طریق فاصله‌ی اقلیدسی مقایسه می‌شود و اگر فاصله از آستانه کمتر باشد، هویت تأیید می‌شود." },
        { type: "p", text: "برای اینکه عکس چاپ‌شده نتواند جای شما وارد شود، پیش از تطبیق، چالش‌های تصادفیِ زنده‌بودن پرسیده می‌شود: پلک‌زدن (از روی Blendshape چشم‌ها)، چرخاندن سر یا لبخند. تنها پس از موفقیت در چالش‌ها، بردار هویت گرفته و مقایسه می‌شود." },
      ]},

      { heading: "بخش دوم — آینه‌ی آواتار 🪞", blocks: [
        { type: "p", text: "این بخش پس از ورود فعال است: بدن، چهره و دست‌های شما به‌صورت زنده به یک آواتار سه‌بعدی منتقل می‌شوند." },
      ]},

      { heading: "۲) آینه‌ی بدن — MediaPipe Pose Landmarker", blocks: [
        { type: "p", text: "مدل Pose Landmarker با ۳۳ لندمارک سه‌بعدی، کل بدن شما را ردیابی می‌کند — شونه، آرنج، مچ، باسن، زانو و مچ پا. موقعیت‌های جهانی (World Landmarks) جهت واقعی اندام‌ها را مستقل از جای شما در کادر می‌دهند." },
        { type: "p", text: "یک حل‌کننده‌ی هندسی (Body Solver) این نقاط را با روش هدف‌گیری زنجیره‌ای به چرخش استخوان‌های آواتار تبدیل می‌کند: جهت شونه→آرنج بازو را می‌نشاند و آرنج→مچ ساعد را؛ چرخش تنه از مقایسه‌ی خط شونه‌ها با خط لگن و خمش از راستای لگن تا شونه محاسبه می‌شود. حالت نشسته (پنهان‌شدن باسن با دیده‌شدن زانوها) خودکار تشخیص داده می‌شود." },
      ]},

      { heading: "۳) آینه‌ی چهره — ۵۲ Blendshape", blocks: [
        { type: "p", text: "همان مدل Face Landmarker، به‌صورت پیوسته اجرا می‌شود: پلک چپ و راست مستقل از هم و بدون تأخیر مپ می‌شوند (چشمک زدن با یک چشم کار می‌کند!)، لبخند، اخم، ناراحتی و تعجب از ترکیب چند Blendshape تشخیص داده می‌شوند، لب‌ها با حرف زدن شما هم‌زمان باز و بسته می‌شوند و سر آواتار چرخش سر شما را دنبال می‌کند." },
      ]},

      { heading: "۴) ژست‌های احساسی — دست به‌عنوان فرمان", blocks: [
        { type: "p", text: "مدل Hand Landmarker با ۲۱ نقطه‌ی دست، شکل دست را می‌خواند و الگوریتمی هندسی آن را به یکی از ده ژست (👍 👎 ✌️ 🤟 🤘 ✊ 👌 🤙 ☝️ ✋) تبدیل می‌کند. هر ژست یک «حالت احساسی» فعال می‌کند: 👍 لبخند بزرگ و پرش ذوق، 👎 ناراحتی و افتادن سر، ✌️ چشمک و لبخند. این ژست‌ها فقط چهره و واکنش بدن را هدایت می‌کنند و به حرکت دست‌ها دست نمی‌زنند — دست‌ها کاملاً بر عهده‌ی آینه‌ی بدن هستند. بای‌بای هم از خود حرکت شما خوانده می‌شود: پنجه‌ی باز + تکان افقی = لبخند و موج." },
      ]},

      { heading: "۵) رندر سه‌بعدی — three.js و VRM", blocks: [
        { type: "p", text: "آواتارها فایل‌های VRM (خروجی VRoid Studio) هستند که با three.js و افزونه‌ی three-vrm رندر می‌شوند. چرخش استخوان‌ها با میان‌یابی کوآترنیونِ نرم اعمال می‌شود و سیستم هم نسل‌های قدیمی و جدید VRM را تشخیص می‌دهد و جهت ایستادن آواتار را خودکار درست می‌کند." },
      ]},

      { heading: "۶) جدول کامل مدل‌ها", blocks: [
        { type: "table", head: ["مدل / فناوری", "بخش", "نقش", "لایسنس"], rows: [
          ["MediaPipe Face Landmarker", "احراز هویت + آینه", "۴۷۸ لندمارک + ۵۲ Blendshape", "Apache 2.0"],
          ["face-api FaceRecognitionNet", "احراز هویت", "بردار ۱۲۸ بُعدی هویت چهره (ResNet-34)", "MIT"],
          ["چالش‌های زنده‌بودن", "احراز هویت", "ضد جعل با عکس (پلک/چرخش/لبخند)", "اختصاصی پروژه"],
          ["MediaPipe Pose Landmarker", "آینه", "۳۳ لندمارک کل بدن", "Apache 2.0"],
          ["Body Solver هندسی", "آینه", "لندمارک → چرخش استخوان‌ها", "اختصاصی پروژه"],
          ["MediaPipe Hand Landmarker", "آینه", "۲۱ لندمارک دست → ژست‌های احساسی", "Apache 2.0"],
          ["three.js / three-vrm", "آینه", "رندر و اسکلت آواتار VRM", "MIT"],
        ]},
      ]},

      { heading: "۷) حریم خصوصی", blocks: [
        { type: "list", items: [
          "ویدیوی دوربین هرگز نمایش داده، ذخیره یا ارسال نمی‌شود — فقط ورودی مدل‌هاست.",
          "تنها داده‌ی ذخیره‌شده: بردار ۱۲۸ بُعدی چهره — به‌صورت محلی در مرورگر خودتان.",
          "پس از اولین بارگذاری، مدل‌ها از کش مرورگر خوانده می‌شوند.",
          "آواتارها فایل‌هایی هستند که خودتان در پوشه‌ی public قرار داده‌اید.",
          "همه‌ی مدل‌ها متن‌باز و رایگان‌اند (Apache 2.0 و MIT).",
        ]},
      ]},
    ],
  },
  en: {
    title: "Project technologies — every model",
    intro:
      "This project is built from several open-source computer-vision engines: Face ID authentication and the live avatar mirror (body, face and hands). Everything runs on-device inside your browser — no camera frame is ever displayed, stored or uploaded.",
    sections: [
      { heading: "Part 1 — Authentication 🗝", blocks: [
        { type: "p", text: "Active on the sign-up and sign-in pages. Your identity is verified with your face — something you are." },
      ]},

      { heading: "1) Face ID — detection & liveness", blocks: [
        { type: "p", text: "Face ID combines two models. First, the Face Landmarker (MediaPipe family) extracts 478 facial landmarks including the irises, plus 52 Blendshapes — a separate score for every micro-movement such as blink amount or smile (the same set Apple's ARKit uses)." },
        { type: "p", text: "Second, for identity matching, FaceRecognitionNet (from the open-source face-api library, a ResNet-34 — one of the most famous convolutional networks) turns your face into a 128-dimensional vector — a numeric signature. At sign-in, the fresh vector is compared to the stored one via Euclidean distance; below the threshold means a match." },
        { type: "p", text: "To stop a printed photo from signing in as you, random liveness challenges are requested first: blinking (from the eye blendshapes), turning your head, or smiling. Only after passing does identity matching begin." },
      ]},

      { heading: "Part 2 — The avatar mirror 🪞", blocks: [
        { type: "p", text: "Active after sign-in: your body, face and hands are streamed live onto a 3D avatar." },
      ]},

      { heading: "2) Body mirror — MediaPipe Pose Landmarker", blocks: [
        { type: "p", text: "The Pose Landmarker tracks your whole body with 33 3D landmarks — shoulders, elbows, wrists, hips, knees and ankles. World landmarks give true limb directions regardless of your position in the frame." },
        { type: "p", text: "A geometric body solver converts these points into avatar bone rotations via chain aiming: shoulder→elbow aims the upper arm, elbow→wrist the forearm; torso twist compares the shoulder line to the hip line. Seated mode (hips hidden, knees visible) is detected automatically." },
      ]},

      { heading: "3) Face mirror — 52 blendshapes", blocks: [
        { type: "p", text: "The same Face Landmarker runs continuously: left and right eyelids map independently with no lag (one-eyed winks work!), smile, anger, sadness and surprise are read from blendshape combinations, the mouth syncs as you speak, and the avatar's head follows yours." },
      ]},

      { heading: "4) Emotional gestures — hands as commands", blocks: [
        { type: "p", text: "The Hand Landmarker reads 21 points per hand and a geometric algorithm maps the shape to one of ten gestures (👍 👎 ✌️ 🤟 🤘 ✊ 👌 🤙 ☝️ ✋). Each gesture triggers an emotional mood — 👍 a big smile and a joyful hop, 👎 sadness, ✌️ a wink. These only steer face and body reactions; the arms stay fully mirrored. Waving (open palm + side-to-side shake) is read from your actual motion." },
      ]},

      { heading: "5) 3D rendering — three.js & VRM", blocks: [
        { type: "p", text: "The avatars are VRM files (VRoid Studio) rendered with three.js and three-vrm. Bone rotations are applied with smooth quaternion interpolation, and the system auto-detects both VRM generations so every avatar faces the camera correctly." },
      ]},

      { heading: "6) Complete model table", blocks: [
        { type: "table", head: ["Model / tech", "Part", "Role", "License"], rows: [
          ["MediaPipe Face Landmarker", "Auth + Mirror", "478 landmarks + 52 blendshapes", "Apache 2.0"],
          ["face-api FaceRecognitionNet", "Auth", "128-d face identity vector (ResNet-34)", "MIT"],
          ["Liveness challenges", "Auth", "anti-spoofing (blink/turn/smile)", "Project-specific"],
          ["MediaPipe Pose Landmarker", "Mirror", "33 whole-body landmarks", "Apache 2.0"],
          ["Geometric body solver", "Mirror", "landmarks → bone rotations", "Project-specific"],
          ["MediaPipe Hand Landmarker", "Mirror", "21 hand landmarks → emotional gestures", "Apache 2.0"],
          ["three.js / three-vrm", "Mirror", "VRM avatar rendering & rig", "MIT"],
        ]},
      ]},

      { heading: "7) Privacy", blocks: [
        { type: "list", items: [
          "The camera feed is never displayed, stored or uploaded — it is model input only.",
          "The only stored data: the 128-d face vector — locally, in your own browser.",
          "After the first load, models are served from the browser cache.",
          "The avatars are simply the VRM files you placed in public/ yourself.",
          "All models are open source and free (Apache 2.0 and MIT).",
        ]},
      ]},
    ],
  },
}