import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/img/brand/logo.svg"
      alt="La Roma Pizza"
      width={159}
      height={91}
      priority={priority}
      className={cn("h-auto w-auto", className)}
    />
  );
}
