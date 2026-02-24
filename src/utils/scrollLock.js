/**
 * Shared scroll lock utility for modal stacking.
 * Uses a reference counter so nested modals don't unlock body scroll
 * when an inner modal closes while an outer one is still open.
 */
let lockCount = 0;

export function lockScroll() {
  lockCount++;
  document.body.style.overflow = 'hidden';
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}
