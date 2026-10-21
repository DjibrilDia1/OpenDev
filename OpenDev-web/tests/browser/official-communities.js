// Read-only browser check against the actual development catalogue, no interception.
async (page) => {
  const checks = []
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name) }
  await page.setViewportSize({ width: 1340, height: 824 })
  await page.goto('http://127.0.0.1:5174/decouvrir?type=official')
  await page.getByRole('status').filter({ hasText: '12 communautés' }).waitFor()
  check(await page.locator('.community-card').count() === 12, 'Douze communautés officielles réelles visibles')
  check(await page.locator('.community-card .community-kind').evaluateAll(nodes => nodes.every(node => node.textContent.trim() === 'Officielle OpenDev')), 'Badges officiels issus du backend')
  check(await page.getByText('1 membre', { exact: true }).count() === 12, 'Compte propriétaire réel et compteurs corrects')
  await page.getByRole('button', { name: 'Frontend', exact: true }).click()
  check(await page.locator('.community-card').count() === 2, 'Filtre Frontend : React et TypeScript')
  await page.getByRole('link', { name: 'React', exact: true }).click()
  await page.getByRole('heading', { name: 'React', exact: true }).waitFor()
  check(await page.getByText('Administrée par l’équipe OpenDev', { exact: true }).count() === 1, 'Gestion officielle affichée sur la communauté')
  check(await page.getByRole('button', { name: /Modifier et gérer/ }).count() === 0, 'Aucune gestion proposée au visiteur anonyme')
  await page.getByRole('button', { name: 'Membres', exact: true }).click()
  await page.locator('.developer-row').first().waitFor()
  check(await page.locator('.developer-row').count() === 1, 'Liste des membres réellement rejoints, sans heuristique de tags')
  check(await page.locator('.developer-row').getByRole('link', { name: 'OpenDev', exact: true }).count() === 1, 'Le membre propriétaire est @opendev')
  await page.reload()
  await page.locator('.developer-row').first().waitFor()
  check(await page.locator('.developer-row').count() === 1, 'Liste réelle conservée après rafraîchissement')
  await page.setViewportSize({ width: 390, height: 844 })
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page de communauté mobile sans débordement')
  await page.screenshot({ path: 'output/playwright/official-community-mobile.png' })
  await page.setViewportSize({ width: 1340, height: 824 })
  await page.goto('http://127.0.0.1:5174/decouvrir?type=official')
  await page.getByRole('status').filter({ hasText: '12 communautés' }).waitFor()
  await page.locator('#communautes').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'output/playwright/official-communities-desktop.png' })
  return { checks }
}
