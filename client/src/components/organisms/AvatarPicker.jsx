/**
 * client/src/components/organisms/AvatarPicker.jsx
 *
 * Grid-based avatar selection component.
 * User clicks an avatar to select it. No file upload.
 *
 * Props:
 *   avatars     — array of { id, label, url } from utils/avatars.js
 *   selected    — currently selected url string
 *   onSelect    — (url) => void callback
 *   columns     — grid columns (default 5)
 */

import React from 'react';

export default function AvatarPicker({ avatars = [], selected, onSelect, columns = 5 }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {avatars.map((avatar) => {
        const isSelected = selected === avatar.url;
        return (
          <button
            key={avatar.id}
            type="button"
            title={avatar.label}
            onClick={() => onSelect(avatar.url)}
            className={`
              relative rounded-xl overflow-hidden border-2 transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
              hover:scale-105 hover:shadow-md
              ${isSelected
                ? 'border-primary shadow-md scale-105'
                : 'border-transparent hover:border-primary/40'
              }
            `}
          >
            <img
              src={avatar.url}
              alt={avatar.label}
              className="w-full h-full aspect-square object-cover bg-surface-hover"
              loading="lazy"
            />
            {isSelected && (
              <div className="absolute inset-0 flex items-end justify-center pb-1 bg-primary/10">
                <span className="text-white text-[10px] font-bold bg-primary rounded-full px-1.5 py-0.5">
                  ✓
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
