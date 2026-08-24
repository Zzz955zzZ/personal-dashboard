import { cva, type VariantProps } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8c7b6b]/40 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-[#3d342b] text-white shadow-[0_6px_16px_-8px_rgba(61,52,43,0.6)] hover:bg-[#2e2720] active:bg-[#231e19]',
        secondary:
          'border border-paper-300/80 bg-white text-ink hover:bg-paper-50 active:bg-paper-100',
        outline: 'border border-paper-300/80 bg-transparent text-ink hover:bg-paper-50',
        ghost: 'text-paper-600 hover:bg-paper-100 hover:text-ink',
        destructive: 'text-red-600 hover:bg-red-50 active:bg-red-100',
        link: 'text-[#3d342b] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-10 px-4',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
