import React, { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import {
  SearchIcon,
  SendIcon,
  PaperclipIcon,
  SmileIcon,
  CodeIcon,
  FilePdfIcon,
  DownloadIcon,
  MoreHorizontalIcon,
} from '../components/common/Icons'
import { conversationsList, currentUser } from '../mocks/opendev-data'
import type { Conversation, DirectMessage } from '../types'

export const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>(conversationsList)
  const [activeConvId, setActiveConvId] = useState<string>('conv-amina')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0]

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const newMsg: DirectMessage = {
      id: `m-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.avatarInitials,
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: true,
      isRead: false,
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastMessage: inputText,
            time: 'À l’instant',
            messages: [...c.messages, newMsg],
          }
        }
        return c
      })
    )
    setInputText('')
  }

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'unread' && (!c.unreadCount || c.unreadCount === 0)) return false
    if (searchQuery) {
      return (
        c.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return true
  })

  return (
    <AppLayout sidebarVariant="none" showRail={true}>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* PAGE TITLE */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0e0e0e]">
          Messages
        </h1>

        {/* 2-COLUMN MESSAGES CONTAINER (FIGMA STYLE) */}
        <div className="bg-white border border-[#e0e0e0] rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[720px]">
          {/* LEFT COLUMN: CONVERSATION LIST */}
          <div className="w-full md:w-80 lg:w-96 border-r border-[#e5e7eb] flex flex-col shrink-0">
            {/* Header with counter */}
            <div className="p-4 border-b border-[#f0f0f0]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-[#0e0e0e]">Conversations</h3>
                <span className="text-xs text-[#757575] font-semibold">
                  {conversations.length}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9e9e9e]">
                  <SearchIcon size={14} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une conversation..."
                  className="w-full bg-[#f8f8f6] border border-[#e5e7eb] rounded-xl pl-9 pr-3 py-2 text-xs text-[#0e0e0e] placeholder-[#9e9e9e] focus:outline-none focus:bg-white"
                />
              </div>

              {/* Filter Pills (Toutes / Non lues) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filter === 'all'
                      ? 'bg-[#0e0e0e] text-white'
                      : 'bg-[#f4f4f5] text-[#616161] hover:text-[#0e0e0e]'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filter === 'unread'
                      ? 'bg-[#0e0e0e] text-white'
                      : 'bg-[#f4f4f5] text-[#616161] hover:text-[#0e0e0e]'
                  }`}
                >
                  Non lues · 2
                </button>
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f0]">
              {filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`p-3.5 sm:p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#f8f8f6]'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e]">
                        {conv.participant.initials}
                      </div>
                      {conv.participant.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#0e0e0e] truncate">
                            {conv.participant.name}
                          </h4>
                          {conv.participant.tag && (
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                conv.participant.tag === 'React'
                                  ? 'bg-blue-50 text-blue-600'
                                  : conv.participant.tag === 'Python'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {conv.participant.tag}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#9e9e9e] shrink-0">
                          {conv.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-[#757575] truncate">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount && conv.unreadCount > 0 ? (
                          <span className="w-4 h-4 rounded-full bg-[#0e0e0e] text-white text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">
                            {conv.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom Current User Status Indicator */}
            <div className="p-3 border-t border-[#f0f0f0] flex items-center justify-between bg-[#fafaf9]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e]">
                  JD
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#0e0e0e]">{currentUser.name}</h5>
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span>Disponible</span>
                  </p>
                </div>
              </div>
              <span className="text-xs text-[#9e9e9e]">▾</span>
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE CHAT AREA */}
          <div className="flex-1 flex flex-col justify-between min-w-0 bg-white">
            {/* Chat Top Header */}
            <div className="p-4 border-b border-[#f0f0f0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e]">
                    {activeConversation.participant.initials}
                  </div>
                  {activeConversation.participant.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0e0e0e]">
                    {activeConversation.participant.name}
                  </h3>
                  <p className="text-[11px] text-[#757575]">
                    {activeConversation.participant.statusText}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#757575]">
                <button className="p-1.5 hover:text-[#0e0e0e] hover:bg-neutral-100 rounded-lg">
                  <SearchIcon size={16} />
                </button>
                <button className="p-1.5 hover:text-[#0e0e0e] hover:bg-neutral-100 rounded-lg">
                  <MoreHorizontalIcon size={16} />
                </button>
              </div>
            </div>

            {/* Context Community Header Pill (if present) */}
            {activeConversation.contextTitle && (
              <div className="px-5 py-2.5 bg-[#f8f8f6] border-b border-[#f0f0f0] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#616161] truncate">
                  <span>💬</span>
                  <span className="text-[11px] text-[#757575]">
                    {activeConversation.contextCommunity}
                  </span>
                  <strong className="text-[#0e0e0e] truncate font-medium">
                    {activeConversation.contextTitle}
                  </strong>
                </div>
                <button className="text-[#616161] hover:text-[#0e0e0e] text-xs font-semibold ml-2 shrink-0">
                  ↗
                </button>
              </div>
            )}

            {/* Chat Messages Stream */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Date divider */}
              <div className="flex items-center justify-center">
                <span className="text-[11px] text-[#9e9e9e] px-3 py-0.5 bg-[#f8f8f6] rounded-full">
                  Aujourd'hui, 7 octobre
                </span>
              </div>

              {activeConversation.messages.map((msg: DirectMessage) => {
                const isOutgoing = msg.isOutgoing

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      isOutgoing ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isOutgoing && (
                      <div className="w-8 h-8 rounded-full bg-[#f2f2f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-bold text-[#0e0e0e] shrink-0 mt-1">
                        {msg.senderInitials}
                      </div>
                    )}

                    <div className={`max-w-md space-y-1 ${isOutgoing ? 'items-end' : 'items-start'}`}>
                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                          isOutgoing
                            ? 'bg-[#eff5ff] text-[#0e0e0e] border border-blue-100 rounded-br-sm'
                            : 'bg-[#f4f4f5] text-[#0e0e0e] rounded-bl-sm'
                        }`}
                      >
                        <p>{msg.text}</p>

                        {/* Attached PDF document */}
                        {msg.attachment && (
                          <div className="mt-3 bg-white border border-[#e0e0e0] rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                                <FilePdfIcon size={18} />
                              </div>
                              <div className="min-w-0">
                                <h6 className="font-bold text-xs text-[#0e0e0e] truncate">
                                  {msg.attachment.name}
                                </h6>
                                <p className="text-[10px] text-[#757575]">
                                  {msg.attachment.type.toUpperCase()} · {msg.attachment.pages} · {msg.attachment.size}
                                </p>
                              </div>
                            </div>
                            <button
                              aria-label="Télécharger"
                              className="p-1.5 rounded-lg hover:bg-neutral-100 text-[#616161] hover:text-[#0e0e0e] transition-colors shrink-0"
                            >
                              <DownloadIcon size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Time & Read status */}
                      <div className={`flex items-center gap-1 text-[10px] text-[#9e9e9e] px-1 ${
                        isOutgoing ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{msg.time}</span>
                        {isOutgoing && (
                          <span className="text-blue-500 font-bold">✓✓ Lu</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom Message Input Box */}
            <div className="p-4 border-t border-[#f0f0f0] bg-white">
              <form onSubmit={handleSendMessage} className="border border-[#e0e0e0] rounded-2xl p-3 focus-within:border-neutral-400 transition-colors shadow-xs">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Écrire à ${activeConversation.participant.name}...`}
                  className="w-full bg-transparent border-none text-xs sm:text-sm text-[#0e0e0e] placeholder-[#9e9e9e] focus:outline-none resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                />

                <div className="flex items-center justify-between pt-2 border-t border-[#f4f4f5]">
                  <div className="flex items-center gap-3 text-[#757575]">
                    <button type="button" className="hover:text-[#0e0e0e] transition-colors">
                      <PaperclipIcon size={16} />
                    </button>
                    <button type="button" className="hover:text-[#0e0e0e] transition-colors">
                      <SmileIcon size={16} />
                    </button>
                    <button type="button" className="hover:text-[#0e0e0e] transition-colors">
                      <CodeIcon size={16} />
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="bg-[#0e0e0e] text-white hover:bg-neutral-800 transition-colors text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <span>Envoyer</span>
                    <SendIcon size={12} />
                  </button>
                </div>
              </form>

              <p className="text-[10px] text-[#9e9e9e] mt-1.5 pl-1">
                Entrée pour envoyer · Maj + Entrée pour aller à la ligne
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
