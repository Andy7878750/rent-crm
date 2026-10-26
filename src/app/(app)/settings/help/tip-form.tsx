'use client';

import { useActionState, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { saveHelpTip, type HelpState } from '../actions';

export function TipForm({ k, label, text, file, defaultText }: { k: string; label: string; text: string; file: { name: string; type: string } | null; defaultText: string }) {
  const [state, action, pending] = useActionState<HelpState, FormData>(saveHelpTip.bind(null, k), {});
  const [value, setValue] = useState(text);
  const [picked, setPicked] = useState('');
  return (
    <form id={k} action={action} className="grid scroll-mt-24 gap-2 border-b border-[#edf0f5] px-4 py-3.5 last:border-b-0 sm:grid-cols-[180px_1fr]">
      <div className="pt-1.5 font-semibold">{label}<span className="block text-[11px] font-normal text-faint">{k}</span></div>
      <div className="flex flex-col gap-2">
        <span className="field items-start"><textarea name="text" value={value} onChange={(e) => setValue(e.target.value)} rows={3} maxLength={2000}
          className="min-h-[72px] w-full resize-y border-0 bg-transparent py-2 text-[14px] outline-none" /></span>
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          {file ? (
            <>
              <a href={`/help-file/${encodeURIComponent(k)}`} target="_blank" rel="noreferrer" className="font-semibold text-cta-ink hover:underline">📎 {file.name}</a>
              <label className="flex cursor-pointer items-center gap-1.5 text-muted"><input type="checkbox" name="dropFile" /> убрать файл</label>
            </>
          ) : <span className="text-muted">Файла нет</span>}
          <label className="btn cursor-pointer gap-1.5 px-3 py-1.5 text-[13px] focus-within:border-accent">
            <Paperclip size={15} /> {picked ? <span className="max-w-[220px] truncate">{picked}</span> : file ? 'Заменить файл' : 'Приложить файл'}
            <input type="file" name="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="sr-only"
              onChange={(e) => setPicked(e.target.files?.[0]?.name ?? '')} />
          </label>
          {picked && <span className="text-[12px] text-muted">нажмите «Сохранить», чтобы загрузить</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary px-3 py-1.5 text-[13px]" disabled={pending}>{pending ? 'Сохраняем…' : 'Сохранить'}</button>
          {value !== defaultText && <button type="button" className="text-[12px] text-muted hover:underline" onClick={() => setValue(defaultText)}>Вернуть текст по умолчанию</button>}
          <span className="text-[12px]" aria-live="polite">{state.error ? <span className="text-bad">{state.error}</span> : state.ok && !pending ? <span className="text-ok">Сохранено</span> : ''}</span>
        </div>
      </div>
    </form>
  );
}
