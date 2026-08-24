import { cva, type VariantProps } from 'class-variance-authority';

export { default as Badge } from './Badge.vue';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#3d342b] text-white',
        secondary: 'border-paper-200 bg-paper-50 text-paper-600',
        outline: 'border-paper-300 text-paper-600',
        destructive: 'border-transparent bg-red-500 text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
