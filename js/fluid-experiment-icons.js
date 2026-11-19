const oilSymbol='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 17c3-2 5 2 8 0s5 2 10 0M3 21c3-2 5 2 8 0s5 2 10 0"/><path d="M12 2c-2 3-5 5.5-5 8a5 5 0 0 0 10 0c0-2.5-3-5-5-8Z"/><path d="M10 10c0 1 .5 2 1.5 2.5"/></svg>';
export function setFluidExperimentTitle(heading,kind,label){
    const icon=document.createElement('span');icon.className='fluid-original-symbol';icon.setAttribute('aria-hidden','true');
    if (kind === 'ink') icon.append(document.querySelector('#btnInk > [data-vortices-icon=flow]').cloneNode(true));
    else icon.innerHTML=oilSymbol;
    const title=document.createElement('span');title.textContent=label;heading.replaceChildren(icon,title);
}
