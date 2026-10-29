export const icons={
 home:'<path d="M3 11 12 3l9 8v10h-7v-7h-4v7H3Z"/>',
 sound:'<path d="M3 9h5l6-5v16l-6-5H3Z"/><path d="M17 7q7 5 0 10" fill="none" stroke="currentColor" stroke-width="2"/>',
 mute:'<path d="M3 9h5l6-5v16l-6-5H3Z"/><path d="m17 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2"/>',
 pause:'<rect x="5" y="3" width="5" height="18" rx="2"/><rect x="14" y="3" width="5" height="18" rx="2"/>',
 play:'<path d="m7 3 14 9-14 9Z"/>',
 horn:'<path d="M3 9h6l10-6v18L9 15H3Z"/><path d="M21 7q5 5 0 10" fill="none" stroke="currentColor" stroke-width="2"/>',
 up:'<path d="m5 13 7-8 7 8M12 6v15" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
 coast:'<path d="M4 12h16" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
 brake:'<path d="M6 4h12l4 7-4 9H6l-4-9Z"/><path d="M8 8v8m8-8v8" fill="none" stroke="#fff4d7" stroke-width="2"/>',
 door:'<path d="M4 3h16v19H4Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v17M7 8v6m10-6v6" fill="none" stroke="currentColor" stroke-width="2"/>',
 station:'<path d="M3 11 12 3l9 8v10H3Z"/><path d="M9 15h6v6H9Z" fill="#fff4d7"/>',
 star:'<path d="m12 1 3.4 7 7.6 1.1-5.5 5.3 1.3 7.6-6.8-3.6L5.2 22l1.3-7.6L1 9.1 7.6 8Z"/>',
 rotate:'<rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 8q1-6 6-6M2 8V3m20 13q-1 6-6 6m6-6v5" fill="none" stroke="currentColor" stroke-width="2"/>'
};
export const icon=(id)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[id]}</svg>`;
// A wholly original coral-and-cream town train; no real operator or rolling stock.
export const trainFront=`<svg viewBox="0 0 300 230" aria-hidden="true"><ellipse cx="150" cy="210" rx="100" ry="12" fill="#163f4930"/><path d="M72 206 60 225m168-19 12 19" stroke="#61797c" stroke-width="10"/><rect x="65" y="13" width="170" height="190" rx="46" fill="#e48668"/><path d="M77 40q73-26 146 0v81H77Z" fill="#f9ead0"/><rect x="87" y="46" width="126" height="71" rx="17" fill="#305d6a"/><path d="M96 55h48l-28 52H96Z" fill="#bfe3e3" opacity=".7"/><path d="M151 48v67" stroke="#f9ead0" stroke-width="8"/><rect x="111" y="23" width="78" height="15" rx="7" fill="#34515b"/><path d="M67 140h166v22H67Z" fill="#f6c955"/><circle cx="92" cy="151" r="12" fill="#fff3cc"/><circle cx="208" cy="151" r="12" fill="#fff3cc"/><rect x="101" y="179" width="98" height="14" rx="7" fill="#34515b"/><rect x="72" y="196" width="35" height="16" rx="6" fill="#34515b"/><rect x="193" y="196" width="35" height="16" rx="6" fill="#34515b"/></svg>`;
export const sideDoors=`<svg viewBox="0 0 300 126" aria-hidden="true"><rect x="5" y="10" width="290" height="105" rx="19" fill="#ed9679"/><path d="M7 74h286v14H7Z" fill="#f8cf65"/><rect x="24" y="25" width="58" height="41" rx="8" fill="#badfe0"/><rect x="218" y="25" width="58" height="41" rx="8" fill="#badfe0"/><rect x="106" y="21" width="88" height="85" rx="3" fill="#365561"/><g class="door-leaf left"><rect x="106" y="21" width="43" height="85" fill="#f5ead3"/><rect x="113" y="29" width="29" height="36" rx="5" fill="#9fced4"/></g><g class="door-leaf right"><rect x="151" y="21" width="43" height="85" fill="#f5ead3"/><rect x="158" y="29" width="29" height="36" rx="5" fill="#9fced4"/></g><g class="passenger"><circle cx="151" cy="53" r="10" fill="#e8bc98"/><path d="M138 66q13-7 26 0v25h-26Z" fill="#78bba9"/><path d="M144 91v17m14-17v17" stroke="#345562" stroke-width="6"/></g></svg>`;
