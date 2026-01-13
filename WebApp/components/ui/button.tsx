import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900 text-white hover:bg-zinc-800 [box-shadow:inset_0px_-2px_0px_0px_#18181b,_0px_1px_6px_0px_rgba(24,_24,_27,_58%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#18181b,_0px_1px_3px_0px_rgba(24,_24,_27,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#18181b,_0px_1px_2px_0px_rgba(24,_24,_27,_30%)] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 [box-shadow:inset_0px_-2px_0px_0px_#dc2626,_0px_1px_6px_0px_rgba(239,_68,_68,_58%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#dc2626,_0px_1px_3px_0px_rgba(239,_68,_68,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#dc2626,_0px_1px_2px_0px_rgba(239,_68,_68,_30%)] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        outline:
          "border border-zinc-300 bg-transparent hover:bg-zinc-50 text-zinc-900 [box-shadow:inset_0px_-2px_0px_0px_#e4e4e7,_0px_1px_6px_0px_rgba(228,_228,_231,_58%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#e4e4e7,_0px_1px_3px_0px_rgba(228,_228,_231,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#e4e4e7,_0px_1px_2px_0px_rgba(228,_228,_231,_30%)] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        secondary:
          "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 [box-shadow:inset_0px_-2px_0px_0px_#d4d4d8,_0px_1px_6px_0px_rgba(161,_161,_170,_58%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#d4d4d8,_0px_1px_3px_0px_rgba(161,_161,_170,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#d4d4d8,_0px_1px_2px_0px_rgba(161,_161,_170,_30%)] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        orange:
          "bg-[#155DFC] text-white hover:bg-[#090376] [box-shadow:inset_0px_-2px_0px_0px_#090376,_0px_1px_6px_0px_rgba(23,_13,_242,_58%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#090376,_0px_1px_3px_0px_rgba(23,_13,_242,_40%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#090376,_0px_1px_2px_0px_rgba(23,_13,_242,_30%)] disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-[8px] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-[12px] px-6 has-[>svg]:px-4",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
