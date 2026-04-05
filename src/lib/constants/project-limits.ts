/**
 * Project lifecycle limits
 */

/** Maximum number of concurrently active projects */
export const MAX_ACTIVE_PROJECTS = 1000;

/** Stop spawning new novels when active + paused >= this threshold */
export const MAX_TOTAL_PROJECTS = 1200;
