import { STRINGS, type StringKey } from './strings';
import type { Lang } from '../domain/types';

export const translate = (lang: Lang, key: StringKey): string => STRINGS[key][lang === 'vi' ? 0 : 1];
export const locale = (lang: Lang) => (lang === 'vi' ? 'vi-VN' : 'en-US');
