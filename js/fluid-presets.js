// UI-only recipes of existing parameters. Files/profiles keep numeric rules;
// no preset identifier enters simulation state, history or macro commands.
const preset = (id, rules, copy) => Object.freeze({id,rules:Object.freeze(rules),copy:Object.freeze(copy)});
export const FLUID_PRESETS = Object.freeze({
    ink:Object.freeze([
        preset('balanced',{flow:65,swirl:65,viscosity:25},[
            ['Balanced','A mix of upward drift and curling currents.'],['מאוזן','שילוב של ציפה וזרמים מסתחררים.'],['Баланс','Сочетание подъёма и завихрений.'],['In balans','Een combinatie van opwaartse drift en wervels.']]),
        preset('gentle',{flow:30,swirl:25,viscosity:80},[
            ['Gentle current','Slower pigment transport with calmer local motion.'],['זרימה עדינה','תזוזת צבע איטית יותר ותנועה מקומית רגועה.'],['Тихое течение','Медленное перемещение и спокойное движение.'],['Zachte stroming','Langzamer kleurtransport met rustige lokale beweging.']]),
        preset('whirlpools',{flow:75,swirl:100,viscosity:15},[
            ['Whirlpools','Strong curl around color boundaries, with little smoothing.'],['מערבולות','סחרור חזק בגבולות הצבע, עם מעט ריסון מקומי.'],['Водовороты','Сильные завихрения на границах цветов, мало сглаживания.'],['Draaikolken','Sterke wervels langs kleurgrenzen, met weinig demping.']]),
        preset('rising',{flow:100,swirl:10,viscosity:45},[
            ['Rising pigments','Emphasizes rank-driven buoyancy over curling.'],['צבעים צפים','מדגיש ציפה לפי סדר המיון, עם מעט סחרור.'],['Подъём цветов','Подъём по порядку сортировки, минимум завихрений.'],['Stijgende kleuren','Benadrukt drijfkracht volgens de sortering boven wervels.']]),
        preset('thick',{flow:55,swirl:55,viscosity:100},[
            ['Thick ink','More smoothing between adjacent currents; colors stay distinct.'],['דיו סמיך','ריסון חזק של הבדלים בין זרמים סמוכים; הגוונים אינם מתערבבים.'],['Густые чернила','Больше сглаживания соседних течений; цвета не смешиваются.'],['Dikke inkt','Meer demping tussen naburige stromen; kleuren blijven gescheiden.']])
    ]),
    oil:Object.freeze([
        preset('balanced',{tension:80,drift:20,mobility:70},[
            ['Balanced','Coarsening droplets with a gentle upward bias.'],['מאוזן','התלכדות כתמים עם נטייה עדינה לציפה.'],['Баланс','Укрупнение капель с лёгким подъёмом.'],['In balans','Samenvloeiende druppels met een lichte opwaartse neiging.']]),
        preset('rounded',{tension:100,drift:0,mobility:85},[
            ['Quiet droplets','Shortens color boundaries without an upward bias.'],['טיפות שקטות','מקצר גבולות בין צבעים, ללא כוח ציפה כלפי מעלה.'],['Тихие капли','Сокращает границы цветов без направленного подъёма.'],['Rustige druppels','Verkort kleurgrenzen zonder opwaartse voorkeur.']]),
        preset('pearls',{tension:90,drift:5,mobility:25},[
            ['Slow pearls','Few exchanges per generation; shapes change gradually.'],['פנינים איטיות','מעט חילופי תאים בכל דור; הצורות משתנות בהדרגה.'],['Медленные жемчужины','Меньше обменов за шаг; формы меняются постепенно.'],['Trage parels','Minder uitwisselingen per stap; vormen veranderen geleidelijk.']]),
        preset('floating',{tension:35,drift:100,mobility:85},[
            ['Floating drops','Buoyancy competes more strongly with compact droplet shapes.'],['טיפות צפות','הציפה מתחרה חזק יותר בנטייה לכתמים קומפקטיים.'],['Плавающие капли','Подъём сильнее конкурирует с компактной формой капель.'],['Drijvende druppels','Drijfkracht concurreert sterker met compacte druppelvormen.']]),
        preset('restless',{tension:15,drift:75,mobility:100},[
            ['Restless surface','Frequent exchange attempts and weaker boundary cohesion.'],['פני מים פעילים','ניסיונות תנועה תכופים ולכידות חלשה יותר בין הצבעים.'],['Подвижная поверхность','Частые попытки движения и слабое сцепление границ.'],['Onrustig oppervlak','Veel bewegingspogingen en zwakkere samenhang aan kleurgrenzen.']])
    ])
});
const languages=['en','he','ru','nl'];
export function fluidPresetCopy(preset,lang) { return preset.copy[Math.max(0,languages.indexOf(lang))]; }
export function matchingFluidPreset(kind,rules) {
    return FLUID_PRESETS[kind].find(preset=>Object.entries(preset.rules).every(([key,value])=>rules[key]===value));
}
export function createFluidPresetPicker({kind,getDraft,onSelect,getLang,getText}) {
    const element=document.createElement('section');element.className='fluid-presets';
    const heading=document.createElement('h3');heading.id=kind+'PresetsTitle';element.setAttribute('aria-labelledby',heading.id);
    const status=document.createElement('span');status.className='fluid-preset-status';status.setAttribute('aria-live','polite');
    const header=document.createElement('div');header.className='fluid-preset-header';header.append(heading,status);
    const grid=document.createElement('div');grid.className='fluid-preset-grid';element.append(header,grid);
    function sync() {
        const selected=matchingFluidPreset(kind,getDraft());
        status.textContent=selected?fluidPresetCopy(selected,getLang())[0]:getText('fluid_preset_custom');
        for(const button of grid.children)button.setAttribute('aria-pressed',String(button.dataset.preset===selected?.id));
    }
    function render() {
        heading.textContent=getText('fluid_presets');grid.replaceChildren();
        for(const preset of FLUID_PRESETS[kind]) {
            const [name,description]=fluidPresetCopy(preset,getLang());
            const button=document.createElement('button');button.type='button';button.dataset.preset=preset.id;button.className='fluid-preset-card';
            const title=document.createElement('strong'),text=document.createElement('span');title.textContent=name;text.textContent=description;
            button.append(title,text);button.addEventListener('click',()=>{onSelect({...preset.rules});sync();});grid.append(button);
        }
        sync();
    }
    return {element,render,sync};
}
