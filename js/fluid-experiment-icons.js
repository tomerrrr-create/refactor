// Keep the original experiment symbols in settings; the toolbar uses A/B.
const symbols={
    ink:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2c-2 3-7 7.7-7 12a7 7 0 0 0 14 0c0-4.3-5-9-7-12Z"/><path d="M8 15c1.3-3 6.5-4.2 7-1.5.6 3-4.5 4-5.5 2.2"/></svg>',
    oil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 17c3-2 5 2 8 0s5 2 10 0M3 21c3-2 5 2 8 0s5 2 10 0"/><path d="M12 2c-2 3-5 5.5-5 8a5 5 0 0 0 10 0c0-2.5-3-5-5-8Z"/><path d="M10 10c0 1 .5 2 1.5 2.5"/></svg>'
};
export function setFluidExperimentTitle(heading,kind,label){
    const icon=document.createElement('span');icon.className='fluid-original-symbol';icon.setAttribute('aria-hidden','true');icon.innerHTML=symbols[kind];
    const title=document.createElement('span');title.textContent=label;heading.replaceChildren(icon,title);
}
