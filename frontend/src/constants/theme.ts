import type { MemberColorKey } from '../types/session';

export const MEMBER_COLORS: Record<MemberColorKey, { hex: string; label: string }> = {
  m1: { hex: '#F58020', label: 'Cam Galaxy (Trưởng nhóm)' },
  m2: { hex: '#7C3AED', label: 'Tím' },
  m3: { hex: '#0EA5E9', label: 'Xanh dương' },
  m4: { hex: '#10B981', label: 'Xanh lá' },
};

export const MEMBER_SLOT_COLORS: MemberColorKey[] = ['m1', 'm2', 'm3', 'm4'];

export function getMemberColor(index: number): { key: MemberColorKey; hex: string } {
  const key = MEMBER_SLOT_COLORS[index % MEMBER_SLOT_COLORS.length];
  return { key, hex: MEMBER_COLORS[key].hex };
}

export function getMemberColorByKey(key?: string): { key: MemberColorKey; hex: string } {
  if (key && key in MEMBER_COLORS) {
    const validKey = key as MemberColorKey;
    return { key: validKey, hex: MEMBER_COLORS[validKey].hex };
  }
  return { key: 'm1', hex: MEMBER_COLORS.m1.hex };
}
