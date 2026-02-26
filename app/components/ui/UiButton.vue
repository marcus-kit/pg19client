<script setup lang="ts">
/**
 * UiButton — единая кнопка для всего проекта
 *
 * Варианты (variant):
 * - primary   — градиент оранжевый→розовый, основное действие (как «Оплатить»)
 * - secondary — полупрозрачная с рамкой, вторичное действие
 * - ghost     — прозрачная без рамки, мягкое действие
 * - danger    — красная, деструктивное действие
 * - success   — зелёная, подтверждение
 *
 * Размеры (size): sm, md, lg
 * Модификаторы: block (100% ширина), loading (спиннер), disabled
 */

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false
})
</script>

<template>
  <button
    class="u-btn"
    :class="[
      `u-btn--${variant}`,
      `u-btn--${size}`,
      block && 'u-btn--block',
      (disabled || loading) && 'u-btn--disabled'
    ]"
    :disabled="disabled || loading"
  >
    <Icon v-if="loading" name="heroicons:arrow-path" class="u-btn__spinner" />
    <slot />
  </button>
</template>

<style>
/* =============================================================================
   UiButton — единая дизайн-система кнопок
   За основу: кнопка «Оплатить» (primary, градиент, тень, hover-подъём)
   Все варианты разделяют: скругление, вес шрифта, переходы, отступы
   ============================================================================= */

.u-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 0.625rem;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  outline: none;
  text-decoration: none;
  line-height: 1.25;
  letter-spacing: 0.01em;
}

.u-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--bg-base), 0 0 0 4px #F7941D;
}

/* ---------- Размеры ---------- */

.u-btn--sm {
  padding: 0.6rem 0.85rem;
  font-size: 0.8125rem;
  gap: 0.375rem;
}

.u-btn--md {
  padding: 0.6rem 1.15rem;
  font-size: 0.875rem;
  gap: 0.5rem;
}

.u-btn--lg {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  gap: 0.5rem;
}

/* ---------- PRIMARY — градиент, как «Оплатить» ---------- */

.u-btn--primary {
  background: linear-gradient(135deg, #F7941D, #E91E8C);
  color: #fff;
  box-shadow: 0 4px 14px -2px rgba(247, 148, 29, 0.35);
}

.u-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px -4px rgba(247, 148, 29, 0.45);
  filter: brightness(1.05);
}

.u-btn--primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px -2px rgba(247, 148, 29, 0.3);
}

/* ---------- SECONDARY — рамка + hover акцент ---------- */

.u-btn--secondary {
  background: var(--glass-bg);
  color: var(--btn-secondary-text);
  border: 1.5px solid var(--btn-secondary-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.u-btn--secondary:hover {
  border-color: #F7941D;
  color: #F7941D;
  background: var(--btn-secondary-hover-bg);
  box-shadow: 0 4px 12px -2px rgba(247, 148, 29, 0.15);
  transform: translateY(-1px);
}

.u-btn--secondary:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* ---------- GHOST — мягкая, прозрачная ---------- */

.u-btn--ghost {
  background: transparent;
  color: var(--text-secondary);
}

.u-btn--ghost:hover {
  color: var(--text-primary);
  background: var(--glass-bg);
}

.u-btn--ghost:active {
  background: var(--glass-hover-bg);
}

/* ---------- DANGER — красная ---------- */

.u-btn--danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  box-shadow: 0 4px 14px -2px rgba(220, 38, 38, 0.3);
}

.u-btn--danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px -4px rgba(220, 38, 38, 0.4);
  filter: brightness(1.05);
}

.u-btn--danger:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px -2px rgba(220, 38, 38, 0.25);
}

/* ---------- SUCCESS — зелёная ---------- */

.u-btn--success {
  background: linear-gradient(135deg, #00A651, #059669);
  color: #fff;
  box-shadow: 0 4px 14px -2px rgba(0, 166, 81, 0.3);
}

.u-btn--success:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px -4px rgba(0, 166, 81, 0.4);
  filter: brightness(1.05);
}

.u-btn--success:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px -2px rgba(0, 166, 81, 0.25);
}

/* ---------- Модификаторы ---------- */

.u-btn--block {
  width: 100%;
}

.u-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.u-btn__spinner {
  width: 1rem;
  height: 1rem;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
