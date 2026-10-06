import { Link, Route, Routes } from 'react-router-dom'

function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="max-w-2xl text-center">
        <div className="mx-auto mb-7 flex size-16 items-center justify-center rounded-2xl bg-indigo-500/15 font-mono text-xl font-bold text-cyan-300 ring-1 ring-indigo-400/20">{'</>'}</div>
        <p className="mb-4 font-mono text-sm font-medium tracking-wide text-cyan-300">LA COMMUNAUTÉ DES DÉVELOPPEURS</p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">Construisons mieux, <span className="text-indigo-300">ensemble.</span></h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">Un espace fait par des développeurs pour discuter, apprendre, partager et donner vie à de nouvelles idées.</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400" to="/communaute">Explorer OpenDev</Link>
          <span className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300">Supabase à configurer</span>
        </div>
      </section>
    </main>
  )
}

function CommunityPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
      <p className="font-mono text-sm text-cyan-300">OPENDEV / COMMUNAUTÉ</p>
      <h1 className="mt-4 text-4xl font-bold text-white">Le fil arrive bientôt.</h1>
      <p className="mt-4 text-slate-400">La structure est prête à accueillir le design et les écrans de communauté.</p>
      <Link className="mt-8 text-sm font-semibold text-indigo-300 hover:text-indigo-200" to="/">← Retour à l’accueil</Link>
    </main>
  )
}

export default function App() {
  return <div className="min-h-screen bg-[#0b1020] text-slate-100"><Routes><Route element={<HomePage />} path="/" /><Route element={<CommunityPage />} path="/communaute" /><Route element={<HomePage />} path="*" /></Routes></div>
}
