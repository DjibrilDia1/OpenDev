// Real local integration: Vite :5175, FastAPI :8001, Supabase :55321, Mailpit :55324.
// Run with playwright-cli run-code. Creates local fixture accounts only; no mocks.
async (page) => {
  const checks = []
  const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label) }
  const base = 'http://127.0.0.1:5175'
  const suffix = Date.now().toString(36)
  const email = `onboarding-${suffix}@example.test`
  const password = `Local-test-${crypto.randomUUID()}!`
  const username = `équipe@ ${suffix}`
  const api = (path, method = 'GET', body) => page.evaluate(async args => (await import('/src/lib/api.ts')).api(args.path, args.method, args.body), { path, method, body })
  async function mail(type, address = email) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const inbox = await (await page.request.get('http://127.0.0.1:55324/api/v1/messages')).json()
      for (const letter of inbox.messages.filter(m => m.To?.some(to => to.Address === address))) {
        const message = await (await page.request.get('http://127.0.0.1:55324/api/v1/message/' + letter.ID)).json()
        const links = (message.HTML || message.Text || '').match(/https?:[^\s"<>]+/g) || []
        const link = links.map(s => s.replaceAll('&amp;', '&')).find(s => s.includes('/auth/v1/verify?') && s.includes('type=' + type))
        if (link) return link
      }
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    throw Error('Local test email not received')
  }
  const dialog = page.getByRole('dialog')
  const wizard = page.locator('dialog.setup-wizard')
  async function login(secret) {
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email)
    await dialog.getByLabel(/^Mot de passe/).fill(secret)
    await dialog.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
  }
  async function logout() {
    await page.goto(base + '/parametres')
    await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click()
    await page.getByRole('button', { name: 'Se connecter', exact: true }).waitFor()
  }
  await page.goto(base)
  await page.evaluate(async () => (await import('/src/lib/supabase.ts')).supabase.auth.signOut())
  await page.goto(base + '/profil')
  await page.getByRole('heading', { name: 'Connecte-toi à OpenDev', exact: true }).waitFor()
  check(true, 'Guest profile route protected')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await dialog.getByRole('button', { name: 'Créer un compte', exact: true }).click()
  for (const [name, value] of [['Prénom', 'Ada'], ['Nom', 'Lovelace'], ['Nom d’utilisateur', username], ['E-mail', email]]) await dialog.getByRole('textbox', { name, exact: true }).fill(value)
  await dialog.getByLabel(/^Mot de passe/).fill(password)
  await dialog.getByLabel(/^Confirmer le mot de passe/).fill(password + 'different')
  await dialog.getByRole('button', { name: 'Créer mon compte', exact: true }).click()
  await dialog.getByText('Les mots de passe ne correspondent pas.', { exact: true }).waitFor()
  check(true, 'Mismatched password confirmation rejected')
  await dialog.getByLabel(/^Confirmer le mot de passe/).fill(password)
  await dialog.getByRole('button', { name: 'Créer mon compte', exact: true }).click()
  await dialog.getByRole('heading', { name: 'Vérifie ton e-mail', exact: true }).waitFor()
  check(true, 'Real signup requires email confirmation')
  const publicKey = await page.evaluate(async () => (await import('/src/lib/supabase.ts')).supabase.supabaseKey)
  const token = secret => page.request.post('http://127.0.0.1:55321/auth/v1/token?grant_type=password', { headers: { apikey: publicKey }, data: { email, password: secret } })
  const unverified = await token(password)
  check(unverified.status() === 400 && (await unverified.json()).error_code === 'email_not_confirmed', 'Unverified email cannot log in')
  await page.goto(await mail('signup'))
  await wizard.getByRole('textbox', { name: 'Métier ou spécialité', exact: true }).waitFor()
  const initial = await api('/me/state')
  check(initial.profile.username === username && initial.profile.first_name === 'Ada' && !initial.profile.onboarding_completed_at, 'Auth trigger saves chosen username and signup information')
  check(await page.getByRole('main', { name: 'Configuration du compte', exact: true }).count() === 1, 'First login cannot access feed before setup')
  check(!(await api('/auth/username-availability?username=' + encodeURIComponent(username))).available, 'Real API rejects duplicate username')
  await wizard.getByRole('textbox', { name: 'Métier ou spécialité', exact: true }).fill('Développeuse React')
  const image = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 8; c.getContext('2d').fillRect(0, 0, 8, 8); return c.toDataURL('image/png').split(',')[1] })
  await wizard.locator('input[type=file]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  await wizard.getByRole('img', { name: 'Ta photo de profil', exact: true }).waitFor()
  check(true, 'Real avatar upload succeeds with caller token')
  await wizard.getByRole('button', { name: 'Suivant', exact: true }).click()
  const search = wizard.getByRole('textbox', { name: 'Stack et compétences', exact: true })
  await search.fill('React')
  await search.press('Enter')
  await wizard.getByRole('button', { name: 'Suivant', exact: true }).click()
  await wizard.getByRole('button', { name: 'Frontend', exact: true }).click()
  await wizard.getByRole('button', { name: 'Suivant', exact: true }).click()
  await page.reload()
  await wizard.getByRole('heading', { name: 'Communautés', exact: true }).waitFor()
  check((await api('/me/onboarding')).data.tags.includes('React'), 'Real database restores draft and stage after reload')
  const peerEmail = `peer-${suffix}@example.test`
  const headers = { apikey: publicKey }
  const peerSignup = await page.request.post('http://127.0.0.1:55321/auth/v1/signup', { headers, data: { email: peerEmail, password, data: { full_name: 'Grace ' + suffix, first_name: 'Grace', last_name: suffix, username: 'grace-' + suffix, headline: 'React TypeScript engineer' } } })
  check(peerSignup.ok(), 'Peer fixture registered through real Auth')
  await page.request.get(await mail('signup', peerEmail))
  const peerLogin = await (await page.request.post('http://127.0.0.1:55321/auth/v1/token?grant_type=password', { headers, data: { email: peerEmail, password } })).json()
  const peerHeaders = { Authorization: 'Bearer ' + peerLogin.access_token }
  const communityName = 'React Developers ' + suffix
  const communityCreated = await page.request.post('http://127.0.0.1:8001/api/v1/communities', { headers: peerHeaders, data: { name: communityName, slug: 'react-' + suffix, description: 'React et TypeScript, communauté de test locale.', tags: ['react', 'typescript'] } })
  check(communityCreated.ok(), 'Peer creates real community with caller RLS')
  await page.reload()
  const community = wizard.locator('article').filter({ hasText: communityName })
  await community.getByRole('button', { name: 'Rejoindre', exact: true }).click()
  await community.getByRole('button', { name: 'Quitter', exact: true }).click()
  await community.getByRole('button', { name: 'Rejoindre', exact: true }).click()
  await wizard.getByRole('button', { name: 'Continuer', exact: true }).click()
  const peer = wizard.locator('article').filter({ hasText: 'Grace ' + suffix })
  await peer.getByRole('button', { name: 'Suivre', exact: true }).click()
  await peer.getByRole('button', { name: 'Ne plus suivre', exact: true }).click()
  await peer.getByRole('button', { name: 'Suivre', exact: true }).click()
  await wizard.getByRole('button', { name: 'Continuer', exact: true }).click()
  await wizard.getByRole('button', { name: 'Découvrir mon fil', exact: true }).click()
  await wizard.waitFor({ state: 'hidden' })
  const me = await api('/me/state')
  check(me.profile.onboarding_completed_at && me.profile.tags.includes('React') && me.preferences.interests.includes('Frontend') && me.profile.avatar_url.includes('/profile-avatars/'), 'Atomic completion saves profile, avatar and preferences')
  check(await api('/me/onboarding') === null, 'Completed draft cleared')
  check(me.memberships.length === 1 && me.following.includes(peerLogin.user.id), 'Join/leave and follow/unfollow persisted in real database')
  const body = 'React : publication de vérification ' + suffix
  const publication = await page.request.post('http://127.0.0.1:8001/api/v1/posts', { headers: peerHeaders, data: { title: 'React local integration', body, tags: ['react'] } })
  check(publication.ok(), 'Followed peer creates real publication')
  await page.reload()
  await page.getByRole('heading', { name: 'Accueil', exact: true }).waitFor()
  check(await wizard.count() === 0, 'Completed account remains outside onboarding after refresh')
  await page.getByText(body, { exact: true }).waitFor()
  check(true, 'Feed shows real relevant content from followed peer')
  await page.goto(base + '/profil/' + encodeURIComponent(username))
  await page.getByRole('heading', { name: 'Ada Lovelace', exact: true }).waitFor()
  check(true, 'Profile URL supports Unicode, internal @ and spaces')
  await logout()
  await login(password)
  check((await api('/me/state')).profile.onboarding_completed_at && await wizard.count() === 0, 'Logout and login preserve completion')
  await logout()
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await dialog.getByRole('button', { name: 'Mot de passe oublié ?', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email)
  await dialog.getByRole('button', { name: 'Envoyer le lien', exact: true }).click()
  await dialog.getByText('Si un compte correspond à cette adresse, tu recevras un lien pour choisir un nouveau mot de passe.', { exact: true }).waitFor()
  await page.goto(await mail('recovery'))
  await dialog.getByRole('heading', { name: 'Choisis ton nouveau mot de passe', exact: true }).waitFor()
  const replacement = password + '-updated'
  await dialog.getByLabel(/^Nouveau mot de passe/).fill(replacement)
  await dialog.getByLabel(/^Confirmer le mot de passe/).fill(replacement)
  await dialog.getByRole('button', { name: 'Enregistrer le mot de passe', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  check(!(await token(password)).ok() && (await token(replacement)).ok(), 'Real recovery email replaces password and rejects old credentials')
  await page.goto(base + '/parametres')
  await page.getByRole('link', { name: 'Modifier mon mot de passe', exact: true }).click()
  await dialog.getByRole('heading', { name: 'Choisis ton nouveau mot de passe', exact: true }).waitFor()
  const changed = replacement + '-settings'
  await dialog.getByLabel(/^Nouveau mot de passe/).fill(changed)
  await dialog.getByLabel(/^Confirmer le mot de passe/).fill(changed)
  await dialog.getByRole('button', { name: 'Enregistrer le mot de passe', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  check(!(await token(replacement)).ok() && (await token(changed)).ok(), 'Authenticated user changes password from account settings')
  await page.screenshot({ path: 'output/playwright/real-auth-completed.png' })
  await page.evaluate(async () => (await import('/src/lib/supabase.ts')).supabase.auth.signOut())
  return { checks, environment: 'Local Supabase Auth, PostgreSQL/RLS, Storage, Mailpit; no interception' }
}
