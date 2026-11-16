// Chapter two teaches the existing color engine; the strip is read-only.
export const CHAPTER_TWO_ORDERS = ['luminance','dark-rainbow','reversed','center-out','temperature','outside-in'];
export const CHAPTER_TWO_STEPS = CHAPTER_TWO_ORDERS.map(method=>'order-'+method);
const COPY={
 he:{chapter:'פרק 2 · הסדר של הצבעים',replay:'הדרכת כניסה ראשונה · פרקים 1–2',reset:'הצגת ההדרכה בכניסה הבאה',continue:'לפרק 2 · הסדר של הצבעים',title:'מהו הצבע הבא?',change:'מנסים סדר אחר',first:'הצבע הבא נקבע לפי סדר הפלטה. כרגע הצבעים מסודרים מכהה לבהיר. לחצו עוד כמה פעמים על אותה משבצת.',switch:'לחצו על כפתור המיון כדי לעבור לסדר הבא.',tap:'לחצו שוב על אותה משבצת וראו איזה צבע מגיע עכשיו.',done:'כל לחיצה מקדמת לצבע הבא. בסוף הרצף חוזרים להתחלה.',future:'כרגע הסדר קובע מה יגיע בלחיצה הבאה. בהמשך נראה איך הוא משנה את האבולוציה של הלוח.',direction:'הצבעים מתקדמים משמאל לימין →',hint:'פס הצבעים מציג את הסדר בלבד; הוא אינו בורר צבעים.',names:['כהה לבהיר','קשת בענן','בהיר לכהה','בהיר לכהה לבהיר','מחם לקר','כהה לבהיר לכהה'],descriptions:['כל לחיצה מקדמת לצבע הבא, מכהה לבהיר.','עכשיו הצבעים מתקדמים לאורך הקשת.','אותם צבעים, בכיוון ההפוך.','מתקדמים מהבהיר אל הכהה, ואז בחזרה לבהיר.','הצבעים עוברים מחמים לקרים.','מתקדמים מהכהה אל הבהיר, ואז בחזרה לכהה.']},
 en:{chapter:'Chapter 2 · The order of colors',replay:'First visit · Chapters 1–2',reset:'Show the tutorial on the next visit',continue:'Chapter 2 · The order of colors',title:'Which color comes next?',change:'Try another order',first:'The next color follows the palette’s order. Right now it runs from dark to light. Click the same square a few more times.',switch:'Click Sort to move to the next order.',tap:'Click the same square again and watch which color comes next.',done:'Each click advances to the next color. At the end, the sequence starts again.',future:'For now, the order decides which color comes next when you click. Later, we’ll see how it changes the board’s evolution.',direction:'Start → colors advance from left to right → End',hint:'This strip shows the sequence; it does not select a brush color.',names:['Dark to light','Rainbow','Light to dark','Light to dark to light','Warm to cool','Dark to light to dark'],descriptions:['Each click advances to the next color, from dark to light.','The colors now follow the rainbow.','The same colors, in the opposite direction.','From light to dark, then back to light.','Colors progress from warm to cool.','From dark to light, then back to dark.']}
};
export const chapterTwoCopy=language=>COPY[language]||COPY.en;
export function renderOrderStrip(host,state,index,language){
 const c=chapterTwoCopy(language),name=c.names[CHAPTER_TWO_ORDERS.indexOf(state.sortMethod)]||'';
 const key=JSON.stringify([state.colors,state.sortMethod,language]);
 if(host.dataset.key!==key){
  host.dataset.key=key;host.replaceChildren();
  const label=document.createElement('h3');label.textContent=name;
  const direction=document.createElement('p');direction.className='chapter-order-direction';direction.textContent=c.direction;
  const strip=document.createElement('div');strip.className='chapter-order-strip';strip.dir='ltr';strip.setAttribute('role','img');strip.setAttribute('aria-label',name);
  for(const color of state.colors){const swatch=document.createElement('span');swatch.style.backgroundColor=color;strip.append(swatch);}
  const note=document.createElement('p');note.className='chapter-order-hint';note.textContent=c.hint;host.append(label,direction,strip,note);
 }
 const colorIndex=Number.isInteger(index)?state.tiles[index]:-1;
 [...host.querySelectorAll('.chapter-order-strip span')].forEach((node,i)=>node.classList.toggle('is-current',i===colorIndex));
}
