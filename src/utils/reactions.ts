import { ReactionType } from '../types';

export interface ReactionOption {
  type: ReactionType;
  label: string;
  icon: string;
  description: string;
}

export const REACTION_OPTIONS: ReactionOption[] = [
  {
    type: 'MADE_ME_THINK',
    label: 'This made me think',
    icon: 'head-lightbulb-outline',
    description: 'Thought-provoking content',
  },
  {
    type: 'I_RELATE',
    label: 'I relate to this',
    icon: 'hand-heart',
    description: 'Shared experience',
  },
  {
    type: 'THANK_YOU',
    label: 'Thank you for sharing',
    icon: 'hands-pray',
    description: 'Grateful for this memory',
  },
  {
    type: 'THIS_INSPIRED_ME',
    label: 'This inspired me',
    icon: 'lightbulb-on-outline',
    description: 'Motivating and inspiring',
  },
  {
    type: 'BEAUTIFUL_MOMENT',
    label: 'Beautiful moment',
    icon: 'star-circle-outline',
    description: 'A special memory',
  },
  {
    type: 'SAVING_THIS',
    label: 'Saving this',
    icon: 'bookmark-outline',
    description: 'Want to remember this',
  },
];

export function getReactionLabel(type: ReactionType): string {
  const option = REACTION_OPTIONS.find((opt) => opt.type === type);
  return option?.label || type;
}

export function getReactionIcon(type: ReactionType): string {
  const option = REACTION_OPTIONS.find((opt) => opt.type === type);
  return option?.icon || 'circle-outline';
}

export function getReactionDescription(type: ReactionType): string {
  const option = REACTION_OPTIONS.find((opt) => opt.type === type);
  return option?.description || '';
}
