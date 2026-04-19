import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextBlock } from '../../types/page';

interface Props {
  block: TextBlock;
  onUpdate: (patch: { content: string }) => void;
}

export function TextBlockView({ block, onUpdate }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState(block.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep value in sync when block content changes externally
  useEffect(() => {
    setValue(block.content);
  }, [block.content]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    autoResize();
  }, [value]);

  const scheduleUpdate = useCallback(
    (content: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate({ content });
      }, 800);
    },
    [onUpdate],
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setValue(newValue);
    scheduleUpdate(newValue);
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value !== block.content) {
      onUpdate({ content: value });
    }
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={t('pages.textBlockPlaceholder')}
      rows={1}
      className="w-full resize-none bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none border border-transparent focus:border-gray-200 rounded-md px-2 py-1.5 transition-colors"
      aria-label="Text block content"
    />
  );
}
