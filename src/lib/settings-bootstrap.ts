import { APPEARANCE_ATTRIBUTES, SETTINGS_KEY } from "./settings";

/**
 * A tiny script that runs before the page first paints. It copies the saved appearance
 * settings onto <html> as data-... attributes, so a saved dark theme, accent color, or text
 * size is there from the start, with no flash of the default look.
 * It only copies simple lowercase words; the stylesheet decides what each one means.
 */
export const SETTINGS_BOOTSTRAP = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_KEY,
)})||"null");if(!s)return;var m=${JSON.stringify(
  APPEARANCE_ATTRIBUTES,
)};var r=document.documentElement;for(var a in m){var v=s[m[a]];if(typeof v==="string"&&/^[a-z]+$/.test(v))r.setAttribute("data-"+a,v)}}catch(e){}})();`;
