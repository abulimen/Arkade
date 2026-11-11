import type { View } from '@/shared/types';
import type { Ack } from '@/client/channel';

export type Send = (type: string, payload?: unknown) => Promise<Ack>;
export interface PlayerProps { view: View; send: Send; notify: (msg: string) => void }
export interface ScreenProps { view: View }
export interface McProps { view: View; mc: Send }
