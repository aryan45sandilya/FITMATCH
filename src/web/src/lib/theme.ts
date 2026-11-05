export const THEME_STORAGE_KEY = "fm_theme";

/** Runs in <head> before paint so a saved dark theme never flashes light. */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
