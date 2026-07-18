"use client";

import type { WhatsAppMessage } from "@/lib/whatsapp";
import { waLink } from "@/lib/whatsapp";

export default function WhatsAppButton({ message }: { message: WhatsAppMessage }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={waLink(message)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-green-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/25 transition hover:from-green-400 hover:to-green-500 sm:w-auto sm:px-6"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.87 9.87 0 0 0 4.74 1.21h.01c5.45 0 9.89-4.44 9.89-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.78.97-.15.17-.29.19-.54.06a6.73 6.73 0 0 1-3.35-2.93c-.25-.43.25-.4.72-1.34.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.6.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
        </svg>
        Send on WhatsApp
      </a>
      {!message.phone && (
        <span className="text-xs text-slate-500">
          No phone number saved for this distributor — WhatsApp will ask you to
          pick the contact.
        </span>
      )}
    </div>
  );
}
