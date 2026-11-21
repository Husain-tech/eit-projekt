// The whole flow in a real browser, once as a student and once as a host,
// with an axe accessibility check on every page along the way.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Fails with a readable list if axe finds a WCAG 2.1 A or AA problem. */
async function checkA11y(page: Page, where: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const problems = result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
  expect(problems, `Accessibility problems on ${where}`).toEqual([]);
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const next = (page: Page) => page.getByRole('button', { name: 'Næste', exact: true }).click();

async function expectStep(page: Page, n: number, total: number, name: string) {
  await expect(page.getByRole('heading', { level: 2, name: `Trin ${n} af ${total}: ${name}` })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

/** From a mutual match to an agreement both have said yes to. Shared by both roles. */
async function meetingToAgreement(page: Page) {
  await page.getByRole('link', { name: 'Aftal første møde' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: /^Første møde med/ })).toBeVisible();
  await checkA11y(page, 'meeting form');

  // The agreement is locked before the meeting.
  const meetingUrl = page.url();
  await page.goto(meetingUrl.replace('/moede', '/aftale'));
  await expect(page.getByRole('heading', { level: 1, name: 'I skal mødes først' })).toBeVisible();
  await page.goto(meetingUrl);

  await page.getByRole('button', { name: /^Send mødeforslag til/ }).click();
  await expect(page.getByText('Fejl: Vælg en dato for mødet.')).toBeVisible();
  await page.getByLabel('Hvilken dag?').fill(tomorrow());
  await page.getByRole('button', { name: /^Send mødeforslag til/ }).click();
  await expect(page.getByText('Venter på svar.')).toBeVisible();
  await expect(page.getByText('Mødet er aftalt.')).toBeVisible({ timeout: 6000 });
  await checkA11y(page, 'meeting agreed');

  // Still locked: nobody has said yes after the meeting.
  await page.goto(meetingUrl.replace('/moede', '/aftale'));
  await expect(page.getByRole('heading', { level: 1, name: 'I skal begge sige ja først' })).toBeVisible();
  await page.goto(meetingUrl);

  await expect(page.getByRole('heading', { name: /^Vil du gå videre med/ })).toBeVisible();
  await page.getByRole('button', { name: 'Ja, jeg vil gerne gå videre' }).click();
  await expect(page.getByText('Du har svaret ja.')).toBeVisible();
  await expect(page.getByText('I vil begge gerne gå videre.')).toBeVisible({ timeout: 6000 });

  await page.getByRole('link', { name: 'Lav en aftale' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Aftale mellem/ })).toBeVisible();
  await checkA11y(page, 'agreement form');
  // A weekly plan is suggested from the profiles, and the way out is written in plain words.
  await expect(page.getByText(/^Ugeplanen giver \d+ timer om ugen/)).toBeVisible();
  await expect(page.getByText(/kan I begge stoppe med det samme/)).toBeVisible();
  await page.getByRole('button', { name: 'Gem aftalen, og sig ja' }).click();
  await expect(page.getByText('Venter på svar.')).toBeVisible();
  await expect(page.getByText('I har en aftale.').first()).toBeVisible({ timeout: 6000 });
  await checkA11y(page, 'agreement done');

  await expect(page.getByRole('term').filter({ hasText: 'Ugeplan' })).toBeVisible();
  await expect(page.getByRole('term').filter({ hasText: 'Hvis I vil stoppe' })).toBeVisible();

  await page.getByRole('link', { name: 'Forslag', exact: true }).click();
  await expect(page.getByText('I er i prøveperioden. Der er 4 uger tilbage.')).toBeVisible();
}

test('student: own profile in steps, match, meeting, both say yes, agreement', async ({ page }) => {
  await checkA11y(page, 'front page');
  await page.getByRole('link', { name: 'Jeg er studerende' }).click();
  await checkA11y(page, 'choose profile (student)');
  await page.getByRole('link', { name: 'Lav min profil' }).click();

  // Step 1 is checked before moving on.
  await expectStep(page, 1, 5, 'Om dig');
  await next(page);
  await expect(page.getByRole('heading', { name: 'Der mangler noget' })).toBeVisible();
  await checkA11y(page, 'profile step 1 with errors');
  await page.getByLabel('Fornavn').fill('Testa');
  await page.getByLabel('Hvad læser du?').fill('Biologi, SDU');
  await page.getByLabel('Fortæl lidt om dig selv').fill('Jeg kan lide at gå ture.');
  // Simulated student check: a non-study email is refused, a study email gives the label.
  await expect(page.getByText(/Dette er en simulering/)).toBeVisible();
  await page.getByLabel('Din e-mail fra dit studie (frivillig)').fill('testa@gmail.com');
  await next(page);
  await expect(page.getByText(/^Fejl: Adressen ligner ikke/)).toBeVisible();
  await page.getByLabel('Din e-mail fra dit studie (frivillig)').fill('testa@student.sdu.dk');
  await next(page);

  await expectStep(page, 2, 5, 'Bolig');
  await checkA11y(page, 'profile step 2');
  await page.getByLabel('Hvor meget kan du højst betale i husleje om måneden?').fill('2600');

  // A reload keeps the step and the text.
  await page.reload();
  await expectStep(page, 2, 5, 'Bolig');
  await expect(page.getByLabel('Hvor meget kan du højst betale i husleje om måneden?')).toHaveValue('2600');
  await next(page);

  await expectStep(page, 3, 5, 'Hjælp og samvær');
  await checkA11y(page, 'profile step 3');
  await page.getByLabel('Samvær og snak').check();
  await page.getByLabel('Indkøb').check();
  await page.getByLabel('Hvor mange timer om ugen kan du give?').fill('6');
  await page.getByLabel('Selskab i hverdagen').check();
  await next(page);

  await expectStep(page, 4, 5, 'Husregler');
  await checkA11y(page, 'profile step 4');
  // Back keeps what was typed.
  await page.getByRole('button', { name: 'Tilbage' }).click();
  await expectStep(page, 3, 5, 'Hjælp og samvær');
  await expect(page.getByLabel('Hvor mange timer om ugen kan du give?')).toHaveValue('6');
  await next(page);
  await next(page);

  await expectStep(page, 5, 5, 'Samtykke');
  await page.getByRole('button', { name: 'Gem min profil og se forslag' }).click();
  await expect(page.getByText('Fejl: Sæt kryds her, før du gemmer.')).toBeVisible();
  await checkA11y(page, 'profile step 5 with error');
  await page.getByRole('checkbox', { name: /^Jeg siger ja til/ }).check();
  await page.getByRole('button', { name: 'Gem min profil og se forslag' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Forslag til dig' })).toBeVisible();
  await checkA11y(page, 'suggestions (student)');
  await page.getByRole('button', { name: /^Ja tak, jeg vil gerne møde/ }).first().click();
  await expect(page.getByText(/^Du har sagt ja tak/)).toBeVisible();
  await expect(page.getByText('I vil begge gerne mødes.')).toBeVisible({ timeout: 6000 });

  await meetingToAgreement(page);

  await page.getByRole('link', { name: 'Min profil', exact: true }).click();
  await expect(page.getByText('Ja, med e-mail fra student.sdu.dk (simuleret i prototypen)')).toBeVisible();
  await checkA11y(page, 'my profile');
  await page.getByRole('link', { name: 'Ret min profil' }).click();
  await expectStep(page, 1, 4, 'Om dig');
  await checkA11y(page, 'edit profile');
});

test('host: own profile in steps, match, meeting, both say yes, agreement', async ({ page }) => {
  await page.getByRole('link', { name: 'Jeg har et ledigt værelse' }).click();
  await checkA11y(page, 'choose profile (host)');
  await page.getByRole('link', { name: 'Lav min profil' }).click();

  await expectStep(page, 1, 5, 'Om dig');
  await page.getByLabel('Fornavn').fill('Testine');
  await page.getByLabel('Fortæl lidt om dig selv').fill('Jeg bor alene og kan lide at lave mad.');
  await next(page);

  await expectStep(page, 2, 5, 'Værelset');
  await next(page);
  await expect(page.getByText('Fejl: Vælg det område, du bor i.')).toBeVisible();
  await checkA11y(page, 'host step 2 with errors');
  await page.getByLabel('Hvilket område bor du i?').selectOption('Dalum');
  await page.getByLabel('Beskriv værelset').fill('Lille værelse med udsigt.');
  await page.getByLabel('Hvad skal huslejen være om måneden?').fill('2000');
  await next(page);

  await expectStep(page, 3, 5, 'Hjælp og samvær');
  await page.getByLabel('Samvær og snak').check();
  await page.getByLabel('Indkøb').check();
  await page.getByLabel('Hvor mange timer om ugen ønsker du?').fill('5');
  await next(page);

  await expectStep(page, 4, 5, 'Husregler');
  await next(page);
  await expectStep(page, 5, 5, 'Samtykke');
  await page.getByRole('checkbox', { name: /^Jeg siger ja til/ }).check();
  await page.getByRole('button', { name: 'Gem min profil og se forslag' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Forslag til dig' })).toBeVisible();
  await checkA11y(page, 'suggestions (host)');
  await page.getByRole('button', { name: /^Ja tak, jeg vil gerne møde/ }).first().click();
  await expect(page.getByText('I vil begge gerne mødes.')).toBeVisible({ timeout: 6000 });

  await meetingToAgreement(page);
});

test('a no after the meeting ends the connection with a neutral message', async ({ page }) => {
  await page.goto('/#/test');
  await page.getByLabel('Nej tak').check();
  await page.goto('/#/start/studerende');
  await page.getByRole('button', { name: 'Prøv som Emma' }).click();
  await page.getByRole('button', { name: /^Ja tak, jeg vil gerne møde/ }).first().click();
  await page.getByRole('link', { name: 'Aftal første møde' }).click({ timeout: 6000 });
  await page.getByLabel('Hvilken dag?').fill(tomorrow());
  await page.getByRole('button', { name: /^Send mødeforslag til/ }).click();
  await page.getByRole('button', { name: 'Ja, jeg vil gerne gå videre' }).click({ timeout: 6000 });

  await expect(page.getByRole('heading', { level: 1, name: 'Forløbet er slut' })).toBeVisible({ timeout: 6000 });
  await expect(page.getByText(/Det er ingen fejl\./)).toBeVisible();
  await checkA11y(page, 'connection ended');
  await page.getByRole('link', { name: 'Se dine andre forslag' }).click();
  await expect(page.getByRole('heading', { name: 'Forløb, der er slut' })).toBeVisible();
});

test('test leader page shows the session and downloads a CSV', async ({ page }) => {
  await page.getByRole('link', { name: 'Jeg er studerende' }).click();
  await page.getByRole('link', { name: 'Lav min profil' }).click();
  await next(page);
  await page.getByLabel('Fornavn').fill('Hemmelig');
  await page.getByLabel('Hvad læser du?').fill('Hemmelig');
  await page.getByLabel('Fortæl lidt om dig selv').fill('Hemmelig tekst');
  await next(page);
  await page.getByRole('button', { name: 'Størst' }).click();

  await page.getByRole('link', { name: 'Til testlederen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Testlederens side' })).toBeVisible();
  await checkA11y(page, 'test leader page');
  await expect(page.getByRole('row', { name: /Om dig 1 gang/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Størst' })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Hent denne test som CSV-fil' }).click(),
  ]);
  const path = await download.path();
  const fs = await import('node:fs');
  const csv = fs.readFileSync(path, 'utf-8');
  expect(csv).toContain('form_step_done');
  expect(csv).toContain('validation_error');
  // Nothing the tester typed ends up in the log.
  expect(csv).not.toContain('Hemmelig');

  // A new test keeps the old one in the list.
  await page.getByRole('button', { name: 'Start en ny test' }).click();
  await expect(page.getByRole('heading', { name: 'Tidligere test i denne browser' })).toBeVisible();
});

test('English version, with matching reasons and demo profiles translated', async ({ page }) => {
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'A spare room. A student who needs a place to live.' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await checkA11y(page, 'front page in English');
  await page.getByRole('link', { name: 'I am a student' }).click();
  await page.getByRole('button', { name: 'Try as Emma' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Suggestions for you' })).toBeVisible();
  await expect(page.getByText('Why you fit together').first()).toBeVisible();
  await expect(page.getByText(/It is too quiet here/).first()).toBeVisible();
  await checkA11y(page, 'suggestions in English');
  await page.getByRole('link', { name: 'My profile' }).click();
  await expect(page.getByText('Nursing, UCL').first()).toBeVisible();
});

test('every other page passes the accessibility check', async ({ page }) => {
  for (const path of ['/#/start/vaert', '/#/opret/vaert', '/#/findes-ikke']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    await checkA11y(page, path);
  }
  for (const size of ['Stor', 'Størst']) {
    await page.goto('/');
    await page.getByRole('button', { name: size }).click();
    await checkA11y(page, `front page, text size ${size}`);
  }
});

/** As a made-up student: say yes to the first host and agree the first meeting. */
async function emmaMeetsFirstHost(page: Page) {
  await page.goto('/#/start/studerende');
  await page.getByRole('button', { name: 'Prøv som Emma' }).click();
  await page.getByRole('button', { name: /^Ja tak, jeg vil gerne møde/ }).first().click();
  await page.getByRole('link', { name: 'Aftal første møde' }).click({ timeout: 6000 });
  await page.getByLabel('Hvilken dag?').fill(tomorrow());
  await page.getByRole('button', { name: /^Send mødeforslag til/ }).click();
  await page.getByText('Mødet er aftalt.').waitFor({ timeout: 6000 });
}

test('trial period: weeks left, private check-in, time moved on the test page', async ({ page }) => {
  await emmaMeetsFirstHost(page);
  await page.getByRole('button', { name: 'Ja, jeg vil gerne gå videre' }).click();
  await page.getByRole('link', { name: 'Lav en aftale' }).click({ timeout: 6000 });

  await expect(page.getByRole('heading', { level: 1, name: /^Aftale mellem/ })).toBeVisible();
  // The weekly plan must have at least one day.
  const checked = page.locator('.plan input[type=checkbox]:checked');
  while (await checked.count() > 0) await checked.first().uncheck();
  await page.getByRole('button', { name: 'Gem aftalen, og sig ja' }).click();
  await expect(page.getByText('Fejl: Vælg mindst én dag i ugeplanen.')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Tirsdag' }).check();
  await page.getByLabel('Tirsdag: hvor længe?').selectOption('3');
  await page.getByRole('button', { name: 'Gem aftalen, og sig ja' }).click();
  await expect(page.getByText(/^Tirsdag: .+, 3 timer$/)).toBeVisible();

  await page.getByRole('link', { name: 'Se prøveperioden' }).click({ timeout: 6000 });
  await expect(page.getByText('Der er 4 uger tilbage af prøveperioden.')).toBeVisible();
  await expect(page.getByText('I er i uge 1 af 4.')).toBeVisible();
  await checkA11y(page, 'trial period');
  await page.getByRole('button', { name: 'Nogenlunde' }).click();
  await expect(page.getByText('Dit svar for denne uge: Nogenlunde.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Læs gode råd om at bo sammen' })).toBeVisible();
  await checkA11y(page, 'trial period after check-in');
  const trialUrl = page.url();

  await page.goto('/#/test');
  await page.getByRole('button', { name: 'Spol en uge frem' }).click();
  await expect(page.getByText('Tiden er spolet 1 uge frem.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Nogenlunde' })).toBeVisible();

  await page.goto(trialUrl);
  await expect(page.getByText('Der er 3 uger tilbage af prøveperioden.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Godt', exact: true })).toBeVisible();
  await expect(page.getByText('Uge 1: Nogenlunde')).toBeVisible();

  await page.goto('/#/test');
  for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Spol en uge frem' }).click();
  await page.goto(trialUrl);
  await expect(page.getByText('Prøveperioden er slut.')).toBeVisible();
});

test('block: the person disappears both ways, and can be unblocked', async ({ page }) => {
  await page.goto('/#/start/studerende');
  await page.getByRole('button', { name: 'Prøv som Emma' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Inger' })).toBeVisible();
  await page.getByRole('link', { name: 'Bloker eller anmeld Inger' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bloker Inger' })).toBeVisible();
  await expect(page.getByText(/bliver din anmeldelse ikke sendt til nogen/)).toBeVisible();
  await checkA11y(page, 'block page');
  await page.getByLabel('Jeg føler mig utryg').check();
  await page.getByRole('button', { name: 'Bloker Inger' }).click();

  await expect(page.getByText('Inger er blokeret. I kan ikke se hinanden mere.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Inger' })).toHaveCount(0);

  // Inger no longer sees Emma either.
  await page.getByRole('button', { name: 'Skift profil' }).click();
  await page.goto('/#/start/vaert');
  await page.getByRole('button', { name: 'Prøv som Inger' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Forslag til dig' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Emma' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Skift profil' }).click();
  await page.goto('/#/start/studerende');
  await page.getByRole('button', { name: 'Prøv som Emma' }).click();
  await page.getByRole('link', { name: 'Min profil', exact: true }).click();
  await page.getByRole('button', { name: 'Fjern blokering af Inger' }).click();
  await expect(page.getByText('Du har ikke blokeret nogen.')).toBeVisible();
  await page.getByRole('link', { name: 'Forslag', exact: true }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Inger' })).toBeVisible();

  await page.goto('/#/test');
  await expect(page.getByRole('cell', { name: 'Jeg føler mig utryg' })).toBeVisible();
});

test('block from inside a connection ends it', async ({ page }) => {
  await emmaMeetsFirstHost(page);
  const name = (await page.locator('main h1').innerText()).replace('Første møde med ', '');
  await page.getByRole('link', { name: `Bloker eller anmeld ${name}` }).click();
  await page.getByRole('button', { name: `Bloker ${name}` }).click();
  await expect(page.getByRole('heading', { level: 3, name })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Dem, du har sagt ja tak til' })).toHaveCount(0);
});

test('safety page: linked from the footer and the meeting, readable and accessible', async ({ page }) => {
  await page.getByRole('link', { name: 'Tryghed og gode råd' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tryghed og gode råd' })).toBeVisible();
  await expect(page.locator('main h2')).toHaveCount(4);
  await checkA11y(page, 'safety page');
  await emmaMeetsFirstHost(page);
  await page.getByRole('link', { name: 'Læs gode råd før jeres møde' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tryghed og gode råd' })).toBeVisible();
});

test('verified label shows on student cards in words', async ({ page }) => {
  await page.goto('/#/start/vaert');
  await page.getByRole('button', { name: 'Prøv som Inger' }).click();
  await expect(page.getByText('Verificeret studerende').first()).toBeVisible();
  await expect(page.getByText('Ikke verificeret').first()).toBeVisible();
});

test('filter and sort the new suggestions', async ({ page }) => {
  await page.goto('/#/start/studerende');
  await page.getByRole('button', { name: 'Prøv som Emma' }).click();
  await expect(page.getByText('Viser 6 af 6 nye forslag.')).toBeVisible();
  await checkA11y(page, 'suggestions with filters');

  await page.getByLabel('Område').selectOption('Dalum');
  await expect(page.getByText('Viser 1 af 6 nye forslag.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Inger' })).toBeVisible();

  await page.getByLabel('Område').selectOption('Vollsmose');
  await expect(page.getByText(/Ingen nye forslag passer til dit valg/)).toBeVisible();
  await page.getByRole('button', { name: 'Vis alle nye forslag' }).click();

  await page.getByLabel('Højeste husleje').selectOption('2000');
  await expect(page.getByText('Viser 3 af 6 nye forslag.')).toBeVisible();
  await page.getByLabel('Højeste husleje').selectOption('0');
  await page.getByLabel('Vis kun værter, der ønsker samvær').check();
  await expect(page.getByRole('heading', { level: 3, name: 'Erik' })).toHaveCount(0);
  await page.getByLabel('Vis kun værter, der ønsker samvær').uncheck();

  await page.getByLabel('Rækkefølge').selectOption('money');
  // Cheapest first: Grethe's room is 1500 kr.
  await expect(page.locator('.card h3').first()).toHaveText('Grethe');

  await page.goto('/#/test');
  await expect(page.getByRole('row', { name: /Brugte filter/ }).first()).toBeVisible();
});

test('message thread after a mutual match, with an automatic reply', async ({ page }) => {
  await page.goto('/#/start/studerende');
  await page.getByRole('button', { name: 'Prøv som Emma' }).click();
  await page.getByRole('button', { name: /^Ja tak, jeg vil gerne møde/ }).first().click();
  await page.getByRole('link', { name: /^Skriv til/ }).click({ timeout: 6000 });
  await expect(page.getByRole('heading', { level: 1, name: /^Beskeder med/ })).toBeVisible();
  await expect(page.getByText('I har ikke skrevet til hinanden endnu.')).toBeVisible();
  await checkA11y(page, 'messages, empty');

  await page.getByRole('button', { name: /^Send besked til/ }).click();
  await expect(page.getByText('Fejl: Skriv en besked, før du sender.')).toBeVisible();
  await page.getByLabel('Din besked').fill('Hej, jeg hedder Emma. Hvordan er haven?');
  await page.getByRole('button', { name: /^Send besked til/ }).click();
  await expect(page.getByText('Du skrev')).toBeVisible();
  await expect(page.getByText(/ skrev$/).filter({ hasNotText: 'Du' })).toBeVisible({ timeout: 6000 });
  await expect(page.getByText('Hej! Tak for din besked. Jeg glæder mig til at møde dig.')).toBeVisible();
  await checkA11y(page, 'messages, with replies');

  // The log records that a message was sent, never what it said.
  await page.goto('/#/test');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Hent denne test som CSV-fil' }).click(),
  ]);
  const fs = await import('node:fs');
  const csv = fs.readFileSync(await download.path(), 'utf-8');
  expect(csv).toContain('message_sent');
  expect(csv).not.toContain('haven');
});

test('helper mode: a relative makes the profile with the older person', async ({ page }) => {
  await page.goto('/#/start/vaert');
  await page.getByRole('link', { name: 'Jeg hjælper en ældre med at lave en profil' }).click();
  await expect(page.getByText(/^Til hjælperen: Læs spørgsmålene højt/)).toBeVisible();
  await checkA11y(page, 'profile form in helper mode');
  await page.getByLabel('Fornavn').fill('Ruth');
  await page.getByLabel('Fortæl lidt om dig selv').fill('Jeg bor alene i et stort hus.');
  await next(page);
  await expect(page.getByText('Fejl: Vælg, hvem der hjælper dig.')).toBeVisible();
  await page.getByLabel('Hvem hjælper dig?').selectOption('grandchild');
  await next(page);
  await page.getByLabel('Hvilket område bor du i?').selectOption('Tarup');
  await page.getByLabel('Beskriv værelset').fill('Værelse med skrivebord.');
  await page.getByLabel('Hvad skal huslejen være om måneden?').fill('1800');
  await next(page);
  await page.getByLabel('Samvær og snak').check();
  await page.getByLabel('Hvor mange timer om ugen ønsker du?').fill('4');
  await next(page);
  await next(page);
  await page.getByRole('checkbox', { name: /^Jeg siger ja til/ }).check();
  await page.getByRole('button', { name: 'Gem min profil og se forslag' }).click();

  await page.getByRole('link', { name: 'Min profil', exact: true }).click();
  await expect(page.getByText('Ja, Ruth har lavet profilen sammen med sit barnebarn.')).toBeVisible();

  // Students see that a helper took part.
  await page.getByRole('button', { name: 'Skift profil' }).click();
  await page.goto('/#/start/studerende');
  await page.getByRole('button', { name: 'Prøv som Jonas' }).click();
  await expect(page.locator('.card').filter({ hasText: 'Ruth' }).getByText('Lavet sammen med en hjælper')).toBeVisible();
});

test('avatars are drawn from the first letter, and hidden from screen readers', async ({ page }) => {
  await page.goto('/#/start/vaert');
  await page.getByRole('button', { name: 'Prøv som Inger' }).click();
  const avatar = page.locator('.card svg.avatar').first();
  await expect(avatar).toHaveAttribute('aria-hidden', 'true');
  const name = await page.locator('.card h3').first().innerText();
  await expect(avatar.locator('text')).toHaveText(name[0]);
  await expect(page.locator('img')).toHaveCount(0);
});

test('printed agreement has both names, the date and room for signatures', async ({ page }) => {
  await emmaMeetsFirstHost(page);
  await page.getByRole('button', { name: 'Ja, jeg vil gerne gå videre' }).click();
  await page.getByRole('link', { name: 'Lav en aftale' }).click({ timeout: 6000 });
  await page.getByRole('button', { name: 'Gem aftalen, og sig ja' }).click();
  await page.getByRole('link', { name: 'Se prøveperioden' }).waitFor({ timeout: 6000 });

  await expect(page.getByText('Underskrift: Emma')).toBeHidden();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByText(/^Aftalen er mellem Emma \(studerende\) og .+ \(vært\)\.$/)).toBeVisible();
  await expect(page.getByText(/^Udskrevet \d/)).toBeVisible();
  await expect(page.getByText('Underskrift: Emma')).toBeVisible();
  await expect(page.locator('.signatures__line--date')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Udskriv aftalen' })).toBeHidden();
  await expect(page.locator('header.top')).toBeHidden();
});
