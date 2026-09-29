import { Trophy, Users, Target, Star, Heart, Zap } from 'lucide-react';

const values = [
  { icon: Trophy, label: 'Excellence', desc: 'Striving for peak performance in every practice and competition.' },
  { icon: Users, label: 'Teamwork', desc: 'Building bonds and playing as a unified, cohesive unit.' },
  { icon: Target, label: 'Discipline', desc: 'Consistent training habits and respect for the game.' },
  { icon: Zap, label: 'Energy', desc: 'Bringing passion and drive to every session on the court.' },
  { icon: Heart, label: 'Sportsmanship', desc: 'Competing with integrity, respect, and fair play.' },
  { icon: Star, label: 'Leadership', desc: 'Developing future leaders who inspire those around them.' },
];

export default function About() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden card p-8 md:p-12 text-center border-brand-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.07)_0%,_transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-900/40 border border-brand-900/50 mb-6">
            <Trophy className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-50 tracking-tight mb-2">
            Sharda Sports Society
          </h1>
          <p className="text-brand-500 text-sm font-semibold tracking-[0.2em] uppercase mb-6">
            Sharda University · Greater Noida
          </p>
          <div className="w-16 h-0.5 bg-brand-600 mx-auto mb-6" />
          <p className="text-zinc-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Sharda Sports Society is dedicated to promoting sports, fitness, teamwork, and a healthy competitive spirit among students. The society provides students with opportunities to participate in various indoor and outdoor sports, training sessions, inter-university tournaments, and campus-level competitions.
          </p>
        </div>
      </div>

      {/* Mission */}
      <div className="card p-6 md:p-8">
        <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-400" /> Mission
        </h2>
        <p className="text-zinc-300 leading-relaxed">
          With dedicated coaches, sports facilities, and regular training activities, the society encourages students to develop their skills, discipline, leadership, and sportsmanship while representing Sharda University at different levels.
        </p>
      </div>

      {/* Values Grid */}
      <div>
        <h2 className="text-lg font-bold text-zinc-100 mb-4">Our Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {values.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="card p-5 group hover:border-brand-900/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-brand-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-900/50 transition-colors">
                  <Icon className="w-4.5 h-4.5 text-brand-400 w-[18px] h-[18px]" />
                </div>
                <h3 className="font-bold text-zinc-100">{label}</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* About AttendX */}
      <div className="card p-6 md:p-8 border-zinc-800/80">
        <h2 className="text-lg font-bold text-zinc-100 mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-400" /> About Attend<span className="text-brand-500">X</span>
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          <span className="text-zinc-200 font-semibold">Attend<span className="text-brand-500">X</span></span> is the official attendance and team management platform for Sharda Sports Society. It helps coaches, captains, and administrators track player attendance, monitor performance, manage rosters, and coordinate team activities — all in one place.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Players', value: '16' },
            { label: 'Roles', value: '4' },
            { label: 'Sessions', value: 'Tracked' },
            { label: 'Data', value: 'Secure' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-secondary rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-brand-400">{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-zinc-600 pb-2">
        Sharda Sports Society · Sharda University · Greater Noida, India
      </p>
    </div>
  );
}
