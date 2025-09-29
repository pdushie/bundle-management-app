import { cn } from "@/lib/utils"

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function Avatar({
  name,
  image,
  className,
  size = "md",
}: {
  name: string
  image?: string
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-gray-100",
        sizeClasses[size],
        className
      )}
    >
      {image ? (
        <img
          className="aspect-square h-full w-full"
          src={image}
          alt={name}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-medium text-gray-600">
          {getInitials(name)}
        </div>
      )}
    </div>
  )
}
