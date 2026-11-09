const requested = new URLSearchParams(location.search).get('lang');
let saved;
try { saved = localStorage.getItem('userLanguage'); } catch { /* English fallback. */ }
export const language = (requested || saved) === 'he' ? 'he' : 'en';
const english = {
 'לוגו Follow Your Intuition':'Follow Your Intuition logo',
 'היצירה שלך, בתנועה.':'Your creation, in motion.',
 'המרת מקרו לווידאו':'Macro to video',
 'בחר קובץ מקרו או לוגר':'Choose a macro or logger file',
 'שיטת ייצוא':'Export method',
 'חישוב פריימים':'Computed frames',
 'שעון מבוקר · ללא תצוגה מקדימה':'Controlled clock · no preview',
 'ניגון והקלטה':'Play and record',
 'בזמן אמת · עם תצוגה מקדימה':'Real time · with preview',
 'גודל הסרטון':'Video size',
 'פריימים לשנייה':'Frames per second',
 'איכות קידוד':'Encoding quality',
 'חסכונית':'Economical', 'גבוהה':'High', 'מרבית':'Maximum', 'אפקטים':'Effects',
 'הגדרות שמופיעות בקובץ מיושמות אוטומטית. כשאין הגדרה, הבחירה שלך קובעת.':'Recorded preferences are applied automatically. Otherwise, your choices apply.',
 'בודק תמיכה בייצוא…':'Checking export support…',
 'יצירת וידאו':'Create video', 'ביטול':'Cancel', 'שמירת הסרטון':'Save video',
 'התקדמות ההמרה':'Export progress', 'טוען את מנוע הניגון…':'Loading the playback engine…',
 'תצוגת הסרטון':'Video preview', 'הכול במחשב שלך · ללא קול':'On your device · no audio',
 'השאר את הכלי פתוח ואת המחשב ער.':'Keep Studio open and your device awake.',
 'איכות וגודל גבוהים דורשים יותר זמן וזיכרון.':'Higher quality and larger sizes require more time and memory.',
 'מנוע ניגון מקומי':'Local playback engine',
 ' · מהקובץ':' · recorded',
 'הדפדפן אינו תומך בקידוד פריימים מחושב בהגדרות האלה. נסה גודל קטן יותר או ניגון והקלטה.':'This browser cannot encode computed frames at these settings. Try a smaller size or Play and record.',
 'אין תמיכה בייצוא בהגדרות האלה. נסה גודל קטן יותר.':'Export is unavailable at these settings. Try a smaller size.',
 'מחושב: הפריימים נוצרים ישירות לסרטון, ללא תצוגה מקדימה. המחשב אינו מחכה לזמן אמת; ההפקה עשויה להיות מהירה או איטית יותר.':'Frames go directly into the video, without a preview. Processing may be faster or slower than real time.',
 'זמן אמת: מנגן את היצירה ומקליט תוך כדי. קצב הפריימים בפועל תלוי בעומס המחשב.':'Plays the creation while recording. The actual frame rate depends on device load.',
 'אפשר לעבור לחלון אחר. השאר את הכלי פתוח ואת המחשב ער; העבודה ברקע עשויה להאט.':'You can switch windows. Keep Studio open and your device awake; background processing may slow down.',
 'בהקלטה בזמן אמת השאר את החלון בחזית עד לסיום.':'Keep this window in front until real-time recording finishes.',
 'ייצוא ':'Export ', ' פריימים לשנייה':' fps', ' (יעד)':' (target)',
 'השילוב הזה אינו זמין בדפדפן':'These settings are unavailable in this browser',
 'מנוע הניגון לא נטען.':'The playback engine did not load.',
 'ההמרה בוטלה.':'Export canceled.',
 'מנוע הניגון לא נטען. סגור ופתח שוב באמצעות Start.command.':'The playback engine did not load. Reload Studio and try again.',
 'מכין את מנוע הניגון…':'Preparing the playback engine…',
 'לגרסת הניסוי יש מגבלה של 32 מגה לקובץ מקרו.':'This prototype accepts macro files up to 32 MiB.',
 'הקלטת הווידאו נכשלה.':'Video recording failed.',
 'ההמרה בוטלה כי החלון עבר לרקע. הפעל שוב והשאר אותו בחזית.':'Recording canceled because the window moved to the background. Restart and keep it in front.',
 'ההמרה בוטלה. אפשר להתחיל מחדש.':'Export canceled. You can start again.',
 'הניגון הגיע למגבלת 30 הדקות של גרסת הניסוי.':'Playback reached the prototype limit of 30 minutes.',
 'מקודד הווידאו הפסיק להגיב. נסה גודל או קצב נמוכים יותר.':'The video encoder stopped responding. Try a smaller size or lower frame rate.',
 'המחשב אינו עומד בקצב ההקלטה. נסה מצב מחושב, גודל קטן יותר או פחות פריימים.':'Your device cannot keep up with recording. Try computed frames, a smaller size or a lower frame rate.',
 'יוצר סרטון · ':'Rendering · ', ' בסרטון · ':' in video · ', ' עיבוד · ':' elapsed · ',
 'מסיים את קובץ הווידאו…':'Finalizing the video…',
 'הסרטון מוכן · ':'Video ready · ', ' מגה · ':' MB · ',
 ' עיבוד. לחץ על שמירת הסרטון.':' elapsed. Select Save video.',
 'לא נשמר סרטון. קובץ המקרו המקורי לא השתנה.':'No video was saved. Your original macro file is unchanged.',
 'מוכן. בחר קובץ מקרו.':'Ready. Choose a macro file.',
 'נטען מהאפליקציה: ':'Loaded from the app: '
};
export function t(text) { return language === 'he' ? text : (english[text] ?? text); }
export function translateDocument() {
 document.documentElement.lang = language;
 document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
 const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())) {
  if(node.parentElement.closest('script,style')) continue;
  const trimmed=node.data.trim();
  if(trimmed) node.data=node.data.replace(trimmed,t(trimmed));
 }
 for(const element of document.querySelectorAll('[aria-label],[alt],[title]')) {
  for(const attr of ['aria-label','alt','title']) if(element.hasAttribute(attr)) element.setAttribute(attr,t(element.getAttribute(attr)));
 }
}
