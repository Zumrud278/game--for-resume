/**
 * ─────────────────────────────────────────────────────────────
 *  YOUR RESUME — edit this file to change what the game shows.
 * ─────────────────────────────────────────────────────────────
 *
 * Each section belongs to one floating island (in order).
 *
 * An item can have:
 *   title        – bold first line
 *   text         – description; wrap words in **double stars** for bold
 *   placeholder  – shown as a dashed "to add" note instead of real content.
 *                  Replace a placeholder item with real { title, text } when ready.
 *
 * Section fields:
 *   level        – number shown as "Level N"
 *   title        – panel heading and HUD name
 *   islandLabel  – short label on the island sign
 *   icon         – image key (see assets/objects/)
 */
export const RESUME = {
  name: 'Zumrud',
 

  sections: [
    {
      id: 'education',
      level: 1,
      title: 'Education',
      islandLabel: 'EDUCATION',
      icon: 'education',
      items: [
        { title: 'ADA University' },
        { title: 'Information Technologies' },
        { placeholder: 'Add more education details here (e.g. degree, years of study)' },
      ],
    },
    {
      id: 'skills',
      level: 2,
      title: 'Technical Skills',
      islandLabel: 'SKILLS',
      icon: 'skills',
      items: [
        { title: 'Python basics' },
        { title: 'HTML basics' },
        { title: 'JavaScript basics' },
        { title: 'C++ basics' },
      ],
    },
    {
      id: 'projects',
      level: 3,
      title: 'Projects',
      islandLabel: 'PROJECTS',
      icon: 'projects',
      items: [
        {
          title: 'Project One: Logic Gates',
          text: 'My teammates and I built AND, OR and NOT logic gates on a breadboard. We wired each gate by hand and tested how it works.',
        },
      ],
    },
    {
      id: 'achievements',
      level: 4,
      title: 'Achievements',
      islandLabel: 'ACHIEVEMENTS',
      icon: 'trophy',
      items: [
        {
          title: 'YONCA – AI-Based Daily Farm Planner',
          text: '**My teammate and I built an AI-based daily farm planner for farmers, created for the Yonca app.**',
        },
        { placeholder: 'Add certificates here' },
      ],
    },
  ],

  // Contact panel on the rainbow island. Set any value to null to show
  // a "to add" placeholder instead of a button.
  contact: {
    email: 'zismayilova167@gmail.com',
    github: 'https://github.com/Zumrud278',
    linkedin: 'https://www.linkedin.com/in/zumrud-ismayilova-427bb9382',
    resumePdf: null,  // not provided yet — e.g. 'assets/resume.pdf'
  },

  // Shown when she lands on the rainbow island
  endingQuote: ["This is not the end of my journey.", "It's just the beginning."],
};

// Quick lookup: RESUME_SECTIONS.education, RESUME_SECTIONS.skills, …
export const RESUME_SECTIONS = Object.fromEntries(RESUME.sections.map((s) => [s.id, s]));
