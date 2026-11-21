// Made-up demo profiles. No real people. First names only.
// The texts (study, intro, room, quiet hours) live in src/i18n, so they can be
// shown in both languages. Mikkel and Lukas are not verified on purpose, so
// testers see both kinds of profile.
// Months are set relative to today, so the demo never looks out of date.

import { da } from '../i18n/da';
import { monthFromNow } from '../labels';
import type { HostProfile, Profile, StudentProfile } from '../types';

export function demoStudents(): StudentProfile[] {
  return [
    {
      id: 'demo-s1', role: 'student', isDemo: true,
      firstName: 'Emma', study: da.demo['demo-s1'].study!,
      budget: 2800, moveIn: monthFromNow(2), areas: ['Dalum', 'Hjallese', 'Fruens Bøge'],
      offers: ['indkob', 'samvaer', 'rengoring'], hoursPerWeek: 8,
      motivations: ['selskab', 'hjaelpe', 'husleje'], hasPet: false, smokes: false,
      intro: da.demo['demo-s1'].intro,
      verifiedDomain: 'edu.ucl.dk',
    },
    {
      id: 'demo-s2', role: 'student', isDemo: true,
      firstName: 'Jonas', study: da.demo['demo-s2'].study!,
      budget: 2200, moveIn: monthFromNow(1), areas: [],
      offers: ['teknologi', 'indkob'], hoursPerWeek: 4,
      motivations: ['husleje'], hasPet: false, smokes: false,
      intro: da.demo['demo-s2'].intro,
      verifiedDomain: 'student.sdu.dk',
    },
    {
      id: 'demo-s3', role: 'student', isDemo: true,
      firstName: 'Amina', study: da.demo['demo-s3'].study!,
      budget: 3000, moveIn: monthFromNow(3), areas: ['Odense C', 'Bolbro', 'Tarup'],
      offers: ['samvaer', 'indkob', 'teknologi'], hoursPerWeek: 6,
      motivations: ['oplevelse', 'selskab'], hasPet: false, smokes: false,
      intro: da.demo['demo-s3'].intro,
      verifiedDomain: 'student.sdu.dk',
    },
    {
      id: 'demo-s4', role: 'student', isDemo: true,
      firstName: 'Mikkel', study: da.demo['demo-s4'].study!,
      budget: 2500, moveIn: monthFromNow(1), areas: ['Næsby', 'Tarup', 'Bolbro'],
      offers: ['have', 'rengoring', 'indkob'], hoursPerWeek: 10,
      motivations: ['husleje', 'hjaelpe'], hasPet: true, smokes: false,
      intro: da.demo['demo-s4'].intro,
    },
    {
      id: 'demo-s5', role: 'student', isDemo: true,
      firstName: 'Sofie', study: da.demo['demo-s5'].study!,
      budget: 2000, moveIn: monthFromNow(2), areas: ['Odense C', 'Fruens Bøge'],
      offers: ['samvaer', 'rengoring'], hoursPerWeek: 5,
      motivations: ['selskab', 'oplevelse'], hasPet: false, smokes: false,
      intro: da.demo['demo-s5'].intro,
      verifiedDomain: 'student.sdu.dk',
    },
    {
      id: 'demo-s6', role: 'student', isDemo: true,
      firstName: 'Lukas', study: da.demo['demo-s6'].study!,
      budget: 3200, moveIn: monthFromNow(4), areas: [],
      offers: ['teknologi', 'have', 'indkob', 'samvaer'], hoursPerWeek: 7,
      motivations: ['oplevelse', 'husleje'], hasPet: false, smokes: true,
      intro: da.demo['demo-s6'].intro,
    },
  ];
}

export function demoHosts(): HostProfile[] {
  return [
    {
      id: 'demo-h1', role: 'host', isDemo: true,
      firstName: 'Inger', area: 'Dalum',
      roomDescription: da.demo['demo-h1'].roomDescription!,
      rent: 2400, availableFrom: monthFromNow(1),
      petsAllowed: false, smokingAllowed: false, quietHours: da.demo['demo-h1'].quietHours!,
      wants: ['samvaer', 'indkob'], hoursWanted: 6,
      intro: da.demo['demo-h1'].intro,
    },
    {
      id: 'demo-h2', role: 'host', isDemo: true,
      firstName: 'Knud', area: 'Fruens Bøge',
      roomDescription: da.demo['demo-h2'].roomDescription!,
      rent: 1800, availableFrom: monthFromNow(0),
      petsAllowed: true, smokingAllowed: false, quietHours: da.demo['demo-h2'].quietHours!,
      wants: ['have', 'rengoring', 'samvaer'], hoursWanted: 8,
      intro: da.demo['demo-h2'].intro,
    },
    {
      id: 'demo-h3', role: 'host', isDemo: true,
      firstName: 'Birthe', area: 'Bolbro',
      roomDescription: da.demo['demo-h3'].roomDescription!,
      rent: 2000, availableFrom: monthFromNow(2),
      petsAllowed: false, smokingAllowed: false, quietHours: da.demo['demo-h3'].quietHours!,
      wants: ['teknologi', 'indkob', 'samvaer'], hoursWanted: 5,
      intro: da.demo['demo-h3'].intro,
    },
    {
      id: 'demo-h4', role: 'host', isDemo: true,
      firstName: 'Erik', area: 'Næsby',
      roomDescription: da.demo['demo-h4'].roomDescription!,
      rent: 2600, availableFrom: monthFromNow(1),
      petsAllowed: true, smokingAllowed: true, quietHours: da.demo['demo-h4'].quietHours!,
      wants: ['have', 'indkob'], hoursWanted: 4,
      intro: da.demo['demo-h4'].intro,
    },
    {
      id: 'demo-h5', role: 'host', isDemo: true,
      firstName: 'Kirsten', area: 'Odense C',
      roomDescription: da.demo['demo-h5'].roomDescription!,
      rent: 2800, availableFrom: monthFromNow(3),
      petsAllowed: false, smokingAllowed: false, quietHours: da.demo['demo-h5'].quietHours!,
      wants: ['samvaer', 'indkob', 'rengoring'], hoursWanted: 6,
      intro: da.demo['demo-h5'].intro,
    },
    {
      id: 'demo-h6', role: 'host', isDemo: true,
      firstName: 'Grethe', area: 'Hjallese',
      roomDescription: da.demo['demo-h6'].roomDescription!,
      rent: 1500, availableFrom: monthFromNow(2),
      petsAllowed: true, smokingAllowed: false, quietHours: da.demo['demo-h6'].quietHours!,
      wants: ['samvaer', 'teknologi', 'indkob', 'rengoring'], hoursWanted: 10,
      intro: da.demo['demo-h6'].intro,
      // Shows helper mode: Grethe made her profile together with her grandchild.
      helper: 'grandchild',
    },
  ];
}

export function demoProfiles(): Profile[] {
  return [...demoStudents(), ...demoHosts()];
}
