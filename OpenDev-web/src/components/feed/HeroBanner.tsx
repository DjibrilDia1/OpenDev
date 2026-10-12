import React from 'react'
import codeBracketsSvg from '../../assets/emblems/code-brackets.svg'

export const HeroBanner: React.FC = () => {
  return (
    <div className="bg-[#0e0e0e] text-white rounded-2xl p-6 sm:p-8 flex items-center justify-between gap-4 relative overflow-hidden shadow-sm">
      <div className="max-w-xl">
        <p className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase mb-2">
          LE SAVIEZ-VOUS ?
        </p>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
          Le meilleur code est celui qu’on partage.
        </h2>
        <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
          Pose une question, partage une découverte ou aide quelqu’un à débloquer son projet.
        </p>
      </div>

      <div className="hidden sm:flex shrink-0">
        <img
          src={codeBracketsSvg}
          alt="{}"
          className="w-14 h-14 rounded-2xl shadow-inner select-none"
        />
      </div>
    </div>
  )
}
