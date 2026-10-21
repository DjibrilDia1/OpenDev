// Browser contract checks: isolated fake identity and intercepted data, no account/email created.
async (page) => {
  const checks = []
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name) }
  await page.setViewportSize({ width: 1340, height: 725 })
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  const auth = page.getByRole('dialog')
  await auth.waitFor()
  const google = auth.getByRole('button', { name: 'Continuer avec Google', exact: true })
  const signup = auth.getByRole('button', { name: 'Créer un compte', exact: true })
  const forgot = auth.getByRole('button', { name: 'Mot de passe oublié ?', exact: true })
  const [g, s, f] = await Promise.all([google.boundingBox(), signup.boundingBox(), forgot.boundingBox()])
  check(s.y > g.y + g.height && f.y > g.y + g.height && s.x < g.x + 20, 'Liens regroupés en bas à gauche après Google')
  check(await auth.getByRole('button', { name: 'Renvoyer la confirmation d’e-mail', exact: true }).count() === 0, 'Lien de renvoi retiré de la connexion')
  await page.screenshot({ path: 'output/playwright/auth-footer-fixed.png' })
  await auth.getByRole('button', { name: 'Fermer', exact: true }).click()
  let profile = { id: 'ce0e5924-cde2-4e16-afdd-339a7d0fd535', username: 'user-ce0e5924cde2', first_name: 'Ada', last_name: 'Lovelace', full_name: 'Ada Lovelace', headline: '', bio: '', tags: [] }
  let draft = null
  let persisted
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    let data = []
    if (url.pathname.endsWith('/me/state')) data = { profile, memberships: [], likes: [], rsvps: [], following: [], preferences: profile.onboarding_completed_at ? { interests: ['Frontend'] } : null }
    if (url.pathname.endsWith('/auth/options')) data = { github: true, google: true }
    if (url.pathname.endsWith('/username-availability')) data = { available: url.searchParams.get('username') !== 'pris' }
    if (url.pathname.endsWith('/onboarding/catalog')) data = { technologies: [{ name: 'React', category: 'Web' }, { name: 'Python', category: 'Langages' }], interests: ['Frontend', 'Backend'] }
    if (url.pathname.endsWith('/me/onboarding')) { if (route.request().method() === 'PUT') draft = route.request().postDataJSON(); data = draft }
    if (url.pathname.endsWith('/profiles/me/onboarding')) { persisted = route.request().postDataJSON(); profile = { ...profile, ...persisted, onboarding_completed_at: new Date().toISOString() }; data = profile }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: profile.id, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString(), user_metadata: {} }) }))
  await page.evaluate(async id => {
    const { supabase } = await import('/src/lib/supabase.ts')
    const enc = x => btoa(JSON.stringify(x)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const result = await supabase.auth.setSession({ access_token: enc({ alg: 'HS256', typ: 'JWT' }) + '.' + enc({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 }) + '.' + enc('browser-test'), refresh_token: 'isolated-browser-only' })
    if (result.error) throw Error('Session fixture: ' + result.error.name + ' ' + result.error.message)
  }, profile.id)
  await page.reload()
  const wizard = page.locator('dialog.setup-wizard')
  await wizard.getByRole('textbox', { name: 'Nom d’utilisateur', exact: true }).waitFor()
  check(await wizard.locator('.onboarding-brand').count() === 0, 'Logo retiré, titre Complète ton profil conservé')
  check(await wizard.getByLabel('Localisation (facultatif)', { exact: true }).count() === 0 && await wizard.getByLabel('École (facultatif)', { exact: true }).count() === 0, 'Localisation et école retirées')
  check(await wizard.locator('.onboarding-body h3').evaluate(el => getComputedStyle(el).outlineStyle) === 'none', 'Titre sans encadrement au focus')
  check(await wizard.locator('input[required]').evaluateAll(inputs => inputs.every(el => [...el.labels].some(label => label.textContent.includes('*')))), 'Étoile sur chaque champ obligatoire')
  const username = wizard.getByRole('textbox', { name: 'Nom d’utilisateur', exact: true })
  await username.fill('é')
  await wizard.getByText('Ce nom d’utilisateur est disponible.', { exact: true }).waitFor()
  check(await wizard.locator('.username-field [role=status]').evaluate(el => getComputedStyle(el).color) === 'rgb(24, 113, 84)', 'Disponibilité verte et nom court accentué accepté')
  const spacing = await username.evaluate(el => ({ start: el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft), prefixEnd: el.previousElementSibling.getBoundingClientRect().right, shadow: getComputedStyle(el).boxShadow }))
  check(spacing.start > spacing.prefixEnd + 4 && spacing.shadow === 'none', 'Préfixe @ séparé du texte et un seul focus')
  await username.fill('pris')
  await wizard.getByText('Ce nom d’utilisateur est déjà pris.', { exact: true }).waitFor()
  check(await wizard.locator('.username-field [role=status]').evaluate(el => getComputedStyle(el).color) === 'rgb(180, 35, 24)', 'Disponibilité rouge si déjà pris')
  await username.fill('é')
  await wizard.getByText('Ce nom d’utilisateur est disponible.', { exact: true }).waitFor()
  await wizard.getByRole('textbox', { name: 'Métier ou spécialité', exact: true }).fill('Développeuse React')
  await page.screenshot({ path: 'output/playwright/onboarding-profile-fixed.png' })
  await wizard.getByRole('button', { name: 'Suivant', exact: true }).click()
  const search = wizard.getByRole('textbox', { name: 'Stack et compétences', exact: true })
  await search.waitFor()
  check(await wizard.locator('.setup-technology-options').count() === 0, 'Aucun catalogue affiché avant recherche')
  await search.fill('Rea')
  const react = wizard.getByRole('button', { name: /React Web/ })
  await react.waitFor()
  await search.focus()
  check(await search.evaluate(el => getComputedStyle(el).outlineStyle === 'none' && getComputedStyle(el).borderTopWidth === '0px'), 'Recherche sans contour interne doublé')
  const selectionSaved = page.waitForResponse(response => response.url().includes('/me/onboarding') && response.request().method() === 'PUT' && response.request().postDataJSON()?.data?.tags?.includes('React'))
  await search.press('Enter')
  check(await wizard.getByRole('button', { name: 'Retirer React', exact: true }).count() === 1 && await search.inputValue() === '', 'Entrée ajoute la technologie dans le champ')
  check(await wizard.locator('.skill-chip strong').evaluate(el => parseInt(getComputedStyle(el).fontWeight) >= 650), 'Technologie sélectionnée en gras')
  await selectionSaved
  await page.reload()
  await wizard.getByRole('textbox', { name: 'Stack et compétences', exact: true }).waitFor()
  check(await wizard.getByRole('button', { name: 'Retirer React', exact: true }).count() === 1, 'Étape et sélection reprises après rafraîchissement')
  await page.setViewportSize({ width: 390, height: 844 })
  await search.focus()
  await page.screenshot({ path: 'output/playwright/onboarding-search-mobile-fixed.png' })
  check(await wizard.evaluate(el => el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().right <= innerWidth), 'Popup mobile sans débordement')
  await wizard.getByRole('button', { name: 'Suivant', exact: true }).click()
  await wizard.getByRole('button', { name: 'Frontend', exact: true }).click()
  await wizard.getByRole('button', { name: 'Suivant', exact: true }).click()
  await wizard.getByRole('button', { name: 'Continuer', exact: true }).click()
  await wizard.getByRole('button', { name: 'Continuer', exact: true }).click()
  await wizard.getByRole('button', { name: 'Découvrir mon fil', exact: true }).click()
  await wizard.waitFor({ state: 'hidden' })
  check(persisted.username === 'é' && persisted.tags[0] === 'React' && persisted.interests[0] === 'Frontend', 'Parcours finalisé avec les choix enregistrés')
  await page.evaluate(() => localStorage.clear())
  await page.unrouteAll({ behavior: 'wait' })
  await page.goto('http://127.0.0.1:5174/')
  return { checks, note: 'UI/API contract checks with intercepted data; database tests run separately.' }
}
